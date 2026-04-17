package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"launchcircle-backend/internal/eino"
)

type StreamGenerateRequest struct {
	ProductDescription string   `json:"product_description" binding:"required"`
	Platforms          []string `json:"platforms" binding:"required,min=1,dive,oneof=producthunt x_thread jike hackernews"`
}

func GenerateStreamHandler(c *gin.Context) {
	var req StreamGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "请求参数错误",
			"details": err.Error(),
		})
		return
	}

	c.SSEvent("message", gin.H{"type": "connected", "timestamp": time.Now().UnixMilli()})
	c.Writer.Flush()

	input := &eino.GenerateInput{
		ProductDescription: req.ProductDescription,
		Platforms:          req.Platforms,
	}

	if err := eino.SanitizeInput(input); err != nil {
		c.SSEvent("message", gin.H{
			"type":    "validation_error",
			"error":   err.Error(),
			"timestamp": time.Now().UnixMilli(),
		})
		c.Writer.Flush()
		return
	}

	ctx := c.Request.Context()

	cb := func(event eino.ProgressEvent) {
		select {
		case <-ctx.Done():
			return
		default:
		}
		data, err := json.Marshal(event)
		if err != nil {
			data = []byte(`{"error":"marshal failed"}`)
		}
		c.SSEvent("message", json.RawMessage(data))
		c.Writer.Flush()
	}

	result, err := eino.GlobalPipeline.RunWithProgress(ctx, input, cb)
	if err != nil {
		if ctx.Err() == context.Canceled {
			return
		}
		c.SSEvent("message", gin.H{
			"type":      "fatal_error",
			"error":     err.Error(),
			"timestamp": time.Now().UnixMilli(),
		})
		c.Writer.Flush()
		return
	}

	finalData, _ := json.Marshal(gin.H{
		"type":          "final_result",
		"platforms":     result.PlatformResults,
		"duration_ms":   result.TotalDuration,
		"generated_at":  time.Now().Format(time.RFC3339),
		"timestamp":     time.Now().UnixMilli(),
	})
	c.SSEvent("message", json.RawMessage(finalData))
	c.Writer.Flush()
}
