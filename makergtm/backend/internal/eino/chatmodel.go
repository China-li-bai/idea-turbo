package eino

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/sashabaranov/go-openai"
	"launchcircle-backend/internal/config"
)

type ChatModel struct {
	client *openai.Client
	model  string
}

var GlobalChatModel *ChatModel

const (
	DefaultLLMTimeout = 60 * time.Second
)

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
		Model:    m.model,
		Messages: messages,
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
