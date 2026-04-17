package eino

func GetJikeProfile() *StyleProfile {
	return &StyleProfile{
		Platform:        "jike",
		Version:         "v1.0",
		ToneDescription: "社区感、发现好东西的分享心态、轻松随意。像在即刻上跟朋友分享一个新发现，带点个人感受和互动提问。",
		Targets: StyleTarget{
			BurstinessMin:  0.9,
			BurstinessMax:  1.3,
			AvgSentenceMin: 8,
			AvgSentenceMax: 24,
			PerplexityMin:  0.5,
			PerplexityMax:  0.85,
		},
		ForbiddenWords: []string{
			"furthermore", "moreover", "it is worth noting",
			"in conclusion", "delve", "tapestry", "pivotal",
			"赋能", "痛点", "闭环", "抓手", "沉淀",
			"颗粒度", "对齐", "复盘", "链路", "矩阵",
		},
		Format: FormatTemplate{
			TaglineMaxLength: 100,
			BodyMaxLength:    500,
			CTAMaxLength:     40,
			RequiredSections: []string{"opening", "discovery", "personal_take", "interaction"},
			ForbiddenPhrases: []string{
				"今天给大家推荐一个好东西",
				"作为一个开发者我觉得",
				"这个产品真的太棒了",
				"强烈推荐给大家",
			},
		},
		Examples: []FewShotExample{
			{
				InputContext: "A CLI tool that helps developers write better git commit messages by analyzing code diffs.",
				OutputCopy: `挖到一个宝藏工具，解决了我写 commit message 的强迫症 😤

之前每次 git commit 都要想半天，最后还是写成 "fix bug" 或者 "update code"

这个工具直接分析你的 staged changes，自动生成符合 conventional commit 规范的 message

试了一周，最大的感受是：code review 的时候终于能看懂每个 commit 干啥了（之前真的全是谜之 commit）

它是纯本地跑的，不需要 API key，安装包才 50MB

有同款困扰的朋友可以试试 → [链接]

你们写 commit 有什么奇怪习惯吗？评论区聊聊 👇`,
				Explanation: "口语化开头、个人感受、具体体验、轻松互动提问",
				Upvotes:         2300,
			},
		},
		SystemPrompt: `You are writing a Jike (即刻) post for an indie developer's product discovery.

RULES:
1. 开头要像发现好东西一样自然 — 不要官方公告腔
2. 用"我"的视角分享真实使用感受
3. 可以用口语化表达："挖到"、"真的"、"太XX了"
4. 结尾一定要有互动提问，引导评论
5. 长度300-500字，不要太长也不要太短
6. 禁止互联网黑话：赋能、痛点、闭环、抓手、沉淀、颗粒度、对齐、复盘
7. 禁止营销腔：强烈推荐、大家赶紧、不容错过
8. 要像在和朋友聊天，不是在发广告`,
	}
}

func GetHackerNewsProfile() *StyleProfile {
	return &StyleProfile{
		Platform:        "hackernews",
		Version:         "v1.0",
		ToneDescription: "技术深度、客观、show don't tell。假设读者是懂技术的开发者，不需要解释基础概念。",
		Targets: StyleTarget{
			BurstinessMin:  0.7,
			BurstinessMax:  1.0,
			AvgSentenceMin: 12,
			AvgSentenceMax: 30,
			PerplexityMin:  0.4,
			PerplexityMax:  0.7,
		},
		ForbiddenWords: []string{
			"revolutionary", "game-changer", "paradigm-shift",
			"cutting-edge", "groundbreaking", "unleash",
			"empower", "synergy", "delve", "furthermore",
			"moreover", "it is worth noting", "tapestry",
			"AI-powered", "next-generation", "world-class",
			"Excited to announce", "Thrilled to share",
			"We are pleased to", "Please join us",
			"disruptive", "innovative", "leverage the power of",
		},
		Format: FormatTemplate{
			TaglineMaxLength: 120,
			BodyMaxLength:    800,
			CTAMaxLength:     50,
			RequiredSections: []string{"technical_summary", "how_it_works", "implementation_details", "link"},
			ForbiddenPhrases: []string{
				"In this post, I will explain...",
				"Let's dive into...",
				"The future of...",
				"This is a game-changer for...",
			},
		},
		Examples: []FewShotExample{
			{
				InputContext: "A CLI tool that helps developers write better git commit messages by analyzing code diffs using local NLP models.",
				OutputCopy: `Show HN: Local-first git commit message generator using a 50MB on-device model

I built a tool that generates conventional commit messages from staged diffs without calling any external API.

**How it works:**
- Parses `git diff --cached` output into structured change descriptions (file path, diff hunks, added/removed lines)
- Runs a quantized CodeBERT model (~50MB) locally via ONNX Runtime to classify the change type and generate a summary
- Applies conventional commit formatting with configurable scope mapping from your `.commitlintrc`

**Design decisions:**
1. Chose CodeBERT over GPT because commit messages need consistency, not creativity — and it runs in <200ms on a MacBook Air
2. Used ONNX Runtime for cross-platform binary distribution without CGo
3. The diff parser is pure Go, no git subprocess calls — handles edge cases like rename detection and binary file filtering

**Tradeoffs:**
- No LLM means it can't infer intent from context outside the diff. If you renamed a function across 15 files, you'll get 15 separate commits unless you stage them together.
- The summary quality is ~80% of what GPT-4 produces for simple changes, but it's deterministic and free.

Open source: [github link]

Curious what other people use for commit generation — are most folks using Copilot hooks or something custom?`,
				Explanation: "Technical depth, specific numbers, honest tradeoffs, genuine question at end",
				Upvotes:         456,
			},
		},
		SystemPrompt: `You are writing a Hacker News Show HN / technical discussion post.

RULES:
1. Lead with the technical summary — what it is, how it works, in one paragraph
2. Include specific implementation details: algorithms used, performance numbers, design tradeoffs
3. Be honest about limitations — HN readers respect this more than hype
4. Assume the reader understands programming concepts; don't explain what a CLI or API is
5. NEVER use marketing language: revolutionary, game-changing, disruptive, innovative
6. Write in first person ("I built") or neutral third person
7. End with a genuine question to spark technical discussion
8. Include links to repo/docs naturally
9. Length 400-800 words — enough depth but not a blog post
10. If open source, mention license and how to contribute`,
	}
}
