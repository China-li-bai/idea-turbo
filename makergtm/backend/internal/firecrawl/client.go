package firecrawl

import (
	"github.com/mendableai/firecrawl-go"
	"launchcircle-backend/internal/config"
)

var Client *firecrawl.FirecrawlApp

func Init() error {
	app, err := firecrawl.NewFirecrawlApp(config.AppConfig.FirecrawlAPIKey, "https://api.firecrawl.dev")
	if err != nil {
		return err
	}
	Client = app
	return nil
}

func ScrapeURL(url string) (string, error) {
	result, err := Client.ScrapeURL(url, nil)
	if err != nil {
		return "", err
	}
	return result.Markdown, nil
}
