import { BaseLLMAdapter } from './base-adapter';
import { GLMAdapter } from './adapters/glm-adapter';
import { ErnieAdapter } from './adapters/ernie-adapter';
import { HunyuanAdapter } from './adapters/hunyuan-adapter';
import { OpenRouterAdapter } from './adapters/openrouter-adapter';
import { GeminiAdapter } from './adapters/gemini-adapter';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { QwenAdapter } from './adapters/qwen-adapter';
import { LLMAdapterManager } from './manager';
import {
  ProviderType,
  ProviderConfig,
  GLMConfig,
  ERNIEConfig,
  HunyuanConfig,
  OpenRouterConfig,
  GeminiConfig,
  OpenAIConfig,
  QwenConfig
} from './types';
import { ManagerConfig } from './config-types';

/**
 * Create a specific adapter instance
 */
export function createAdapter<T extends ProviderType>(
  providerType: T,
  config: ProviderConfig & Record<string, any>
): BaseLLMAdapter {
  const adapterFactory: Record<ProviderType, (config: ProviderConfig) => BaseLLMAdapter> = {
    glm: (config) => new GLMAdapter(config as GLMConfig),
    ernie: (config) => new ErnieAdapter(config as ERNIEConfig),
    hunyuan: (config) => new HunyuanAdapter(config as HunyuanConfig),
    openrouter: (config) => new OpenRouterAdapter(config as OpenRouterConfig),
    gemini: (config) => new GeminiAdapter(config as GeminiConfig),
    openai: (config) => new OpenAIAdapter(config as OpenAIConfig),
    qwen: (config) => new QwenAdapter(config as QwenConfig),
  };

  const factory = adapterFactory[providerType];
  if (!factory) {
    throw new Error(`Unsupported provider type: ${providerType}`);
  }

  return factory(config);
}

/**
 * Create a pre-configured LLM manager with default providers
 */
export function createLLMManager(config?: Partial<ManagerConfig>): LLMAdapterManager {
  // Default configuration with environment variable support
  const defaultProviders: Record<ProviderType, ProviderConfig> = {
    glm: {
      apiKey: process.env.GLM_API_KEY || '',
      baseURL: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.GLM_MODEL || 'glm-4-flash',
    },
    ernie: {
      apiKey: process.env.ERNIE_API_KEY || '',
      secretKey: process.env.ERNIE_SECRET_KEY || '',
      baseURL: process.env.ERNIE_BASE_URL || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      model: process.env.ERNIE_MODEL || 'ernie-speed-128k',
    },
    hunyuan: {
      apiKey: process.env.HUNYUAN_API_KEY || process.env.HUNYUAN_SECRET_ID || '',
      secretId: process.env.HUNYUAN_SECRET_ID || '',
      secretKey: process.env.HUNYUAN_SECRET_KEY || '',
      region: process.env.HUNYUAN_REGION || 'ap-beijing',
      baseURL: process.env.HUNYUAN_BASE_URL || 'https://hunyuan.tencentcloudapi.com',
      model: process.env.HUNYUAN_MODEL || 'hunyuan-lite',
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      httpReferer: process.env.OPENROUTER_HTTP_REFERER || '',
      title: process.env.OPENROUTER_TITLE || 'LLM Adapter',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      organization: process.env.OPENAI_ORGANIZATION || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY || '',
      workspace: process.env.QWEN_WORKSPACE || '',
      baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: process.env.QWEN_MODEL || 'qwen-turbo',
    },
  };

  // Merge with user-provided config
  const finalConfig: ManagerConfig = {
    providers: defaultProviders,
    retryCount: 3,
    retryDelay: 1000,
    fallbackEnabled: true,
    ...config,
  };
  
  // Merge providers separately to avoid overwriting
  if (config?.providers) {
    finalConfig.providers = {
      ...defaultProviders,
      ...config.providers,
    };
  }

  // Create manager with providers
  const manager = new LLMAdapterManager();
  manager.initialize(finalConfig.providers);
  return manager;
}

/**
 * Create a simple manager with only the specified providers
 */
export function createSimpleLLMManager(
  providers: Array<{
    type: ProviderType;
    config: ProviderConfig & Record<string, any>;
  }>
): LLMAdapterManager {
  const providerMap: Record<ProviderType, ProviderConfig> = {} as Record<ProviderType, ProviderConfig>;
  
  for (const provider of providers) {
    providerMap[provider.type] = provider.config;
  }

  // Create manager with providers
  const manager = new LLMAdapterManager();
  manager.initialize(providerMap);
  return manager;
}

/**
 * Create a manager with only free providers
 */
export function createFreeLLMManager(): LLMAdapterManager {
  const defaultProviders = {
    glm: {
      apiKey: process.env.GLM_API_KEY || '',
      baseURL: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash', // Free model
    },
    ernie: {
      apiKey: process.env.ERNIE_API_KEY || '',
      secretKey: process.env.ERNIE_SECRET_KEY || '',
      baseURL: process.env.ERNIE_BASE_URL || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
      model: 'ernie-speed-128k', // Free model
    },
    hunyuan: {
      apiKey: process.env.HUNYUAN_API_KEY || process.env.HUNYUAN_SECRET_ID || '',
      secretId: process.env.HUNYUAN_SECRET_ID || '',
      secretKey: process.env.HUNYUAN_SECRET_KEY || '',
      region: process.env.HUNYUAN_REGION || 'ap-beijing',
      baseURL: process.env.HUNYUAN_BASE_URL || 'https://hunyuan.tencentcloudapi.com',
      model: 'hunyuan-lite', // Free model
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
      httpReferer: process.env.OPENROUTER_HTTP_REFERER || '',
      title: process.env.OPENROUTER_TITLE || 'LLM Adapter',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-1.5-flash', // Free model
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      organization: process.env.OPENAI_ORGANIZATION || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo', // Free model
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY || '',
      workspace: process.env.QWEN_WORKSPACE || '',
      baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-turbo', // Free model
    },
  };

  // Create manager with providers
  const manager = new LLMAdapterManager();
  manager.initialize(defaultProviders);
  return manager;
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(
  providerType: ProviderType,
  config: ProviderConfig & Record<string, any>
): boolean {
  try {
    createAdapter(providerType, config);
    return true;
  } catch (error) {
    console.error(`Invalid config for ${providerType}:`, error);
    return false;
  }
}