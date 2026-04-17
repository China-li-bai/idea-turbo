package eino

type StyleTarget struct {
	BurstinessMin     float64 `json:"burstiness_min"`
	BurstinessMax     float64 `json:"burstiness_max"`
	AvgSentenceMin    int     `json:"avg_sentence_min"`
	AvgSentenceMax    int     `json:"avg_sentence_max"`
	PerplexityMin     float64 `json:"perplexity_min"`
	PerplexityMax     float64 `json:"perplexity_max"`
}

type FormatTemplate struct {
	TaglineMaxLength int      `json:"tagline_max_length"`
	BodyMaxLength    int      `json:"body_max_length"`
	CTAMaxLength     int      `json:"cta_max_structure"`
	RequiredSections []string `json:"required_sections"`
	ForbiddenPhrases []string `json:"forbidden_phrases"`
}

type FewShotExample struct {
	InputContext  string `json:"input_context"`
	OutputCopy    string `json:"output_copy"`
	Explanation   string `json:"explanation"`
	Upvotes       int    `json:"upvotes"`
}

type StyleProfile struct {
	Platform        string           `json:"platform"`
	Version         string           `json:"version"`
	ToneDescription string           `json:"tone_description"`
	Targets         StyleTarget      `json:"targets"`
	ForbiddenWords  []string         `json:"forbidden_words"`
	Format          FormatTemplate   `json:"format"`
	Examples        []FewShotExample `json:"examples"`
	SystemPrompt    string           `json:"system_prompt"`
}
