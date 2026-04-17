package eino

func GetProductHuntProfile() *StyleProfile {
	return &StyleProfile{
		Platform:        "producthunt",
		Version:         "v1.0",
		ToneDescription: "产品化、简洁、结果导向。像开发者在和开发者说话，不是营销人员在推销。",
		Targets: StyleTarget{
			BurstinessMin:  0.8,
			BurstinessMax:  1.1,
			AvgSentenceMin: 10,
			AvgSentenceMax: 22,
			PerplexityMin:  0.45,
			PerplexityMax:  0.75,
		},
		ForbiddenWords: []string{
			"revolutionary", "game-changer", "paradigm-shift",
			"cutting-edge", "state-of-the-art", "groundbreaking",
			"unleash", "empower", "synergy", "delve",
			"furthermore", "moreover", "it is worth noting",
			"in conclusion", "tapestry", "pivotal",
			"AI-powered", "next-generation", "world-class",
		},
		Format: FormatTemplate{
			TaglineMaxLength: 80,
			BodyMaxLength:    150,
			CTAMaxLength:     30,
			RequiredSections: []string{"tagline", "problem", "solution", "differentiator", "cta"},
			ForbiddenPhrases: []string{
				"We are a platform that...",
				"Our mission is to revolutionize...",
				"In today's fast-paced world...",
				"Leveraging the power of AI...",
			},
		},
		Examples: []FewShotExample{
			{
				InputContext: "A CLI tool that helps developers write better git commit messages by analyzing code diffs.",
				OutputCopy: `**Tagline:** Turn messy diffs into clean commits in one command.

**The Problem:** Writing good commit messages is tedious. Most devs write "fix stuff" or copy-paste from Jira tickets. Code reviews suffer because commits don't tell the story.

**What it does:** Analyzes your staged changes, understands what you actually changed, and generates a conventional commit message that follows best practices. Works offline. No API keys.

**Why different:** Doesn't use LLM APIs — runs a local model (~50MB). Costs nothing after install. Respects your .commitlintrc rules.`,
				Explanation: "Short tagline, problem-solution structure, specific metrics, no hype words",
				Upvotes:         856,
			},
			{
				InputContext: "A Notion template system that helps indie hackers organize their product launch checklist.",
				OutputCopy: `**Tagline:** Ship your launch, don't wing it.

**The Problem:** Launching a product means juggling 47 things across 12 tools. Something always falls through the cracks — usually the thing that costs you your #1 spot on PH.

**What it does:** A battle-tested Notion workspace with pre-built timelines, checklists, and templates used by 200+ launches that hit top 3. Covers pre-launch (30 days out) through launch day + post-launch follow-up.

**Why different:** Built from real launch data, not theory. Every checklist item maps to an actual action that moved the needle on past launches.`,
				Explanation: "Conversational tone, specific numbers, 'real data' credibility signal",
				Upvotes:         623,
			},
		},
		SystemPrompt: `You are writing a Product Hunt launch post for an indie developer's product.

RULES:
1. Tagline must be ONE sentence under 80 chars answering: "Who is this for and what do they get?"
2. Body max 150 words. Structure: Problem → What it does → Why different
3. Write like a developer talking to another developer
4. NEVER use these words: revolutionary, game-changer, cutting-edge, unleash, empower, synergy, delve, furthermore, moreover, AI-powered, next-generation, paradigm-shift, groundbreaking, tapestry, pivotal, state-of-the-art, world-class
5. Use specific numbers when possible ("200+ launches" not "many launches")
6. First person plural ("we built") or second person ("you get") — no third person corporate voice
7. Short sentences mixed with medium ones. Vary length.
8. End with a clear, low-friction CTA`,
	}
}
