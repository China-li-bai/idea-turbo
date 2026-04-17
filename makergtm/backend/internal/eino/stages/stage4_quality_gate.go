package stages

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strings"

	"launchcircle-backend/internal/eino"
)

type QualityGateStage struct{}

var (
	reSentenceSplit    = regexp.MustCompile(`[.!?。！？]+`)
	rePassiveVoice     = regexp.MustCompile(`(?i)(?:is|are|was|were|be|been|has been|have been|had been)\s+\w+ed\b`)
)

func NewQualityGateStage() *QualityGateStage {
	return &QualityGateStage{}
}

func (s *QualityGateStage) Run(ctx context.Context, state *eino.PipelineState) (*eino.Stage4Output, error) {
	stage2 := state.Stage2Result
	stage3 := state.Stage3Result
	profile := stage2.StyleProfile

	metrics := &eino.QualityMetrics{}

	metrics.Burstiness = calculateBurstiness(stage3.DraftCopy.FullText)
	metrics.PerplexityProxy = estimatePerplexity(stage3.DraftCopy.FullText)
	metrics.ForbiddenCount = countForbiddenWords(stage3.DraftCopy.FullText, profile.ForbiddenWords)
	metrics.PassiveVoiceRatio = calculatePassiveVoiceRatio(stage3.DraftCopy.Body)
	metrics.FactAlignment = checkFactAlignment(stage3.DraftCopy.FullText, state.Stage1Result.Facts)
	metrics.PlatformFit = checkPlatformFormatCompliance(stage3.DraftCopy, profile)

	burstinessScore := scoreInRange(metrics.Burstiness, profile.Targets.BurstinessMin, profile.Targets.BurstinessMax)
	perplexityScore := scoreInRange(metrics.PerplexityProxy, profile.Targets.PerplexityMin, profile.Targets.PerplexityMax)
	forbiddenScore := float64(1.0 - math.Min(float64(metrics.ForbiddenCount)*0.15, 1.0))
	passiveScore := 1.0 - metrics.PassiveVoiceRatio
	factScore := metrics.FactAlignment
	formatScore := metrics.PlatformFit

	metrics.OverallScore = (burstinessScore*0.20 + perplexityScore*0.15 +
		forbiddenScore*0.25 + passiveScore*0.10 + factScore*0.15 + formatScore*0.15)

	metrics.Passed = metrics.OverallScore >= 0.65 && metrics.ForbiddenCount == 0
	if !metrics.Passed && metrics.ForbiddenCount == 0 && metrics.OverallScore >= 0.55 {
		if state.Round >= state.MaxRounds {
			metrics.Passed = true
		}
	}

	metrics.Feedback = generateFeedback(metrics, profile)

	output := &eino.Stage4Output{
		Quality:  metrics,
		IsPassed: metrics.Passed,
	}
	state.Stage4Result = output
	return output, nil
}

func calculateBurstiness(text string) float64 {
	sentences := reSentenceSplit.Split(text, -1)
	if len(sentences) < 3 {
		return 1.0
	}
	var lengths []float64
	for _, s := range sentences {
		s = strings.TrimSpace(s)
		if len(s) > 0 {
			lengths = append(lengths, float64(len(strings.Fields(s))))
		}
	}
	if len(lengths) < 3 {
		return 1.0
	}
	var mean, variance float64
	for _, l := range lengths {
		mean += l
	}
	mean /= float64(len(lengths))
	for _, l := range lengths {
		variance += (l - mean) * (l - mean)
	}
	variance /= float64(len(lengths))
	if mean == 0 {
		return 1.0
	}
	stdDev := math.Sqrt(variance)
	return stdDev / mean
}

func estimatePerplexity(text string) float64 {
	commonWords := map[string]bool{
		"the": true, "is": true, "at": true, "which": true, "on": true,
		"a": true, "an": true, "and": true, "or": true, "but": true,
		"in": true, "to": true, "of": true, "for": true, "with": true,
		"it": true, "that": true, "this": true, "be": true, "are": true,
		"was": true, "were": true, "has": true, "have": true, "had": true,
	}
	rarePatterns := []string{
		"furthermore", "moreover", "it is worth noting",
		"in conclusion", "delve", "tapestry", "pivotal",
		"utilize", "leverage", "facilitate", "paradigm",
	}

	words := strings.Fields(text)
	if len(words) == 0 {
		return 0.5
	}
	commonCount := 0
	for _, w := range words {
		w = strings.ToLower(strings.Trim(w, ".,;:!?'\"'()[]{}"))
		if commonWords[w] {
			commonCount++
		}
	}
	rareCount := 0
	lowerText := strings.ToLower(text)
	for _, p := range rarePatterns {
		if strings.Contains(lowerText, p) {
			rareCount++
		}
	}

	basePerplexity := 1.0 - float64(commonCount)/float64(len(words))
	rarePenalty := float64(rareCount) * 0.08
	result := basePerplexity + rarePenalty
	return math.Max(0.1, math.Min(result, 1.5))
}

