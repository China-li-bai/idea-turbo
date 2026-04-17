package stages

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"launchcircle-backend/internal/eino/runtime"
	"launchcircle-backend/internal/eino/types"
)

type GenerationStage struct{}

var (
	reTagline = regexp.MustCompile(`(?i)\*\*Tagline:\*\*\s*(.+?)(?:\n|$)`)
	reBody    = regexp.MustCompile(`(?i)\*\*Body:\*\*\s*([\s\S]+?)(?:\*\*CTA:|$)`)
	reCTA     = regexp.MustCompile(`(?i)\*\*CTA:\*\*\s*(.+?)(?:\n|$)`)
)

func NewGenerationStage() *GenerationStage {
	return &GenerationStage{}
}

func (s *GenerationStage) Run(ctx context.Context, state *types.PipelineState) (*types.Stage3Output, error) {
	stage2 := state.Stage2Result
	profile := stage2.StyleProfile

	casesText := buildCasesPrompt(stage2.CompressedCases)

	userPrompt := fmt.Sprintf(`Generate marketing copy for this product on %s.

PRODUCT DESCRIPTION:
%s

SIMILAR SUCCESSFUL CASES (for reference only):
%s

REQUIREMENTS:
- Tagline max %d chars
- Body max %d words
- Required sections: %s
- Follow the style guide in the system prompt exactly
- Use specific numbers from the verified facts above

OUTPUT FORMAT:
**Tagline:** <your tagline>

**Body:**
<your body text>

**CTA:** <call to action>`,
		strings.ToUpper(profile.Platform),
		state.Input.ProductDescription,
		casesText,
		profile.Format.TaglineMaxLength,
		profile.Format.BodyMaxLength,
		strings.Join(profile.Format.RequiredSections, ", "),
	)

	result, err := runtime.GlobalChatModel.Generate(ctx, stage2.SystemPrompt, userPrompt)
	if err != nil {
		return nil, fmt.Errorf("Stage3-生成失败: %w", err)
	}

	copy := parseGeneratedCopy(result, profile.Platform)

	output := &types.Stage3Output{
		DraftCopy: copy,
	}
	state.Stage3Result = output
	return output, nil
}

func buildCasesPrompt(cases []types.CompressedCase) string {
	var sb strings.Builder
	for i, c := range cases {
		sb.WriteString(fmt.Sprintf("Case %d (relevance: %.2f):\n%s\n\n", i+1, c.Score, c.Content))
	}
	return sb.String()
}

func parseGeneratedCopy(raw string, platform string) *types.GeneratedCopy {
	copy := &types.GeneratedCopy{Platform: platform, FullText: raw}

	if matches := reTagline.FindStringSubmatch(raw); len(matches) > 1 {
		copy.Tagline = strings.TrimSpace(matches[1])
	}
	if matches := reBody.FindStringSubmatch(raw); len(matches) > 1 {
		copy.Body = strings.TrimSpace(matches[1])
	}
	if matches := reCTA.FindStringSubmatch(raw); len(matches) > 1 {
		copy.CTA = strings.TrimSpace(matches[1])
	}

	if copy.Tagline == "" && copy.Body == "" {
		lines := strings.Split(raw, "\n")
		for i, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "**") {
				continue
			}
			if copy.Tagline == "" && len(line) < 120 {
				copy.Tagline = line
			} else if copy.Body == "" {
				copy.Body = line
				for j := i + 1; j < len(lines); j++ {
					l := strings.TrimSpace(lines[j])
					if l != "" && !strings.HasPrefix(l, "**") {
						copy.Body += "\n" + l
					}
				}
				break
			}
		}
	}

	return copy
}
