package eino

import (
	"launchcircle-backend/internal/eino/runtime"
)

type ChatModel = runtime.ChatModel

var GlobalChatModel = runtime.GlobalChatModel
const DefaultLLMTimeout = runtime.DefaultLLMTimeout

func InitChatModel() error {
	return runtime.InitChatModel()
}
