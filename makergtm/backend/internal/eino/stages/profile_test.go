package stages

import (
	"testing"

	"launchcircle-backend/internal/eino"
)

func TestGetStyleProfile(t *testing.T) {
	tests := []struct {
		platform string
		wantOK   bool
	}{
		{"producthunt", true},
		{"x_thread", true},
		{"jike", true},
		{"hackernews", true},
		{"instagram", false},
		{"linkedin", false},
		{"", false},
	}
	for _, tt := range tests {
		t.Run(tt.platform, func(t *testing.T) {
			got, ok := GetStyleProfile(tt.platform)
			if ok != tt.wantOK {
				t.Errorf("GetStyleProfile(%q) ok = %v, want %v", tt.platform, ok, tt.wantOK)
			}
			if ok && got == nil {
				t.Error("GetStyleProfile() returned nil profile for valid platform")
			}
			if ok && got.Platform != tt.platform {
				t.Errorf("Profile platform = %q, want %q", got.Platform, tt.platform)
			}
		})
	}
}

func TestProductHuntProfile(t *testing.T) {
	profile := GetProductHuntProfile()
	if profile == nil {
		t.Fatal("GetProductHuntProfile() returned nil")
	}
	if profile.Platform != "producthunt" {
		t.Errorf("Platform = %q, want producthunt", profile.Platform)
	}
	if len(profile.ForbiddenWords) < 10 {
		t.Errorf("ForbiddenWords count = %d, want >= 10", len(profile.ForbiddenWords))
	}
	if len(profile.Examples) == 0 {
		t.Error("Examples should not be empty")
	}
	if profile.SystemPrompt == "" {
		t.Error("SystemPrompt should not be empty")
	}
	if profile.Format.TaglineMaxLength <= 0 || profile.Format.TaglineMaxLength > 200 {
		t.Errorf("TaglineMaxLength = %d, want reasonable value", profile.Format.TaglineMaxLength)
	}
	if profile.Targets.BurstinessMin >= profile.Targets.BurstinessMax {
		t.Error("BurstinessMin should be less than BurstinessMax")
	}
}

func TestXThreadProfile(t *testing.T) {
	profile := GetXThreadProfile()
	if profile == nil {
		t.Fatal("GetXThreadProfile() returned nil")
	}
	if profile.Platform != "x_thread" {
		t.Errorf("Platform = %q, want x_thread", profile.Platform)
	}
	if profile.Targets.BurstinessMin < GetProductHuntProfile().Targets.BurstinessMin {
		t.Log("X Thread should have higher burstiness target than PH (conversational)")
	}
	if len(profile.Examples) == 0 {
		t.Error("XThread examples should not be empty")
	}
}

func TestJikeProfile(t *testing.T) {
	profile := GetJikeProfile()
	if profile == nil {
		t.Fatal("GetJikeProfile() returned nil")
	}
	hasChineseBlacklist := false
	for _, w := range profile.ForbiddenWords {
		if w == "赋能" || w == "痛点" || w == "闭环" {
			hasChineseBlacklist = true
			break
		}
	}
	if !hasChineseBlacklist {
		t.Error("Jike profile should contain Chinese internet blacklist words")
	}
}

func TestHackerNewsProfile(t *testing.T) {
	profile := GetHackerNewsProfile()
	if profile == nil {
		t.Fatal("GetHackerNewsProfile() returned nil")
	}
	if profile.Format.BodyMaxLength <= GetProductHuntProfile().Format.BodyMaxLength {
		t.Log("HN should allow longer body text than PH (technical depth)")
	}
}

func TestGetAllPlatforms(t *testing.T) {
	platforms := GetAllPlatforms()
	if len(platforms) != 4 {
		t.Errorf("GetAllPlatforms() returned %d platforms, want 4", len(platforms))
	}
	expected := map[string]bool{"producthunt": true, "x_thread": true, "jike": true, "hackernews": true}
	for _, p := range platforms {
		if !expected[p] {
			t.Errorf("Unexpected platform: %q", p)
		}
		delete(expected, p)
	}
	for p := range expected {
		t.Errorf("Missing platform: %q", p)
	}
}

func TestFewShotExamplesStructure(t *testing.T) {
	for _, plat := range []string{"producthunt", "x_thread", "jike", "hackernews"} {
		t.Run(plat, func(t *testing.T) {
			profile, _ := GetStyleProfile(plat)
			for i, ex := range profile.Examples {
				if ex.InputContext == "" {
					t.Errorf("Example %d InputContext is empty", i)
				}
				if ex.OutputCopy == "" {
					t.Errorf("Example %d OutputCopy is empty", i)
				}
				if ex.Explanation == "" {
					t.Errorf("Example %d Explanation is empty", i)
				}
				if ex.Upvotes <= 0 {
					t.Errorf("Example %d Upvotes = %d, want > 0", i, ex.Upvotes)
				}
			}
		})
	}
}

func TestPipelineStateCreation(t *testing.T) {
	input := &GenerateInput{
		ProductDescription: "A test product",
		Platforms:          []string{"producthunt"},
	}
	state := NewPipelineState(input)
	if state.Input != input {
		t.Error("State Input should match provided input")
	}
	if state.MaxRounds != 3 {
		t.Errorf("Default MaxRounds = %d, want 3", state.MaxRounds)
	}
	if state.Round != 0 {
		t.Errorf("Initial Round = %d, want 0", state.Round)
	}
}

func TestProgressEventConstants(t *testing.T) {
	constants := []string{
		EventGenerationStart,
		EventStageComplete,
		EventQualityResult,
		EventRefinement,
		EventPlatformDone,
		EventAllDone,
		EventError,
	}
	seen := make(map[string]bool)
	for _, c := range constants {
		if seen[c] {
			t.Errorf("Duplicate event constant: %q", c)
		}
		seen[c] = true
		if c == "" {
			t.Error("Event constant should not be empty")
		}
	}
}
