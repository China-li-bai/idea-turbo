package stages

import (
	"context"
	"fmt"
	"strings"

	"launchcircle-backend/internal/eino/runtime"
	"launchcircle-backend/internal/eino/types"
)

type FactLockStage struct{}

func NewFactLockStage() *FactLockStage {
	return &FactLockStage{}
}

func (s *FactLockStage) Run(ctx context.Context, state *types.PipelineState) (*types.Stage1Output, error) {
	systemPrompt := `You are a product analyst. Extract verifiable facts from the product description provided by the user.

For each fact you extract:
1. It MUST be directly stated or clearly implied in the user's description
2. Do NOT infer features that aren't mentioned
3. Do NOT add marketing language
4. Mark confidence: 1.0 if explicitly stated, 0.6-0.8 if strongly implied

Output format (one per line):
[feature] <the actual feature description>
[benefit] <what the user gets>
[metric] <specific number with unit if any>
[positioning] <how they position vs alternatives>

If the user says "AI writing tool", do NOT add "supports multi-platform" unless they said it.
If the user says "fast", do NOT convert to "10x faster" — keep it as "fast".`

	userPrompt := fmt.Sprintf("Extract facts from this product description:\n\n%s", state.Input.ProductDescription)

	result, err := runtime.GlobalChatModel.GenerateStructured(ctx, systemPrompt, userPrompt, "facts")
	if err != nil {
		return nil, fmt.Errorf("Stage1-FactLock失败: %w", err)
	}

	facts := parseFacts(result)

	if len(facts) == 0 {
		facts = []types.Fact{
			{Claim: state.Input.ProductDescription, Category: "description", Confidence: 0.5, Source: "raw_input"},
		}
	}

	output := &types.Stage1Output{
		Facts:        facts,
		RawFactsText: result,
	}
	state.Stage1Result = output
	return output, nil
}

func parseFacts(raw string) []types.Fact {
	var facts []types.Fact
	lines := strings.Split(raw, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		category := "feature"
		claim := line

		prefixes := []struct {
			prefix string
			cat    string
		}{
			{"[feature]", "feature"},
			{"[benefit]", "benefit"},
			{"[metric]", "metric"},
			{"[positioning]", "positioning"},
		}

		for _, p := range prefixes {
			if strings.HasPrefix(line, p.prefix) {
				category = p.cat
				claim = strings.TrimSpace(strings.TrimPrefix(line, p.prefix))
				break
			}
		}

		if claim == "" {
			continue
		}
		if category == "feature" || category == "benefit" || category == "positioning" {
			lowerClaim := strings.ToLower(claim)
			if strings.Contains(lowerClaim, "%") || strings.Contains(lowerClaim, "x faster") ||
				strings.Contains(lowerClaim, "ms") || strings.Contains(lowerClaim, "seconds") ||
				strings.Contains(lowerClaim, "mb") || strings.Contains(lowerClaim, "kb") {
				category = "metric"
			}
		}

		facts = append(facts, types.Fact{
			Claim:      claim,
			Category:   category,
			Confidence: 0.85,
			Source:     "extracted",
		})
	}
	return facts
}
