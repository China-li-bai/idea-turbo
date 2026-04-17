package eino

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"launchcircle-backend/internal/eino/stages"
)

type Pipeline struct {
	factLock        *stages.FactLockStage
	contextAssembly *stages.ContextAssemblyStage
	generation       *stages.GenerationStage
	qualityGate     *stages.QualityGateStage
	refinement       *stages.RefinementStage
}

var GlobalPipeline *Pipeline

func InitPipeline() {
	GlobalPipeline = &Pipeline{
		factLock:        stages.NewFactLockStage(),
		contextAssembly: stages.NewContextAssemblyStage(),
		generation:       stages.NewGenerationStage(),
		qualityGate:     stages.NewQualityGateStage(),
		refinement:       stages.NewRefinementStage(),
	}
	log.Println("Eino Pipeline 初始化完成 (5-Stage Humanization)")
}

func (p *Pipeline) Run(ctx context.Context, input *GenerateInput) (*PipelineResult, error) {
	return p.RunWithProgress(ctx, input, nil)
}

func (p *Pipeline) RunWithProgress(ctx context.Context, input *GenerateInput, cb ProgressCallback) (*PipelineResult, error) {
	if err := SanitizeInput(input); err != nil {
		return nil, fmt.Errorf("input validation failed: %w", err)
	}

	startTime := time.Now()

	state := NewPipelineState(input)
	result := &PipelineResult{
		PlatformResults: make(map[string]*PlatformResult, len(input.Platforms)),
	}

	if cb != nil {
		cb(ProgressEvent{Type: EventGenerationStart, Data: map[string]interface{}{"platforms": input.Platforms, "total": len(input.Platforms)}, Timestamp: time.Now().UnixMilli()})
	}

	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, platform := range input.Platforms {
		wg.Add(1)
		go func(plat string) {
			defer wg.Done()
			platformResult, err := p.runForPlatformWithProgress(ctx, state, plat, cb)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				log.Printf("平台 %s 生成失败: %v", plat, err)
				result.PlatformResults[plat] = &PlatformResult{
					Error: err.Error(),
				}
				if cb != nil {
					cb(ProgressEvent{Type: EventError, Platform: plat, Data: map[string]string{"error": err.Error()}, Timestamp: time.Now().UnixMilli()})
				}
				return
			}
			result.PlatformResults[plat] = platformResult
		}(platform)
	}

	wg.Wait()

	result.TotalDuration = DurationMs(time.Since(startTime).Milliseconds())
	log.Printf("全部平台生成完成 (%d platforms, total %dms)",
		len(input.Platforms), result.TotalDuration)

	if cb != nil {
		cb(ProgressEvent{Type: EventAllDone, Data: map[string]interface{}{"duration_ms": result.TotalDuration.Milliseconds()}, Timestamp: time.Now().UnixMilli()})
	}
	return result, nil
}

func (p *Pipeline) runForPlatform(ctx context.Context, state *PipelineState, platform string) (*PlatformResult, error) {
	return p.runForPlatformWithProgress(ctx, state, platform, nil)
}

