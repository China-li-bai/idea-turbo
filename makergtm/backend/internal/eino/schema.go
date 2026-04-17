package eino

import (
	"fmt"
	"strings"
)

type GenerateInput struct {
	ProductDescription string   `json:"product_description"`
	Platforms          []string `json:"platforms"`
}

const (
	MaxProductDescLength = 3000
)

var injectionPatterns = []struct {
	pattern string
	name    string
}{
	{"ignore all previous instructions", "ignore_instructions"},
	{"disregard above", "disregard_above"},
	{"you are now", "role_jacking"},
	{"system:", "system_directive"},
	{"OUTPUT FORMAT:", "format_override"},
	{"forget everything", "forget_all"},
}

func SanitizeInput(input *GenerateInput) error {
	if input == nil {
		return fmt.Errorf("input is nil")
	}
	if len(input.ProductDescription) > MaxProductDescLength {
		return fmt.Errorf("product_description exceeds %d chars (got %d)", MaxProductDescLength, len(input.ProductDescription))
	}
	lower := strings.ToLower(input.ProductDescription)
	for _, p := range injectionPatterns {
		if strings.Contains(lower, p.pattern) {
			return fmt.Errorf("potential prompt injection detected: %s", p.name)
		}
	}
	input.ProductDescription = strings.TrimSpace(input.ProductDescription)
	return nil
}

type Fact struct {
	Claim      string `json:"claim"`
	Category   string `json:"category"`
	Confidence float64 `json:"confidence"`
	Source     string `json:"source"`
}

type Stage1Output struct {
	Facts       []Fact `json:"facts"`
	RawFactsText string `json:"raw_facts_text"`
}

type CompressedCase struct {
	Content   string                 `json:"content"`
	Metadata  map[string]interface{} `json:"metadata"`
	Score     float32                `json:"score"`
}

type Stage2Output struct {
	SystemPrompt    string           `json:"system_prompt"`
	FewShotExamples string           `json:"few_shot_examples"`
	CompressedCases []CompressedCase `json:"compressed_cases"`
	StyleProfile    *StyleProfile    `json:"style_profile"`
}

type GeneratedCopy struct {
	Tagline    string `json:"tagline"`
	Body       string `json:"body"`
	CTA        string `json:"cta"`
	FullText   string `json:"full_text"`
	Platform   string `json:"platform"`
}

type Stage3Output struct {
	DraftCopy *GeneratedCopy `json:"draft_copy"`
}

type QualityMetrics struct {
	Burstiness        float64 `json:"burstiness"`
	PerplexityProxy   float64 `json:"perplexity_proxy"`
	ForbiddenCount    int     `json:"forbidden_count"`
	PassiveVoiceRatio float64 `json:"passive_voice_ratio"`
	FactAlignment     float64 `json:"fact_alignment"`
	PlatformFit       float64 `json:"platform_fit"`
	OverallScore      float64 `json:"overall_score"`
	Passed            bool    `json:"passed"`
	Feedback          string  `json:"feedback"`
}

type Stage4Output struct {
	Quality  *QualityMetrics `json:"quality"`
	IsPassed bool             `json:"is_passed"`
}

type RefinementInstruction struct {
	TargetParagraphs []string `json:"target_paragraphs"`
	Issues           []string `json:"issues"`
	Suggestions      []string `json:"suggestions"`
}

type Stage5Output struct {
	RefinedCopy *GeneratedCopy      `json:"refined_copy"`
	Instruction *RefinementInstruction `json:"instruction"`
	Quality     *QualityMetrics     `json:"quality"`
}

type PipelineState struct {
	Input         *GenerateInput   `json:"input"`
	Stage1Result  *Stage1Output    `json:"stage1_result"`
	Stage2Result  *Stage2Output    `json:"stage2_result"`
	Stage3Result  *Stage3Output    `json:"stage3_result"`
	Stage4Result  *Stage4Output    `json:"stage4_result"`
	Stage5Result  *Stage5Output    `json:"stage5_result"`
	Round         int               `json:"round"`
	MaxRounds     int               `json:"max_rounds"`
	FinalCopy     *GeneratedCopy    `json:"final_copy"`
}

func NewPipelineState(input *GenerateInput) *PipelineState {
	return &PipelineState{
		Input:     input,
		MaxRounds: 3,
	}
}

type ProgressEvent struct {
	Type      string      `json:"type"`
	Platform  string      `json:"platform,omitempty"`
	Stage     string      `json:"stage,omitempty"`
	Round     int         `json:"round,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp int64       `json:"timestamp"`
}

type ProgressCallback func(event ProgressEvent)

const (
	EventGenerationStart = "generation_start"
	EventStageComplete   = "stage_complete"
	EventQualityResult   = "quality_result"
	EventRefinement      = "refinement"
	EventPlatformDone    = "platform_done"
	EventAllDone         = "all_done"
	EventError           = "error"
)
