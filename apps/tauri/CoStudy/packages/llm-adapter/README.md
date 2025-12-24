# LLM Adapter

一个轻量级的 TypeScript 库，提供统一的接口来访问不同的大型语言模型 API。

## 特性

- 🚀 轻量级设计，最小化依赖
- 🔄 统一的 API 接口，支持多种 LLM 提供商
- 🎯 优先使用免费 API，降低成本
- 🔄 自动故障转移和重试机制
- 📡 支持流式响应
- 🌐 支持多模态内容（文本 + 图像）
- 🛡️ 完整的 TypeScript 类型支持
- 🔧 灵活的配置选项
- 🏗️ 模块化架构，易于扩展
- 📊 增强的错误处理和恢复建议

## 支持的提供商

该库支持以下 LLM 提供商，按优先级排序：

1. **GLM (智谱 AI)** - 使用 `glm-4-flash` 免费模型
2. **ERNIE (百度文心一言)** - 使用 `ernie-speed-128k` 免费模型
3. **Hunyuan (腾讯混元)** - 使用 `hunyuan-lite` 免费模型
4. **OpenRouter** - 使用 `meta-llama/llama-3.1-8b-instruct:free` 免费模型
5. **Gemini (Google)** - 使用 `gemini-1.5-flash` 免费模型

## 架构设计

### 转换器模式

为了减少代码重复和提高可维护性，我们引入了转换器模式：

```
适配器 (Adapter) → 转换器 (Transformer) → API 请求
```

每个适配器现在只负责与特定API交互，而请求/响应的转换逻辑委托给专门的转换器类。这种设计使得添加新的提供商变得更加简单。

### 组件分离

原来的管理器类承担了太多职责，现在我们将其拆分为多个更小、更专注的类：

- `ConfigManager`: 负责配置管理，包括加载、验证和转换配置
- `FailoverProcessor`: 负责故障转移逻辑，包括重试机制和提供商切换
- `AdapterFactory`: 负责根据配置创建适配器实例
- `LLMAdapterManager`: 现在只负责协调这些组件，职责更加单一

### 增强的错误处理

新的错误处理系统更加智能和有用：

- 错误被分类为不同的类别（认证、网络、速率限制等）
- 根据错误类型提供特定的恢复建议
- 详细的错误信息帮助用户快速定位和解决问题

## 安装

```bash
npm install @make-gold/llm-adapter
```

## 快速开始

### 使用预配置的管理器

最简单的方式是使用预配置的管理器，它会自动从环境变量中读取 API 密钥：

```typescript
import { createLLMManager } from '@make-gold/llm-adapter';

// 创建管理器实例
const manager = createLLMManager();

// 发送请求
const response = await manager.complete({
  messages: [
    { role: 'user', content: '你好，请介绍一下你自己。' }
  ],
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(response.content);
```

### 仅使用免费提供商

```typescript
import { createFreeLLMManager } from '@make-gold/llm-adapter';

const manager = createFreeLLMManager();

const response = await manager.complete({
  messages: [
    { role: 'user', content: '写一首关于春天的诗。' }
  ],
});

console.log(response.content);
```

### 使用特定的提供商

```typescript
import { createAdapter } from '@make-gold/llm-adapter';

// 创建 GLM 适配器
const glmAdapter = createAdapter('glm', {
  apiKey: 'your-glm-api-key',
  model: 'glm-4-flash',
});

const response = await glmAdapter.complete({
  messages: [
    { role: 'user', content: '解释什么是量子计算。' }
  ],
});
```

### 流式响应

```typescript
import { createFreeLLMManager } from '@make-gold/llm-adapter';

const manager = createFreeLLMManager();

const request = {
  messages: [
    { role: 'user', content: '讲一个关于机器人的故事。' }
  ],
};

// 处理流式响应
for await (const event of manager.stream(request)) {
  if (event.type === 'content') {
    process.stdout.write(event.content);
  } else if (event.type === 'done') {
    console.log('\n流式响应完成');
  }
}
```

### 多模态内容（文本 + 图像）

```typescript
import { createLLMManager } from '@make-gold/llm-adapter';

const manager = createLLMManager();

const response = await manager.complete({
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: '描述这张图片中的内容。' },
        {
          type: 'image_url',
          image_url: {
            url: 'https://example.com/image.jpg',
          },
        },
      ],
    },
  ],
});

console.log(response.content);
```

## 环境变量

你可以使用以下环境变量来配置 API 密钥和端点：

