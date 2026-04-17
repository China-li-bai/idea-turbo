package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"launchcircle-backend/internal/chroma"
)

type CaseRequest struct {
	Content  string                 `json:"content" binding:"required"`
	Metadata map[string]interface{} `json:"metadata"`
}

func AddCaseHandler(c *gin.Context) {
	var req CaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := uuid.New().String()

	err := chroma.AddCase(c, id, req.Content, req.Metadata)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("添加案例失败: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":      id,
		"message": "案例添加成功",
	})
}
