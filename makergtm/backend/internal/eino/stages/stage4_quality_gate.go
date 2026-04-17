package stages

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"launchcircle-backend/internal/eino/types"
)

type QualityGateStage struct{}

func NewQualityGateStage() *QualityGateStage {
	return &QualityGateStage{}
}

func (s *QualityGateStage) Run(ctx context.Context, state *types.PipelineState) (*types.Stage4Output, error) {
	stage3 := state.Stage3Result
	stage2 := state.Stage2Result
	profile := stage2.StyleProfile

	copy := stage3.DraftCopy

	checks := runAllChecks(copy, profile)

	passed := true
	for _, c := range checks {
		if !c.Passed {
			passed = false
			break
		}
	}

	output := &types.Stage4Output{
		Passed:      passed,
		QualityChecks: checks,
		RawDraft:    copy,
	}
	state.Stage4Result = output
	return output, nil
}

func runAllChecks(copy *types.GeneratedCopy, profile *types.StyleProfile) []types.QualityCheck {
	var checks []types.QualityCheck

	checks = append(checks, checkForbiddenWords(copy, profile))
	checks = append(checks, checkLengths(copy, profile))
	checks = append(checks, checkRequiredSections(copy, profile))
	checks = append(checks, checkBurstiness(copy))
	checks = append(checks, checkHypeLevel(copy))

	return checks
}

func checkForbiddenWords(copy *types.GeneratedCopy, profile *types.StyleProfile) types.QualityCheck {
	found := []string{}
	lowerText := strings.ToLower(copy.FullText)
	for _, word := range profile.ForbiddenWords {
		if strings.Contains(lowerText, strings.ToLower(word)) {
			found = append(found, word)
		}
	}
	return types.QualityCheck{
		Name:   "Forbidden Words",
		Passed: len(found) == 0,
		Detail: fmt.Sprintf("Found %d forbidden words: %v", len(found), found),
		Score:  float64(len(profile.ForbiddenWords)-len(found)) / float64(len(profile.ForbiddenWords)),
	}
}

func checkLengths(copy *types.GeneratedCopy, profile *types.StyleProfile) types.QualityCheck {
	taglineOK := len(copy.Tagline) <= profile.Format.TaglineMaxLength
	bodyWordCount := len(strings.Fields(copy.Body))
	bodyOK := bodyWordCount <= profile.Format.BodyMaxLength
	ctaOK := len(copy.CTA) <= profile.Format.CTAMaxLength

	allPassed := taglineOK && bodyOK && ctaOK
	detail := fmt.Sprintf("Tagline: %d/%d, Body: %d words/%d, CTA: %d/%d",
		len(copy.Tagline), profile.Format.TaglineMaxLength,
		bodyWordCount, profile.Format.BodyMaxLength,
		len(copy.CTA), profile.Format.CTAMaxLength)
	if !allPassed {
		detail += " [EXCEEDED]"
	}
	return types.QualityCheck{
		Name:   "Length Limits",
		Passed: allPassed,
		Detail: detail,
		Score:  func() float64 {
			s := 1.0
			if !taglineOK {
				s -= 0.3
			}
			if !bodyOK {
				s -= 0.5
			}
			if !ctaOK {
				s -= 0.2
			}
			return s
		}(),
	}
}

func checkRequiredSections(copy *types.GeneratedCopy, profile *types.StyleProfile) types.QualityCheck {
	lowerBody := strings.ToLower(copy.Body)
	missing := []string{}
	for _, section := range profile.Format.RequiredSections {
		switch section {
		case "tagline":
			if copy.Tagline == "" {
				missing = append(missing, "tagline")
			}
		case "body", "solution", "problem", "differentiator":
			continue
		case "cta":
			if copy.CTA == "" {
				missing = append(missing, "cta")
			}
		default:
			if !strings.Contains(lowerBody, section) {
				missing = append(missing, section)
			}
		}
	}
	return types.QualityCheck{
		Name:   "Required Sections",
		Passed: len(missing) == 0,
		Detail: fmt.Sprintf("Missing sections: %v", missing),
		Score:  float64(len(profile.Format.RequiredSections)-len(missing)) / float64(len(profile.Format.RequiredSections)),
	}
}

