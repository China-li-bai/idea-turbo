package stages

import (
	"context"
	"fmt"
	"strings"

	"launchcircle-backend/internal/eino"
	"launchcircle-backend/internal/chroma"
)

type ContextAssemblyStage struct{}

func NewContextAssemblyStage() *ContextAssemblyStage {
	return &ContextAssemblyStage{}
}

func (s *ContextAssemblyStage) Run(ctx context.Context, state *eino.PipelineState, platform string) (*eino.Stage2Output, error) {
	profile, ok := eino.GetStyleProfile(platform)
	if !ok {
		return nil, fmt.Errorf("不支持的平台: %s", platform)
	}

	results, err := chroma.SearchSimilarCases(ctx, state.Input.ProductDescription, 5)
	if err != nil {
		return nil, fmt.Errorf("Stage2-案例检索失败: %w", err)
	}

	compressedCases := compressCases(results)

	fewShotText := buildFewShotText(profile.Examples)

	factsText := buildFactsText(state.Stage1Result.Facts)

	systemPrompt := buildSystemPrompt(profile, factsText)

	output := &eino.Stage2Output{
		SystemPrompt:    systemPrompt,
		FewShotExamples: fewShotText,
		CompressedCases: compressedCases,
		StyleProfile:    profile,
	}
	state.Stage2Result = output
	return output, nil
}

func compressCases(results []chroma.QueryResult) []eino.CompressedCase {
	var cases []eino.CompressedCase
	for _, r := range results {
		compressed := cleanContent(r.Document)
		cases = append(cases, eino.CompressedCase{
			Content:  compressed,
			Metadata: r.Metadata,
			Score:     r.Distance,
		})
	}
	return cases
}

func cleanContent(content string) string {
	removePatterns := []string{
		"Subscribe to our newsletter",
		"Follow us on Twitter/X",
		"Privacy Policy | Terms of Service",
		"All rights reserved",
		"Cookie Settings",
		"Navigation menu",
		"Skip to content",
	}
	for _, pattern := range removePatterns {
		content = strings.ReplaceAll(content, pattern, "")
	}
	lines := strings.Split(content, "\n")
	var cleanLines []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if len(line) > 10 && !strings.HasPrefix(line, "<") && !strings.HasPrefix(line, "[") {
			cleanLines = append(cleanLines, line)
		}
	}
	result := strings.Join(cleanLines, "\n")
	if len(result) > 1000 {
		result = result[:1000] + "..."
	}
	return result
}

func buildFactsText(facts []eino.Fact) string {
	var sb strings.Builder
	sb.WriteString("\n=== VERIFIED PRODUCT FACTS (do not deviate from these) ===\n")
	for i, f := range facts {
		sb.WriteString(fmt.Sprintf("%d. [%s] %s (confidence: %.1f)\n", i+1, f.Category, f.Claim, f.Confidence))
	}
	sb.WriteString("=== END FACTS ===\n")
	return sb.String()
}

func buildFewShotText(examples []eino.FewShotExample) string {
	var sb strings.Builder
	sb.WriteString("\n=== REFERENCE EXAMPLES (study the style, not copy content) ===\n")
	for i, ex := range examples {
		sb.WriteString(fmt.Sprintf("\n--- Example %d (%d upvotes) ---\n", i+1, ex.Upvotes))
		sb.WriteString(fmt.Sprintf("Style note: %s\n", ex.Explanation))
		sb.WriteString(fmt.Sprintf("%s\n", ex.OutputCopy))
	}
	sb.WriteString("=== END EXAMPLES ===\n")
	return sb.String()
}

func buildSystemPrompt(profile *eino.StyleProfile, factsText string) string {
	var sb strings.Builder
	sb.WriteString(profile.SystemPrompt)
	sb.WriteString(factsText)
	sb.WriteString("\n=== FORBIDDEN WORDS (using any of these is an automatic fail) ===\n")
	sb.WriteString(strings.Join(profile.ForbiddenWords, ", "))
	sb.WriteString("\n=== END FORBIDDEN ===\n")
	return sb.String()
}