func countForbiddenWords(text string, forbidden []string) int {
	count := 0
	lowerText := strings.ToLower(text)
	for _, word := range forbidden {
		if strings.Contains(lowerText, strings.ToLower(word)) {
			count++
		}
	}
	return count
}

func calculatePassiveVoiceRatio(body string) float64 {
	totalSentences := len(reSentenceSplit.Split(body, -1))
	if totalSentences == 0 {
		return 0
	}
	passiveCount := len(rePassiveVoice.FindAllString(body, -1))
	return math.Min(float64(passiveCount)/float64(totalSentences), 1.0)
}

func checkFactAlignment(text string, facts []eino.Fact) float64 {
	if len(facts) == 0 {
		return 0.8
	}
	lowerText := strings.ToLower(text)
	matched := 0
	for _, f := range facts {
		keywords := extractKeywords(f.Claim)
		for _, kw := range keywords {
			if strings.Contains(lowerText, strings.ToLower(kw)) {
				matched++
				break
			}
		}
	}
	return float64(matched) / float64(len(facts))
}

func extractKeywords(claim string) []string {
	stopWords := map[string]bool{"the": true, "a": true, "an": true, "is": true, "are": true, "was": true, "were": true, "to": true, "of": true, "for": true, "in": true, "on": true, "with": true, "and": true, "or": true, "but": true, "it": true, "that": true, "this": true}
	words := strings.Fields(claim)
	var keywords []string
	for _, w := range words {
		w = strings.ToLower(strings.Trim(w, ".,;:!?'\"'()[]{}"))
		if !stopWords[w] && len(w) > 2 {
			keywords = append(keywords, w)
		}
	}
	return keywords
}

func checkPlatformFormatCompliance(copy *eino.GeneratedCopy, profile *eino.StyleProfile) float64 {
	score := 1.0
	if len(copy.Tagline) > profile.Format.TaglineMaxLength {
		score -= 0.2
	}
	if copy.Tagline == "" {
		score -= 0.3
	}
	wordCount := len(strings.Fields(copy.Body))
	if wordCount > profile.Format.BodyMaxLength {
		score -= 0.2
	}
	if copy.Body == "" {
		score -= 0.3
	}
	for _, section := range profile.Format.RequiredSections {
		switch section {
		case "tagline":
			if copy.Tagline == "" { score -= 0.1 }
		case "cta":
			if copy.CTA == "" { score -= 0.1 }
		}
	}
	return math.Max(0, score)
}

func scoreInRange(value, min, max float64) float64 {
	if value >= min && value <= max {
		return 1.0
	}
	if value < min {
		diff := min - value
		return math.Max(0, 1.0-diff*2.0)
	}
	diff := value - max
	return math.Max(0, 1.0-diff*1.5)
}

func generateFeedback(m *eino.QualityMetrics, profile *eino.StyleProfile) string {
	var issues []string
	if m.ForbiddenCount > 0 {
		issues = append(issues, fmt.Sprintf("检测到%d个禁用词，必须全部移除", m.ForbiddenCount))
	}
	if m.Burstiness < profile.Targets.BurstinessMin {
		issues = append(issues, "句式变化不足：句子长度太均匀，需要混合长短句")
	}
	if m.Burstiness > profile.Targets.BurstinessMax {
		issues = append(issues, "句式变化过度：需要更稳定的节奏")
	}
	if m.PerplexityProxy < profile.Targets.PerplexityMin {
		issues = append(issues, "文本过于常见/模板化：需要更多个性化表达")
	}
	if m.PerplexityProxy > profile.Targets.PerplexityMax {
		issues = append(issues, "用词过于生僻：需要更自然的表达")
	}
	if m.PassiveVoiceRatio > 0.3 {
		issues = append(issues, "被动语态比例过高：改为主动语态")
	}
	if m.FactAlignment < 0.6 {
		issues = append(issues, "产品事实覆盖不足：需要更多引用已验证的产品信息")
	}
	if m.PlatformFit < 0.7 {
		issues = append(issues, "格式不符合平台规范：检查字数限制和必需板块")
	}
	if len(issues) == 0 {
		return "文案质量良好"
	}
	return "需要修复的问题:\n- " + strings.Join(issues, "\n- ")
}