func checkBurstiness(copy *types.GeneratedCopy) types.QualityCheck {
	sentences := splitSentences(copy.Body)
	lengths := make([]int, 0, len(sentences))
	for _, s := range sentences {
		trimmed := strings.TrimSpace(s)
		if trimmed != "" {
			lengths = append(lengths, len(strings.Fields(trimmed)))
		}
	}
	if len(lengths) < 3 {
		return types.QualityCheck{Name: "Burstiness", Passed: true, Detail: "Too short to measure", Score: 0.8}
	}
	var sum, sumSq float64
	for _, l := range lengths {
		fl := float64(l)
		sum += fl
		sumSq += fl * fl
	}
	mean := sum / float64(len(lengths))
	variance := sumSq/float64(len(lengths)) - mean*mean
	sd := 0.0
	if variance > 0 {
		sd = sqrt(variance)
	}
	burstiness := sd / mean

	score := burstiness
	if score > 1.5 {
		score = 1.5
	}
	return types.QualityCheck{
		Name:   "Burstiness",
		Passed: burstiness >= 0.7,
		Detail: fmt.Sprintf("Sentence length variation: %.2f (target >= 0.7)", burstiness),
		Score:  score / 1.5,
	}
}

func checkHypeLevel(copy *types.GeneratedCopy) types.QualityCheck {
	hypePatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)\brevolutionary\b`),
		regexp.MustCompile(`(?i)\bgame.?changer\b`),
		regexp.MustCompile(`(?i)\bparadigm.?shift\b`),
		regexp.MustCompile(`(?i)\bcutting.?edge\b`),
		regexp.MustCompile(`(?i)\bgroundbreaking\b`),
		regexp.MustCompile(`(?i)\bunleash\b`),
		regexp.MustCompile(`(?i)\bempower\b`),
		regexp.MustCompile(`(?i)\bsynergy\b`),
		regexp.MustCompile(`(?i)\bdelve\b`),
		regexp.MustCompile(`(?i)\bfurthermore\b`),
		regexp.MustCompile(`(?i)\bmoreover\b`),
		regexp.MustCompile(`(?i)\bit is worth noting\b`),
		regexp.MustCompile(`(?i)\btapestry\b`),
		regexp.MustCompile(`(?i)\bpivotal\b`),
		regexp.MustCompile(`(?i)\bai.?powered\b`),
		regexp.MustCompile(`(?i)\bnext.?generation\b`),
		regexp.MustCompile(`(?i)\bworld.?class\b`),
		regexp.MustCompile(`(?i)\bdisruptive\b`),
		regexp.MustCompile(`(?i)\binnovative\b`),
	}
	hypeCount := 0
	for _, re := range hypePatterns {
		if re.MatchString(copy.FullText) {
			hypeCount++
		}
	}
	totalWords := len(strings.Fields(copy.FullText))
	hypeRatio := 0.0
	if totalWords > 0 {
		hypeRatio = float64(hypeCount) / float64(totalWords) * 100
	}
	passed := hypeCount == 0
	return types.QualityCheck{
		Name:   "Hype Level",
		Passed: passed,
		Detail: fmt.Sprintf("%d hype phrases found (%.1f%% of text)", hypeCount, hypeRatio),
		Score:  func() float64 {
			if hypeCount == 0 {
				return 1.0
			}
			s := 1.0 - float64(hypeCount)*0.15
			if s < 0 {
				s = 0
			}
			return s
		}(),
	}
}

func splitSentences(text string) []string {
	re := regexp.MustCompile(`[.!?。！？]+`)
	parts := re.Split(text, -1)
	var sentences []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			sentences = append(sentences, p)
		}
	}
	return sentences
}

func sqrt(x float64) float64 {
	z := x
	for i := 0; i < 10; i++ {
		z = (z + x/z) / 2
	}
	return z
}
