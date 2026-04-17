package eino

func GetXThreadProfile() *StyleProfile {
	return &StyleProfile{
		Platform:        "x_thread",
		Version:         "v1.0",
		ToneDescription: "口语化、对话感、有个性。像在推特上和朋友分享一个发现的好东西，不是在发官方公告。",
		Targets: StyleTarget{
			BurstinessMin:  1.0,
			BurstinessMax:  1.4,
			AvgSentenceMin: 6,
			AvgSentenceMax: 20,
			PerplexityMin:  0.5,
			PerplexityMax:  0.8,
		},
		ForbiddenWords: []string{
			"furthermore", "moreover", "it is worth noting",
			"in conclusion", "delve", "tapestry",
			"additionally", "consequently", "nevertheless",
			"Excited to announce", "Thrilled to share",
			"We are pleased to", "Please join us",
		},
		Format: FormatTemplate{
			TaglineMaxLength: 120,
			BodyMaxLength:    280, // per tweet
			CTAMaxLength:     50,
			RequiredSections: []string{"hook_tweet", "detail_tweets", "cta_tweet"},
			ForbiddenPhrases: []string{
				"1/ 🧵 A thread on...",
				"In this thread, I will explain...",
				"Let's dive into...",
				"Here's what you need to know about...",
			},
		},
		Examples: []FewShotExample{
			{
				InputContext: "A CLI tool that helps developers write better git commit messages by analyzing code diffs.",
				OutputCopy: `🧵 I spent a weekend building something small that fixed my most annoying dev habit:

git commit -m "fix stuff"

↓ (runs one command)

git commit -m "feat(auth): add OAuth2 refresh token rotation with 30-day expiry"

Here's how it works 👇

1/ It reads your staged diffs — not just the file names, the actual changes

2/ Figures out what type of change it is (feat/fix/docs/refactor/etc) using simple pattern matching

3. Writes a conventional commit that actually describes what changed

No API calls. Runs locally. ~50MB binary.

The funny part? My code review comments dropped 40% because reviewers can actually understand what each commit does from the message alone.

Free & open source → [link]`,
				Explanation: "Hook with personal story, emoji use, short tweets, specific metric, casual CTA",
				Upvotes:         12400,
			},
		},
		SystemPrompt: `You are writing an X/Twitter thread for an indie developer's product launch.

RULES:
1. Hook tweet must grab attention — personal story, contrarian take, or surprising stat
2. Each tweet should be self-contained but flow into the next
3. Use 1-2 emojis max per tweet, not every sentence
4. Vary tweet length heavily — some 1-liners, some 3-sentence deep dives
5. Write like you're DMing a developer friend
6. NEVER start threads with "🧵 A thread on..." or "Let me tell you about..."
7. Include real numbers, not vague claims ("40% drop" not "huge improvement")
8. End with a simple CTA — link + one line of why click
9. Use "I" and "you" — never "we" unless co-founders are relevant
10. Grammatically incomplete sentences are OK. This is Twitter, not a white paper.`,
	}
}
