package main

import (
	"context"
	"log"

	"launchcircle-backend/internal/chroma"
	"launchcircle-backend/internal/config"
)

func main() {
	config.Init()
	err := chroma.Init()
	if err != nil {
		log.Fatal(err)
	}

	cases := []struct {
		id       string
		content  string
		metadata map[string]interface{}
	}{
		{
			id: "case-1",
			content: `产品：TypingMind，一个AI聊天UI，支持Claude、GPT，一键切换。
Tagline：The better UI for ChatGPT.
Product Hunt描述：TypingMind is a better UI for ChatGPT, with folders, tags, search, and more.
首发推文：I built a better UI for ChatGPT, and it's free. 10k users in 3 days. https://t.co/xxx`,
			metadata: map[string]interface{}{
				"category": "AI Tool",
				"upvotes":  10000,
			},
		},
		{
			id: "case-2",
			content: `产品：Cursor，AI代码编辑器，集成GPT-4。
Tagline：The AI-first code editor.
Product Hunt描述：Cursor is an AI-first code editor that helps you write code faster with GPT-4.
首发推文：We built an AI code editor that actually works. 50k users in first week. https://t.co/xxx`,
			metadata: map[string]interface{}{
				"category": "Dev Tool",
				"upvotes":  15000,
			},
		},
		{
			id: "case-3",
			content: `产品：Notion AI，AI笔记助手。
Tagline：Your AI-powered workspace.
Product Hunt描述：Notion AI helps you write, brainstorm, and summarize right in your workspace.
首发推文：Notion just got a lot smarter. AI is here. https://t.co/xxx`,
			metadata: map[string]interface{}{
				"category": "Productivity",
				"upvotes":  20000,
			},
		},
		{
			id: "case-4",
			content: `产品：Midjourney，AI图像生成器。
Tagline：AI that turns text into art.
Product Hunt描述：Midjourney is an AI that creates stunning images from text descriptions.
首发推文：I spent 6 months building an AI artist. Here's what happened. https://t.co/xxx`,
			metadata: map[string]interface{}{
				"category": "AI Tool",
				"upvotes":  25000,
			},
		},
		{
			id: "case-5",
			content: `产品：Vercel v0，AI前端生成器。
Tagline：Generate UI with a prompt.
Product Hunt描述：v0 generates React components and full pages using AI from simple text prompts.
首发推文：We just launched AI that builds React apps from text. https://t.co/xxx`,
			metadata: map[string]interface{}{
				"category": "Dev Tool",
				"upvotes":  18000,
			},
		},
	}

	for _, c := range cases {
		err := chroma.AddCase(context.Background(), c.id, c.content, c.metadata)
		if err != nil {
			log.Printf("添加案例失败: %v", err)
		}
		log.Printf("添加案例: %s", c.id)
	}

	log.Println("所有案例导入完成！")
}
