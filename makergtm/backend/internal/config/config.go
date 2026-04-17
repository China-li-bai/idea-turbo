package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ChromaURL       string
	GroqAPIKey      string
	FirecrawlAPIKey string
	ServerPort      string
}

var AppConfig *Config

func Init() {
	_ = godotenv.Load()

	AppConfig = &Config{
		ChromaURL:       getEnv("CHROMA_URL", "http://localhost:8000"),
		GroqAPIKey:      getEnv("GROQ_API_KEY", ""),
		FirecrawlAPIKey: getEnv("FIRECRAWL_API_KEY", ""),
		ServerPort:      getEnv("SERVER_PORT", "8080"),
	}

	log.Println("配置加载完成")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
