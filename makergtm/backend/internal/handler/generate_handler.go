package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"launchcircle-backend/internal/chroma"
	"launchcircle-backend/internal/llm"
)

type GenerateRequest struct {
	ProductDescription string `json:"product_description" binding:"required"`
}

func GenerateMarketingHandler(c *gin.Context) {
	var req GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := chroma.SearchSimilarCases(c, req.ProductDescription, 5)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "检索案例失败"})
		return
	}

	caseText := ""
	for i, res := range results {
		caseText += "案例" + string(rune(i+1)) + ":\n" + res.Document + "\n\n"
	}

	copy, err := llm.GenerateMarketingCopy(c, req.ProductDescription, caseText)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成文案失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"copy":          copy,
		"similar_cases": results,
	})
}
