package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"launchcircle-backend/internal/eino"
	"launchcircle-backend/internal/model"
)

type GenerateRequest struct {
	ProductDescription string   `json:"product_description" binding:"required"`
	Platforms          []string `json:"platforms" binding:"required,min=1,dive,oneof=producthunt x_thread jike hackernews"`
}

func GenerateMarketingHandler(c *gin.Context) {
	var req GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "请求参数错误",
			"details": err.Error(),
			"hint":    "platforms 必须是: producthunt, x_thread, jike, hackernews 中的一个或多个",
		})
		return
	}

	input := &eino.GenerateInput{
		ProductDescription: req.ProductDescription,
		Platforms:          req.Platforms,
	}

	if err := eino.SanitizeInput(input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "输入校验失败",
			"details": err.Error(),
		})
		return
	}

	result, err := eino.GlobalPipeline.Run(c, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Pipeline执行失败",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"platforms":      result.PlatformResults,
		"duration_ms":    result.TotalDuration,
		"generated_at":   time.Now().Format(time.RFC3339),
	})
}
