// Base adapter and types
export { BaseLLMAdapter } from './base-adapter';
export * from './types';

// Adapters
export { GLMAdapter } from './adapters/glm-adapter';
export { OpenAIAdapter } from './adapters/openai-adapter';
export { GeminiAdapter } from './adapters/gemini-adapter';
export { ErnieAdapter } from './adapters/ernie-adapter';
export { QwenAdapter } from './adapters/qwen-adapter';
export { OpenRouterAdapter } from './adapters/openrouter-adapter';
export { HunyuanAdapter } from './adapters/hunyuan-adapter';

// Transformers
export { BaseTransformer } from './transformer';
export { GLMTransformer } from './transformers/glm-transformer';
export { OpenAITransformer } from './transformers/openai-transformer';
export { GeminiTransformer } from './transformers/gemini-transformer';
export { ErnieTransformer } from './transformers/ernie-transformer';
export { QwenTransformer } from './transformers/qwen-transformer';
export { OpenRouterTransformer } from './transformers/openrouter-transformer';
export { HunyuanTransformer } from './transformers/hunyuan-transformer';

// Core classes
export { LLMAdapterManager } from './manager';
export { AdapterFactory } from './adapter-factory';
export { FailoverProcessor } from './failover-processor';
export { ConfigManager } from './config-manager';

// Configuration types
export * from './config-types';

// Utility functions
export { createLLMManager, createSimpleLLMManager, createAdapter } from './utils';

// Error handling
export type{
  ErrorSeverity,
  ErrorCategory,
  RecoveryAction,
  ErrorInfo,
  RecoverySuggestion,
  EnhancedLLMAdapterError,
  ErrorAnalyzer
} from './error-handling';

// Version
export const VERSION = '1.0.0';