package config

import (
	"fmt"
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

	var warnings []string
	if AppConfig.GroqAPIKey == "" {
		warnings = append(warnings, "GROQ_API_KEY is empty — LLM calls will fail")
	}
	if AppConfig.FirecrawlAPIKey == "" {
		warnings = append(warnings, "FIRECRAWL_API_KEY is empty — web scraping will fail")
	}
	if len(warnings) > 0 {
		log.Printf("⚠️  配置警告 (%d):", len(warnings))
		for _, w := range warnings {
			log.Printf("  - %s", w)
		}
	} else {
		log.Println("配置加载完成 (all keys present)")
	}
}

func ValidateRequired() error {
	if AppConfig.GroqAPIKey == "" {
		return fmt.Errorf("GROQ_API_KEY is required but not set")
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
