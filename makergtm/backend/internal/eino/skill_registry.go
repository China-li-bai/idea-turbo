package eino

import (
	"launchcircle-backend/internal/eino/runtime"
	"launchcircle-backend/internal/eino/types"
)

func GetStyleProfile(platform string) (*types.StyleProfile, bool) {
	return runtime.GetStyleProfile(platform)
}

func GetAllPlatforms() []string {
	return runtime.GetAllPlatforms()
}
