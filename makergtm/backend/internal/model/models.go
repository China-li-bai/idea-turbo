package model

import "time"

type Case struct {
	ID       string                 `json:"id"`
	Content  string                 `json:"content"`
	Metadata map[string]interface{} `json:"metadata"`
}

type GenerateResponse struct {
	Copy         string        `json:"copy"`
	SimilarCases []interface{} `json:"similar_cases"`
}

type MutualMatchResponse struct {
	Matches []interface{} `json:"matches"`
}

type GenerateRequest struct {
	ProductDescription string   `json:"product_description" binding:"required"`
	Platforms          []string `json:"platforms" binding:"required,dive,oneof=producthunt x_thread jike hackernews"`
}
