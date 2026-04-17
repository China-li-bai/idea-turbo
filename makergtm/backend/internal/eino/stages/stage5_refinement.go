package stages

import (
	"context"
	"fmt"
	"strings"

	"launchcircle-backend/internal/eino"
)

type RefinementStage struct{}

func NewRefinementStage() *RefinementStage {
	return &RefinementStage{}
}

func (s *RefinementStage) Run(ctx context.Context, state *eino.PipelineState) (*eino.Stage5Output, error) {
	stage2 := state.Stage2Result
	stage3 := state.Stage3Result
	stage4 := state.Stage4Result
	profile := stage2.StyleProfile

	instruction := buildRefinementInstruction(stage4.Quality)

	systemPrompt := fmt.Sprintf(`You are a copy editor specializing in %s content. Your job is to fix specific quality issues in draft copy while preserving the core message and style.

RULES:
1. Fix ONLY the issues listed below — don't rewrite the entire thing
2. Keep the same structure and sections
3. Maintain the conversational/technical tone
4. NEVER add any forbidden words
5. Make minimal changes to pass quality checks
6. Output in the SAME format as input: **Tagline:** ... **Body:** ... **CTA:** ...

FORBIDDEN WORDS: %s`, strings.ToUpper(profile.Platform), strings.Join(profile.ForbiddenWords, ", "))

	userPrompt := fmt.Sprintf(`CURRENT DRAFT:
%s

QUALITY ISSUES TO FIX:
%s

PRODUCT FACTS (must stay aligned):
%s

Fix these issues and output the improved version:`,
		stage3.DraftCopy.FullText,
		instruction,
		buildFactsTextForRefinement(state.Stage1Result.Facts),
	)

	result, err := eino.GlobalChatModel.Generate(ctx, systemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("Stage5-精炼失败: %w", err)
	}

	refinedCopy := parseGeneratedCopy(result, profile.Platform)

	output := &eino.Stage5Output{
		RefinedCopy: refinedCopy,
		Instruction: instruction,
	}
	state.Stage5Result = output
	return output, nil
}

func buildRefinementInstruction(quality *eino.QualityMetrics) *eino.RefinementInstruction {
	inst := &eino.RefinementInstruction{
		Issues:      []string{},
		Suggestions: []string{},
	}

	fb := quality.Feedback
	if strings.Contains(fb, "禁用词") {
		inst.Issues = append(inst.Issues, "Remove all forbidden words")
		inst.Suggestions = append(inst.Suggestions, "Replace each forbidden word with a plain alternative")
	}
	if strings.Contains(fb, "句式变化不足") || strings.Contains(fb, "句子长度太均匀") {
		inst.Issues = append(inst.Issues, "Vary sentence length more")
		inst.Suggestions = append(inst.Suggestions, "Mix 1-line punchy sentences with 2-3 line detailed ones")
	}
	if strings.Contains(fb, "模板化") || strings.Contains(fb, "个性化表达") {
		inst.Issues = append(inst.Issues, "Add more personality and unique phrasing")
		inst.Suggestions = append(inst.Suggestions, "Replace generic phrases with specific, memorable wording")
	}
	if strings.Contains(fb, "被动语态") {
		inst.Issues = append(inst.Issues, "Convert passive voice to active voice")
		inst.Suggestions = append(inst.Suggestions, "Change 'X was built by us' to 'We built X'")
	}
	if strings.Contains(fb, "事实覆盖不足") {
		inst.Issues = append(inst.Issues, "Add more product-specific facts")
		inst.Suggestions = append(inst.Suggestions, "Reference specific features and metrics from the product facts")
	}
	if strings.Contains(fb, "格式不符合") {
		inst.Issues = append(inst.Issues, "Fix format compliance")
		inst.Suggestions = append(inst.Suggestions, "Adjust tagline/body length to meet platform requirements")
	}

	return inst
}

func buildFactsTextForRefinement(facts []eino.Fact) string {
	var sb strings.Builder
	for _, f := range facts {
		sb.WriteString(fmt.Sprintf("- [%s] %s\n", f.Category, f.Claim))
	}
	return sb.String()
}
