package stages

import (
	"testing"
)

func TestParseFacts(t *testing.T) {
	raw := `[feature] CLI-based commit message generator
[benefit] Saves time writing commit messages
[metric] 50MB binary size
[positioning] Alternative to Copilot hooks
A line without prefix`

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

func TestParseFactsEmpty(t *testing.T) {
	facts := parseFacts("")
	if len(facts) != 0 {
		t.Errorf("parseFacts('') returned %d facts, want 0", len(facts))
	}
}

func TestParseFactsMetricDetection(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantCat  string
	}{
		{"contains percent", "[feature] 50% faster performance", "metric"},
		{"contains x faster", "[feature] 10x speed improvement", "metric"},
		{"contains ms", "[feature] response time under 200ms", "metric"},
		{"contains seconds", "[feature] loads in 2 seconds", "metric"},
		{"plain feature", "[feature] supports dark mode", "feature"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			facts := parseFacts(tt.input)
			if len(facts) == 0 {
				t.Fatal("parseFacts returned empty")
			}
			if facts[0].Category != tt.wantCat {
				t.Errorf("category = %q, want %q", facts[0].Category, tt.wantCat)
			}
		})
	}
}

func TestParseGeneratedCopy(t *testing.T) {
	raw := `**Tagline:** Turn messy diffs into clean commits

**Body:**
The Problem: Writing good commit messages is tedious.
Most devs write "fix stuff" or copy from Jira tickets.

**CTA:** Try it free → [link]`

	copy := parseGeneratedCopy(raw, "producthunt")

	if copy.Tagline == "" {
		t.Error("Tagline should not be empty")
	}
	if copy.Body == "" {
		t.Error("Body should not be empty")
	}
	if copy.CTA == "" {
		t.Error("CTA should not be empty")
	}
	if copy.Platform != "producthunt" {
		t.Errorf("Platform = %q, want producthunt", copy.Platform)
	}
}

func TestParseGeneratedCopyNoMarkers(t *testing.T) {
	raw := `Turn messy diffs into clean commits in one command.
This tool analyzes your staged changes and generates conventional commits.
Works offline, no API keys needed.`

	copy := parseGeneratedCopy(raw, "producthunt")

	if copy.Tagline == "" {
		t.Error("Should extract first line as tagline for non-marked text")
	}
	if copy.Body == "" {
		t.Error("Should extract remaining text as body")
	}
}

func TestCleanContent(t *testing.T) {
	input := `Subscribe to our newsletter
This is important content about a great product.
Privacy Policy | Terms of Service
More useful content here.
© 2024 All rights reserved
Cookie Settings
Final relevant content line.`

	result := cleanContent(input)

	if containsStr(result, "Subscribe to our newsletter") {
		t.Error("Should remove newsletter subscription text")
	}
	if containsStr(result, "Privacy Policy") {
		t.Error("Should remove privacy policy text")
	}
	if containsStr(result, "Cookie Settings") {
		t.Error("Should remove cookie settings text")
	}
	if !containsStr(result, "important content") {
		t.Error("Should keep actual content")
	}
	if !containsStr(result, "relevant content") {
		t.Error("Should keep final content")
	}
}

func TestCleanContentTruncation(t *testing.T) {
	longText := ""
	for i := 0; i < 100; i++ {
		longText += "This is line " + string(rune(i)) + " of very long content that should be truncated. "
	}

	result := cleanContent(longText)
	if len(result) > 1100 {
		t.Errorf("Result length = %d, should be truncated to ~1000", len(result))
	}
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
