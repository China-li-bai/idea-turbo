package llm

import (
	"context"

	"github.com/sashabaranov/go-openai"
	"launchcircle-backend/internal/config"
)

var Client *openai.Client

func Init() {
	cfg := openai.DefaultConfig(config.AppConfig.GroqAPIKey)
	cfg.BaseURL = "https://api.groq.com/openai/v1"
	Client = openai.NewClientWithConfig(cfg)
}

func GenerateMarketingCopy(ctx context.Context, productDesc string, similarCases string) (string, error) {
	messages := []openai.ChatCompletionMessage{
		{
			Role: openai.ChatMessageRoleSystem,
			Content: `你是一个专业的独立开发者营销专家，根据用户的产品描述，和参考的爆款案例，帮用户生成适合Product Hunt的营销文案。
参考案例：
` + similarCases + `
请生成：
1. 产品Tagline（一句话介绍）
2. Product Hunt描述文案
3. 首发推文文案
`,
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: productDesc,
		},
	}

	resp, err := Client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:       "llama3-8b-8192",
			Messages:    messages,
			Temperature: 0.7,
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}