```bash
# GLM (智谱 AI)
GLM_API_KEY=your-glm-api-key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-4-flash

# ERNIE (百度文心一言)
ERNIE_API_KEY=your-ernie-api-key
ERNIE_SECRET_KEY=your-ernie-secret-key
ERNIE_BASE_URL=https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop
ERNIE_MODEL=ernie-speed-128k

# Hunyuan (腾讯混元)
HUNYUAN_SECRET_ID=your-hunyuan-secret-id
HUNYUAN_SECRET_KEY=your-hunyuan-secret-key
HUNYUAN_REGION=ap-beijing
HUNYUAN_BASE_URL=https://hunyuan.tencentcloudapi.com
HUNYUAN_MODEL=hunyuan-lite

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
OPENROUTER_HTTP_REFERER=https://your-app.com
OPENROUTER_TITLE=Your App Name

# Gemini (Google)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-1.5-flash
```

## 高级配置

### 自定义管理器

```typescript
import { createLLMManager } from '@make-gold/llm-adapter';

const manager = createLLMManager({
  providers: {
    glm: {
      apiKey: 'your-glm-api-key',
      model: 'glm-4-flash',
    },
    openrouter: {
      apiKey: 'your-openrouter-api-key',
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      httpReferer: 'https://your-app.com',
      title: 'My App',
    },
  },
  priority: ['glm', 'openrouter'], // 设置优先级
  fallbackEnabled: true, // 启用故障转移
  retryCount: 2, // 重试次数
  retryDelay: 500, // 重试延迟（毫秒）
});
```

### 简单管理器

```typescript
import { createSimpleLLMManager } from '@make-gold/llm-adapter';

const manager = createSimpleLLMManager([
  {
    type: 'glm',
    config: {
      apiKey: 'your-glm-api-key',
      model: 'glm-4-flash',
    },
  },
  {
    type: 'gemini',
    config: {
      apiKey: 'your-gemini-api-key',
      model: 'gemini-1.5-flash',
    },
  },
]);
```

### 使用新的组件

```typescript
import { 
  ConfigManager, 
  FailoverProcessor, 
  AdapterFactory,
  LLMAdapterManager 
} from '@make-gold/llm-adapter';

// 创建配置管理器
const configManager = new ConfigManager();
configManager.loadFromEnvironment();

// 创建故障转移处理器
const failoverProcessor = new FailoverProcessor();

// 创建管理器
const manager = new LLMAdapterManager(configManager, failoverProcessor);

// 初始化管理器
await manager.initialize();

// 执行请求
const response = await manager.complete({
  messages: [{ role: 'user', content: 'Hello, world!' }],
  model: 'gpt-3.5-turbo'
});
```

## 错误处理

库提供了详细的错误信息和恢复建议：

```typescript
import { 
  EnhancedLLMAdapterError, 
  ErrorCategory,
  RecoveryAction 
} from '@make-gold/llm-adapter';

try {
  const response = await manager.complete(request);
} catch (error) {
  if (error instanceof EnhancedLLMAdapterError) {
    console.error(`Error: ${error.message}`);
    console.error(`Category: ${error.category}`);
    console.error(`Severity: ${error.severity}`);
    
    // 根据错误类型采取不同的恢复措施
    if (error.category === ErrorCategory.RATE_LIMIT) {
      // 实现速率限制恢复逻辑
      if (error.recoveryActions.includes(RecoveryAction.RETRY_WITH_BACKOFF)) {
        // 实现指数退避重试
      }
    }
  }
}
```

## API 参考

### 类型定义

```typescript
// 消息类型
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

// 请求类型
interface LLMRequest {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  stop?: string[];
}

// 响应类型
interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

// 流式事件类型
type StreamEvent = 
  | { type: 'content'; content: string }
  | { type: 'done'; finishReason?: string }
  | { type: 'error'; error: Error };
```

### 管理器方法

```typescript
class LLMAdapterManager {
  // 执行普通请求
  complete(request: LLMRequest, preferredProvider?: ProviderType): Promise<LLMResponse>;
  
  // 执行流式请求
  stream(request: LLMRequest, preferredProvider?: ProviderType): AsyncGenerator<StreamEvent>;
  
  // 获取特定提供商的适配器
  getAdapter(providerType: ProviderType): BaseLLMAdapter | undefined;
  
  // 更新提供商配置
  updateProviderConfig(providerType: ProviderType, config: Partial<ProviderConfig>): void;
  
  // 更新优先级
  updatePriority(priority: ProviderType[]): void;
  
  // 启用/禁用故障转移
  setFallbackEnabled(enabled: boolean): void;
}
```

## 迁移指南

如果你正在使用旧版本的LLM适配器，请按照以下步骤迁移：

1. 更新导入语句，使用新的类和接口
2. 更新配置对象，使用新的配置结构
3. 更新错误处理代码，使用新的错误类和错误分析器
4. 测试你的应用程序，确保一切正常工作

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License