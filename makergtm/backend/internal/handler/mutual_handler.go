package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"launchcircle-backend/internal/chroma"
)

type MutualMatchRequest struct {
	UserDescription string `json:"user_description" binding:"required"`
}

func MutualMatchHandler(c *gin.Context) {
	var req MutualMatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := chroma.SearchSimilarCases(c, req.UserDescription, 3)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "匹配失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"matches": results,
	})
}
