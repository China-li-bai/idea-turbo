package stages

import (
	"context"
	"fmt"

	"launchcircle-backend/internal/eino/runtime"
	"launchcircle-backend/internal/eino/types"
)

type RefinementStage struct{}

func NewRefinementStage() *RefinementStage {
	return &RefinementStage{}
}

func (s *RefinementStage) Run(ctx context.Context, state *types.PipelineState) (*types.Stage5Output, error) {
	stage4 := state.Stage4Result
	stage3 := state.Stage3Result
	stage2 := state.Stage2Result

	if stage4.Passed {
		output := &types.Stage5Output{
			FinalCopy:     stage3.DraftCopy,
			Refined:       false,
			Iterations:    0,
			FinalScore:    calculateOverallScore(stage4.QualityChecks),
		}
		state.Stage5Result = output
		return output, nil
	}

	refinedCopy := stage3.DraftCopy
	iterations := 0
	maxIterations := 2

	for iterations < maxIterations && !allChecksPass(stage4.QualityChecks) {
		iterations++

		fixPrompt := buildFixPrompt(refinedCopy, stage4.QualityChecks, stage2.SystemPrompt)

		result, err := runtime.GlobalChatModel.Generate(ctx, stage2.SystemPrompt, fixPrompt)
		if err != nil {
			return nil, fmt.Errorf("Stage5-优化失败(第%d轮): %w", iterations, err)
		}

		refinedCopy = parseRefinedCopy(result, refinedCopy.Platform)
		stage4.QualityChecks = runAllChecks(refinedCopy, stage2.StyleProfile)
	}

	output := &types.Stage5Output{
		FinalCopy:  refinedCopy,
		Refined:    iterations > 0,
		Iterations: iterations,
		FinalScore: calculateOverallScore(stage4.QualityChecks),
	}
	state.Stage5Result = output
	return output, nil
}

func allChecksPass(checks []types.QualityCheck) bool {
	for _, c := range checks {
		if !c.Passed {
			return false
		}
	}
	return true
}

func buildFixPrompt(currentCopy *types.GeneratedCopy, checks []types.QualityCheck, systemPrompt string) string {
	failedChecks := ""
	for _, c := range checks {
		if !c.Passed {
			failedChecks += fmt.Sprintf("- %s: %s\n", c.Name, c.Detail)
		}
	}

	return fmt.Sprintf(`The following quality checks FAILED on your previous output:

%s

Please REVISE the marketing copy to pass ALL these checks while maintaining the style and quality.

Current version:
**Tagline:** %s

**Body:**
%s

**CTA:** %s

Output ONLY the revised copy in the same format. Do not explain your changes.`,
		failedChecks,
		currentCopy.Tagline,
		currentCopy.Body,
		currentCopy.CTA,
	)
}

func parseRefinedCopy(raw string, platform string) *types.GeneratedCopy {
	reTagline := `(?i)\*\*Tagline:\*\*\s*(.+?)(?:\n|$)`
	reBody := `(?i)\*\*Body:\*\*\s*([\s\S]+?)(?=\*\*CTA:|\Z)`
	reCTA := `(?i)\*\*CTA:\*\*\s*(.+?)(?:\n|$)`

	copy := &types.GeneratedCopy{Platform: platform, FullText: raw}
	if matches := regexpFind(reTagline, raw); len(matches) > 1 {
		copy.Tagline = matches[1]
	}
	if matches := regexpFind(reBody, raw); len(matches) > 1 {
		copy.Body = matches[1]
	}
	if matches := regexpFind(reCTA, raw); len(matches) > 1 {
		copy.CTA = matches[1]
	}
	return copy
}

func regexpFind(pattern, text string) []string {
	re := pattern
	idx := 0
	for i := 0; i < len(re); i++ {
		if re[i] == '(' && i > 0 && re[i-1] != '\\' {
			idx = i
			break
		}
	}
	if idx > 0 {
		re = re[:idx]
	}
	start := findSubstring(text, re)
	if start < 0 {
		return nil
	}
	contentStart := start + len(re)
	for contentStart < len(text) && text[contentStart] == ' ' {
		contentStart++
	}
	end := contentStart
	for end < len(text) && text[end] != '\n' {
		end++
	}
	return []string{text[contentStart:end]}
}

func findSubstring(s, sub string) int {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

func calculateOverallScore(checks []types.QualityCheck) float64 {
	if len(checks) == 0 {
		return 0
	}
	var total float64
	for _, c := range checks {
		total += c.Score
	}
	return total / float64(len(checks))
}
