package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"launchcircle-backend/internal/chroma"
	"launchcircle-backend/internal/config"
	"launchcircle-backend/internal/eino"
	_ "launchcircle-backend/internal/eino/stages"
	"launchcircle-backend/internal/firecrawl"
	"launchcircle-backend/internal/handler"
)

func main() {
	config.Init()

	if err := config.ValidateRequired(); err != nil {
		log.Fatalf("配置校验失败: %v", err)
	}

	err := chroma.Init()
	if err != nil {
		log.Fatalf("Chroma初始化失败: %v", err)
	}

	err = eino.InitChatModel()
	if err != nil {
		log.Fatalf("Eino ChatModel初始化失败: %v", err)
	}

	eino.InitPipeline()

	err = firecrawl.Init()
	if err != nil {
		log.Fatalf("Firecrawl初始化失败: %v", err)
	}

	r := gin.Default()
	r.MaxMultipartMemory = 1 << 20

	r.Use(handler.RecoveryMiddleware())
	r.Use(handler.BodySizeLimit(100 * 1024))
	r.Use(handler.RateLimitMiddleware(10))
	r.Use(handler.RequestIDMiddleware())
	r.Use(handler.LoggingMiddleware())
	r.Use(handler.CORSMiddleware())

	api := r.Group("/api")
	{
		api.POST("/generate-marketing", handler.GenerateMarketingHandler)
		api.POST("/generate-stream", handler.GenerateStreamHandler)
		api.POST("/add-case", handler.AddCaseHandler)
		api.POST("/mutual-match", handler.MutualMatchHandler)

		api.GET("/platforms", func(c *gin.Context) {
			c.JSON(200, gin.H{"platforms": eino.GetAllPlatforms()})
		})
	}

	log.Printf("LaunchCircle Backend 启动 (with 5-Stage Humanization Pipeline)")
	log.Printf("支持平台: %v", eino.GetAllPlatforms())
	log.Printf("服务启动在 :%s", config.AppConfig.ServerPort)
	r.Run(":" + config.AppConfig.ServerPort)
}
