package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"launchcircle-backend/internal/chroma"
	"launchcircle-backend/internal/config"
	"launchcircle-backend/internal/firecrawl"
	"launchcircle-backend/internal/handler"
	"launchcircle-backend/internal/llm"
)

func main() {
	config.Init()

	err := chroma.Init()
	if err != nil {
		log.Fatalf("Chroma初始化失败: %v", err)
	}

	llm.Init()

	err = firecrawl.Init()
	if err != nil {
		log.Fatalf("Firecrawl初始化失败: %v", err)
	}

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		api.POST("/generate-marketing", handler.GenerateMarketingHandler)
		api.POST("/add-case", handler.AddCaseHandler)
		api.POST("/mutual-match", handler.MutualMatchHandler)
	}

	log.Printf("服务启动在 :%s", config.AppConfig.ServerPort)
	r.Run(":" + config.AppConfig.ServerPort)
}
