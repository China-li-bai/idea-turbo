package eino

var styleRegistry = map[string]*StyleProfile{}

func init() {
	styleRegistry["producthunt"] = GetProductHuntProfile()
	styleRegistry["x_thread"] = GetXThreadProfile()
	styleRegistry["jike"] = GetJikeProfile()
	styleRegistry["hackernews"] = GetHackerNewsProfile()
}

func GetStyleProfile(platform string) (*StyleProfile, bool) {
	p, ok := styleRegistry[platform]
	return p, ok
}

func GetAllPlatforms() []string {
	platforms := make([]string, 0, len(styleRegistry))
	for p := range styleRegistry {
		platforms = append(platforms, p)
	}
	return platforms
}