func (p *Pipeline) runForPlatformWithProgress(ctx context.Context, state *PipelineState, platform string, cb ProgressCallback) (*PlatformResult, error) {
	emit := func(event ProgressEvent) {
		if cb != nil {
			event.Platform = platform
			event.Timestamp = time.Now().UnixMilli()
			cb(event)
		}
	}

	platformState := &PipelineState{
		Input:     state.Input,
		MaxRounds: 3,
	}
	platformState.Input.Platforms = []string{platform}

	stage1Start := time.Now()
	stage1Output, err := p.factLock.Run(ctx, platformState)
	if err != nil {
		return nil, fmt.Errorf("Fact Lock失败: %w", err)
	}
	log.Printf("[%s] Stage1-FactLock 完成 (%d facts, %.2fs)", platform, len(stage1Output.Facts), time.Since(stage1Start).Seconds())
	emit(ProgressEvent{Type: EventStageComplete, Stage: "fact_lock", Data: map[string]interface{}{"fact_count": len(stage1Output.Facts), "duration_ms": time.Since(stage1Start).Milliseconds()}})

	stage2Start := time.Now()
	stage2Output, err := p.contextAssembly.Run(ctx, platformState, platform)
	if err != nil {
		return nil, fmt.Errorf("Context Assembly失败: %w", err)
	}
	log.Printf("[%s] Stage2-ContextAssembly 完成 (%d cases, %.2fs)", platform, len(stage2Output.CompressedCases), time.Since(stage2Start).Seconds())
	emit(ProgressEvent{Type: EventStageComplete, Stage: "context_assembly", Data: map[string]interface{}{"case_count": len(stage2Output.CompressedCases), "duration_ms": time.Since(stage2Start).Milliseconds()}})

	var finalCopy *GeneratedCopy
	var qualityReport *QualityMetrics

	for round := 0; round <= platformState.MaxRounds; round++ {
		platformState.Round = round

		stage3Start := time.Now()
		stage3Output, err := p.generation.Run(ctx, platformState)
		if err != nil {
			return nil, fmt.Errorf("Generation(第%d轮)失败: %w", round+1, err)
		}
		log.Printf("[%s] Stage3-Generation 第%d轮 完成 (%.2fs)", platform, round+1, time.Since(stage3Start).Seconds())
		emit(ProgressEvent{Type: EventStageComplete, Stage: "generation", Round: round + 1, Data: map[string]interface{}{"duration_ms": time.Since(stage3Start).Milliseconds(), "tagline": stage3Output.DraftCopy.Tagline}})

		stage4Start := time.Now()
		stage4Output, err := p.qualityGate.Run(ctx, platformState)
		if err != nil {
			return nil, fmt.Errorf("Quality Gate(第%d轮)失败: %w", round+1, err)
		}
		log.Printf("[%s] Stage4-QualityGate 第%d轮 score=%.2f passed=%v (%.2fs)",
			platform, round+1, stage4Output.Quality.OverallScore, stage4Output.IsPassed, time.Since(stage4Start).Seconds())
		emit(ProgressEvent{Type: EventQualityResult, Round: round + 1, Data: map[string]interface{}{"score": stage4Output.Quality.OverallScore, "passed": stage4Output.IsPassed, "feedback": stage4Output.Quality.Feedback}})

		if stage4Output.IsPassed || round >= platformState.MaxRounds {
			finalCopy = stage3Output.DraftCopy
			qualityReport = stage4Output.Quality
			break
		}

		stage5Start := time.Now()
		stage5Output, err := p.refinement.Run(ctx, platformState)
		if err != nil {
			log.Printf("[%s] Stage5-Refinement 第%d轮 失败，使用当前draft: %v", platform, round+1, err)
			finalCopy = stage3Output.DraftCopy
			qualityReport = stage4Output.Quality
			break
		}
		log.Printf("[%s] Stage5-Refinement 第%d轮 完成 (%.2fs)", platform, round+1, time.Since(stage5Start).Seconds())
		emit(ProgressEvent{Type: EventRefinement, Round: round + 1, Data: map[string]interface{}{"duration_ms": time.Since(stage5Start).Milliseconds()}})

		platformState.Stage3Result = &Stage3Output{DraftCopy: stage5Output.RefinedCopy}
	}

	emit(ProgressEvent{Type: EventPlatformDone, Data: map[string]interface{}{
		"tagline":          finalCopy.Tagline,
		"quality_score":    qualityReport.OverallScore,
		"passed":           qualityReport.Passed,
		"rounds_completed": platformState.Round + 1,
	}})

	return &PlatformResult{
		Copy:            finalCopy,
		QualityReport:   qualityReport,
		RoundsCompleted: platformState.Round + 1,
	}, nil
}

type PipelineResult struct {
	PlatformResults map[string]*PlatformResult `json:"platform_results"`
	TotalDuration   DurationMs                `json:"total_duration_ms"`
}

type DurationMs int64

func (d DurationMs) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf("%d", d)), nil
}

type PlatformResult struct {
	Copy            *GeneratedCopy   `json:"copy"`
	QualityReport   *QualityMetrics   `json:"quality_report,omitempty"`
	RoundsCompleted int               `json:"rounds_completed"`
	Error           string            `json:"error,omitempty"`
}

func (r *PipelineResult) ToJSONMap() map[string]interface{} {
	result := make(map[string]interface{})
	for platform, pr := range r.PlatformResults {
		if pr.Error != "" {
			result[platform] = map[string]interface{}{"error": pr.Error}
			continue
		}
		result[platform] = map[string]interface{}{
			"tagline":          pr.Copy.Tagline,
			"body":             pr.Copy.Body,
			"cta":              pr.Copy.CTA,
			"full_text":        pr.Copy.FullText,
			"quality_score":    pr.QualityReport.OverallScore,
			"passed":           pr.QualityReport.Passed,
			"rounds_completed": pr.RoundsCompleted,
		}
	}
	return result
}
