package runtime

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/sashabaranov/go-openai"
	"launchcircle-backend/internal/config"
	"launchcircle-backend/internal/eino/types"
)

type ChatModel struct {
	client *openai.Client
	model  string
}

var GlobalChatModel *ChatModel
var styleRegistry = map[string]*types.StyleProfile{}

const (
	DefaultLLMTimeout = 60 * time.Second
)

func init() {
	styleRegistry["producthunt"] = GetProductHuntProfile()
	styleRegistry["x_thread"] = GetXThreadProfile()
	styleRegistry["jike"] = GetJikeProfile()
	styleRegistry["hackernews"] = GetHackerNewsProfile()
}

func InitChatModel() error {
	cfg := openai.DefaultConfig(config.AppConfig.GroqAPIKey)
	cfg.BaseURL = "https://api.groq.com/openai/v1"
	client := openai.NewClientWithConfig(cfg)

	GlobalChatModel = &ChatModel{
		client: client,
		model:  "llama-3.3-70b-versatile",
	}
	log.Println("Eino ChatModel 初始化完成 (Groq)")
	return nil
}

func (m *ChatModel) Generate(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	if m == nil || m.client == nil {
		return "", fmt.Errorf("ChatModel未初始化 — 请检查GROQ_API_KEY配置")
	}

	if _, hasDeadline := ctx.Deadline(); !hasDeadline {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, DefaultLLMTimeout)
		defer cancel()
	}
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
		{Role: openai.ChatMessageRoleUser, Content: userPrompt},
	}

	resp, err := m.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:       m.model,
		Messages:     messages,
		Temperature: 0.7,
	})
	if err != nil {
		return "", fmt.Errorf("LLM调用失败: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("LLM返回空结果")
	}

	return resp.Choices[0].Message.Content, nil
}

func (m *ChatModel) GenerateStructured(ctx context.Context, systemPrompt, userPrompt string, outputFormat string) (string, error) {
	formatInstruction := ""
	switch outputFormat {
	case "json":
		formatInstruction = "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation outside the JSON."
	case "facts":
		formatInstruction = "\n\nIMPORTANT: Output each fact on a new line in format: [CATEGORY] Claim text here. Categories: feature, benefit, metric, positioning."
	default:
		formatInstruction = ""
	}

	return m.Generate(ctx, systemPrompt, userPrompt+formatInstruction)
}

func GetStyleProfile(platform string) (*types.StyleProfile, bool) {
	p, ok := styleRegistry[platform]
	return p, ok
}

func GetAllPlatforms() []string {
	platforms := make([]string, 0, len(styleRegistry))
	for p := range styleRegistry {
		platforms = append(platforms, p)
	}
	return platforms
}

func GetProductHuntProfile() *types.StyleProfile {
	return &types.StyleProfile{
		Platform:        "producthunt",
		Version:         "v1.0",
		ToneDescription: "产品化、简洁、结果导向。像开发者在和开发者说话，不是营销人员在推销。",
		Targets: types.StyleTarget{
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
		Format: types.FormatTemplate{
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
		Examples: []types.FewShotExample{
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

func GetXThreadProfile() *types.StyleProfile {
	return &types.StyleProfile{
		Platform:        "x_thread",
		Version:         "v1.0",
		ToneDescription: "口语化、对话感、有个性。像在推特上和朋友分享一个发现的好东西，不是在发官方公告。",
		Targets: types.StyleTarget{
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
		Format: types.FormatTemplate{
			TaglineMaxLength: 120,
			BodyMaxLength:    280,
			CTAMaxLength:     50,
			RequiredSections: []string{"hook_tweet", "detail_tweets", "cta_tweet"},
			ForbiddenPhrases: []string{
				"1/ 🧵 A thread on...",
				"In this thread, I will explain...",
				"Let's dive into...",
				"Here's what you need to know about...",
			},
		},
		Examples: []types.FewShotExample{
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

func GetJikeProfile() *types.StyleProfile {
	return &types.StyleProfile{
		Platform:        "jike",
		Version:         "v1.0",
		ToneDescription: "社区感、发现好东西的分享心态、轻松随意。像在即刻上跟朋友分享一个新发现，带点个人感受和互动提问。",
		Targets: types.StyleTarget{
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
		Format: types.FormatTemplate{
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
		Examples: []types.FewShotExample{
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

func GetHackerNewsProfile() *types.StyleProfile {
	return &types.StyleProfile{
		Platform:        "hackernews",
		Version:         "v1.0",
		ToneDescription: "技术深度、客观、show don't tell。假设读者是懂技术的开发者，不需要解释基础概念。",
		Targets: types.StyleTarget{
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
		Format: types.FormatTemplate{
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
		Examples: []types.FewShotExample{
			{
				InputContext: "A CLI tool that helps developers write better git commit messages by analyzing code diffs using local NLP models.",
				OutputCopy: `Show HN: Local-first git commit message generator using a 50MB on-device model

I built a tool that generates conventional commit messages from staged diffs without calling any external API.

**How it works:**
- Parses 'git diff --cached' output into structured change descriptions (file path, diff hunks, added/removed lines)
- Runs a quantized CodeBERT model (~50MB) locally via ONNX Runtime to classify the change type and generate a summary
- Applies conventional commit formatting with configurable scope mapping from your '.commitlintrc'

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
