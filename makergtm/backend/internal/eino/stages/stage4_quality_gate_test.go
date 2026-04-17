package stages

import (
	"testing"

	"launchcircle-backend/internal/eino"
)

func TestCalculateBurstiness(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		wantMin  float64
		wantMax  float64
	}{
		{
			name: "uniform sentences",
			text: "This is a sentence. This is another one. Here is a third sentence. The fourth one is here too.",
			wantMin: 0,
			wantMax: 0.3,
		},
		{
			name: "varied length sentences",
			text: "Short. This is a medium length sentence with more words in it. And here we have a really long sentence that has many many words and goes on for quite a while to demonstrate variation in sentence structure and length for the burstiness calculation algorithm.",
			wantMin: 0.5,
			wantMax: 1.5,
		},
		{
			name: "single short text",
			text: "Hello world.",
			wantMin: 0,
			wantMax: 2.0,
		},
		{
			name: "empty text",
			text: "",
			wantMin: 0,
			wantMax: 2.0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateBurstiness(tt.text)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("calculateBurstiness() = %v, want between %v and %v", got, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestCountForbiddenWords(t *testing.T) {
	forbidden := []string{"revolutionary", "game-changer", "empower", "furthermore", "delve"}
	tests := []struct {
		name        string
		text        string
		wantCount   int
	}{
		{
			name:      "no forbidden words",
			text:      "This is a clean text about a product that helps developers write better code.",
			wantCount: 0,
		},
		{
			name:      "one forbidden word",
			text:      "This revolutionary tool will change how you work forever.",
			wantCount: 1,
		},
		{
			name:      "multiple forbidden words",
			text:      "A game-changing product that will empower your team. Furthermore, it delves deep into the problem space.",
			wantCount: 4,
		},
		{
			name:      "case insensitive match",
			text:      "This REVOLUTIONARY approach empowers everyone.",
			wantCount: 2,
		},
		{
			name:      "empty text",
			text:      "",
			wantCount: 0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := countForbiddenWords(tt.text, forbidden)
			if got != tt.wantCount {
				t.Errorf("countForbiddenWords() = %v, want %v", got, tt.wantCount)
			}
		})
	}
}

func TestEstimatePerplexity(t *testing.T) {
	tests := []struct {
		name    string
		text    string
		wantMin float64
		wantMax float64
	}{
		{
			name:    "normal natural text",
			text:    "I built this tool because I was frustrated with how slow my workflow was. It took me two weekends but now it saves me hours every week.",
			wantMin:  0.3,
			wantMax:  0.9,
		},
		{
			name:    "AI-sounding text with rare patterns",
			text:    "Furthermore, this revolutionary solution delves into the paradigm-shifting landscape of cutting-edge innovation that leverages the power of synergy to empower users in today's tapestry of groundbreaking technology.",
			wantMin:  0.8,
			wantMax:  2.0,
		},
		{
			name:    "empty text",
			text:    "",
			wantMin:  0.05,
			wantMax:  0.6,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := estimatePerplexity(tt.text)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("estimatePerplexity() = %v, want between %v and %v", got, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestCheckFactAlignment(t *testing.T) {
	facts := []eino.Fact{
		{Claim: "CLI tool for git commits", Category: "feature", Confidence: 1.0},
		{Claim: "runs locally offline", Category: "feature", Confidence: 1.0},
		{Claim: "50MB binary size", Category: "metric", Confidence: 1.0},
		{Claim: "saves time every day", Category: "benefit", Confidence: 0.8},
	}
	tests := []struct {
		name       string
		text       string
		wantMin    float64
		wantMax    float64
	}{
		{
			name:    "high alignment - all facts mentioned",
			text:    "This CLI tool for git commits runs locally offline as a 50MB binary. It saves time every day.",
			wantMin: 0.75,
			wantMax: 1.0,
		},
		{
			name:    "low alignment - no facts mentioned",
			text:    "An amazing product that changes everything you know about software development.",
			wantMin:  0.0,
			wantMax: 0.25,
		},
		{
			name:    "partial alignment - some facts mentioned",
			text:    "A CLI tool that runs locally with just 50MB size.",
			wantMin:  0.4,
			wantMax:  0.7,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := checkFactAlignment(tt.text, facts)
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("checkFactAlignment() = %v, want between %v and %v", got, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestScoreInRange(t *testing.T) {
	tests := []struct {
		name  string
		value float64
		min   float64
		max   float64
		want  float64
	}{
		{name: "within range", value: 0.8, min: 0.7, max: 1.0, want: 1.0},
		{name: "below range close", value: 0.65, min: 0.7, max: 1.0, want: 0.9},
		{name: "below range far", value: 0.3, min: 0.7, max: 1.0, want: 0.4},
		{name: "above range close", value: 1.15, min: 0.7, max: 1.0, want: 0.775},
		{name: "above range far", value: 2.0, min: 0.7, max: 1.0, want: 0.0},
		{name: "exact lower bound", value: 0.7, min: 0.7, max: 1.0, want: 1.0},
		{name: "exact upper bound", value: 1.0, min: 0.7, max: 1.0, want: 1.0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := scoreInRange(tt.value, tt.min, tt.max)
			if got != tt.want {
				t.Errorf("scoreInRange(%v, %v, %v) = %v, want %v", tt.value, tt.min, tt.max, got, tt.want)
			}
		})
	}
}

func TestParseFacts(t *testing.T) {
	raw := `[feature] CLI-based commit message generator
[benefit] Saves time writing commit messages
[metric] 50MB binary size
[positioning] Alternative to Copilot hooks`

	facts := parseFacts(raw)

	if len(facts) != 4 {
		t.Fatalf("parseFacts() returned %d facts, want 4", len(facts))
	}

	if facts[0].Category != "feature" {
		t.Errorf("fact[0].Category = %v, want feature", facts[0].Category)
	}
	if facts[1].Category != "benefit" {
		t.Errorf("fact[1].Category = %v, want benefit", facts[1].Category)
	}
	if facts[2].Category != "metric" {
		t.Errorf("fact[2].Category = %v, want metric (should detect number)", facts[2].Category)
	}
	if facts[3].Confidence <= 0 {
		t.Errorf("fact[3].Confidence should be > 0")
	}
}

func TestParseGeneratedCopy(t *testing.T) {
	raw := `**Tagline:** Turn messy diffs into clean commits

**Body:**
The Problem: Writing good commit messages is tedious.
Most devs write "fix stuff" or copy from Jira.

**CTA:** Try it free → [link]`

	copy := parseGeneratedCopy(raw, "producthunt")

	if copy.Tagline == "" {
		t.Error("Tagline should not be empty")
	}
	if !contains(copy.Tagline, "diffs") && !contains(copy.Tagline, "commits") {
		t.Errorf("Tagline should contain key terms, got: %s", copy.Tagline)
	}
	if copy.Body == "" {
		t.Error("Body should not be empty")
	}
	if copy.CTA == "" {
		t.Error("CTA should not be empty")
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchSubstring(s, substr)
}

func searchSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
