---
name: "multi-llm-provider"
description: "多AI模型提供商选型分析与实现方案。适用于需要支持OpenAI、Gemini、智谱GLM、阿里云百炼等多个LLM的项目。"
---

# 多 AI 模型提供商选型与实现

本 skill 记录了在项目中选择和实现多 AI 模型提供商支持的分析思维和经验。

---

## 一、选型分析

### 1.1 可选方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **自己轻量级封装** | 完全可控、依赖少、灵活 | 需要自己写代码 | ⭐⭐⭐⭐⭐ |
| LangChain | 功能强大、生态完善 | 太重、过度设计、依赖复杂 | ⭐⭐ |
| @ai-sdk/openai-compatible | 不错的封装、社区维护 | 还是有一定依赖 | ⭐⭐⭐ |

### 1.2 决策依据

**关键发现**：
- 现在绝大多数模型都提供 **OpenAI 兼容接口**
- 智谱、阿里云百炼、DeepSeek、Ollama 等都是 OpenAI 兼容的
- 不需要为每个模型写单独的客户端

**最终选择**：轻量级自己封装 + OpenAI 兼容接口

---

## 二、核心设计原则

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    AIService (统一入口)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ - chat()         - chatStream()                  │  │
│  │ - getProvider()  - 配置管理                      │  │
│  └───────────────────┬───────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ OpenAI        │ │ Gemini        │ │ 智谱 GLM      │
│ Compatible    │ │ Compatible    │ │ Compatible    │
│ Provider      │ │ Provider      │ │ Provider      │
└───────────────┘ └───────────────┘ └───────────────┘
        │
        ▼
┌──────────────────────────────────────────┐
│  配置管理器 (AIConfigManager)            │
│  - 存储在 IndexedDB                      │
│  - 支持动态添加/更新提供商               │
└──────────────────────────────────────────┘
```

### 2.2 关键抽象

| 抽象 | 职责 |
|------|------|
| `LLMProvider` | 统一的 Provider 接口 |
| `OpenAICompatibleProvider` | OpenAI 兼容实现 |
| `AIConfigManager` | 配置存储和管理 |
| `AIService` | 统一服务入口 |

---

## 三、支持的模型提供商

| 提供商 | 官方名称 | baseURL | 状态 |
|--------|----------|---------|------|
| **OpenAI** | ChatGPT | `https://api.openai.com/v1` | ✅ 预置 |
| **Google Gemini** | Gemini | `https://generativelanguage.googleapis.com/v1beta` | ✅ 预置 |
| **智谱 GLM** | 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | ✅ 预置 |
| **阿里云百炼** | 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | ✅ 预置 |
| **DeepSeek** | DeepSeek | `https://api.deepseek.com/v1` | 可配置 |
| **Ollama** | 本地模型 | `http://localhost:11434/v1` | 可配置 |
| **SiliconFlow** | 硅基流动 | `https://api.siliconflow.cn/v1` | 可配置 |

---

## 四、目录结构

```
lib/ai/
├── types.ts                    # 类型定义
│   ├── Message
│   ├── ChatCompletionRequest
│   ├── ChatCompletionResponse
│   ├── LLMProvider (接口)
│   ├── ProviderConfig
│   └── AIConfig
├── config.ts                   # 配置管理
│   └── AIConfigManager
├── index.ts                    # 统一入口
│   └── AIService
└── providers/
    └── openaiCompatible.ts     # OpenAI 兼容实现
        └── OpenAICompatibleProvider
```

---

## 五、使用示例

### 5.1 基本配置

```typescript
import { aiService, aiConfigManager } from '@/lib/ai';

// 配置智谱 GLM
await aiConfigManager.updateProvider('glm', {
  apiKey: 'your-glm-api-key',
  model: 'glm-4',
});

// 设置默认提供商
await aiConfigManager.setDefaultProvider('glm');
```

### 5.2 简单对话

```typescript
const response = await aiService.chat([
  { role: 'system', content: '你是一个智能助手' },
  { role: 'user', content: '你好！' },
]);

console.log(response.choices[0].message.content);
```

### 5.3 流式输出

```typescript
await aiService.chatStream(
  [
    { role: 'user', content: '写一首关于春天的诗' },
  ],
  (chunk) => {
    process.stdout.write(chunk); // 实时输出
  }
);
```

### 5.4 切换提供商

```typescript
// 方法1: 设置默认提供商
await aiConfigManager.setDefaultProvider('gemini');
await aiConfigManager.updateProvider('gemini', {
  apiKey: 'your-gemini-api-key',
});

// 方法2: 调用时指定
const response = await aiService.chat(messages, {
  provider: 'bailian',
  model: 'qwen-plus',
  temperature: 0.5,
});
```

### 5.5 添加自定义提供商

```typescript
// 添加 DeepSeek
await aiConfigManager.updateProvider('deepseek', {
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: 'your-deepseek-api-key',
  model: 'deepseek-chat',
  defaultModel: 'deepseek-chat',
});

// 使用
await aiConfigManager.setDefaultProvider('deepseek');
```

---

## 六、核心实现要点

### 6.1 OpenAICompatibleProvider

关键特性：
- ✅ 支持非流式调用 (`chat`)
- ✅ 支持流式调用 (`chatStream`)
- ✅ 自动处理 SSE (Server-Sent Events)
- ✅ 统一错误处理

流式实现关键点：
```typescript
async chatStream(request, onChunk) {
  const response = await fetch(...);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    // 解析 SSE 格式: "data: {...}"
    // 提取 content 并调用 onChunk
  }
}
```

### 6.2 AIConfigManager

关键特性：
- ✅ 配置存储在 IndexedDB
- ✅ 默认配置预置
- ✅ 支持动态更新提供商
- ✅ 单例模式

### 6.3 AIService

关键特性：
- ✅ 统一入口
- ✅ 延迟初始化
- ✅ Provider 缓存
- ✅ 默认参数设置

---

## 七、经验总结

### 7.1 选型经验

| 维度 | 经验 |
|------|------|
| **依赖管理** | 优先考虑无依赖或轻依赖方案 |
| **可控性** | 自己的代码 > 第三方库 |
| **兼容性** | OpenAI 兼容接口是行业标准 |
| **灵活性** | 抽象接口，易于扩展 |

### 7.2 实现经验

1. **先抽象接口** - 先定义 `LLMProvider` 接口
2. **然后实现** - 写 `OpenAICompatibleProvider` 实现
3. **配置管理** - IndexedDB 存储配置，用户可自定义
4. **统一入口** - `AIService` 统一管理所有 Provider
5. **错误处理** - 统一的错误处理和类型安全

### 7.3 扩展指南

添加新的非 OpenAI 兼容 Provider：

```typescript
// 1. 实现 LLMProvider 接口
class CustomProvider implements LLMProvider {
  name = 'custom';
  
  async chat(request) {
    // 自定义实现
  }
}

// 2. 在 AIService 中注册
// 或者修改 AIService.initialize() 来支持
```

---

## 八、参考资源

- OpenAI API 文档: https://platform.openai.com/docs/api-reference
- 智谱 GLM API: https://open.bigmodel.cn/dev/api
- 阿里云百炼: https://help.aliyun.com/zh/model-studio/
- OpenAI 兼容标准: 大多数现代 LLM 都支持
