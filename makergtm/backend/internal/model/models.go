package model

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
