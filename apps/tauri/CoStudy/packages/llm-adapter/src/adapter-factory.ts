import { BaseLLMAdapter } from './base-adapter';
import { ProviderConfig, ProviderType } from './types';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { GeminiAdapter } from './adapters/gemini-adapter';
import { GLMAdapter } from './adapters/glm-adapter';
import { ErnieAdapter } from './adapters/ernie-adapter';
import { QwenAdapter } from './adapters/qwen-adapter';
import { OpenRouterAdapter } from './adapters/openrouter-adapter';
import { HunyuanAdapter } from './adapters/hunyuan-adapter';

/**
 * Adapter Factory class
 * Responsible for creating adapter instances based on provider type
 */
export class AdapterFactory {
  /**
   * Create an adapter instance based on provider type
   * @param providerType The type of provider
   * @param config The configuration for the adapter
   * @returns An instance of the appropriate adapter
   */
  static createAdapter(providerType: ProviderType, config: ProviderConfig): BaseLLMAdapter {
    switch (providerType) {
      case 'openai':
        return new OpenAIAdapter(config);
      case 'gemini':
        return new GeminiAdapter(config);
      case 'glm':
        return new GLMAdapter(config);
      case 'ernie':
        return new ErnieAdapter(config);
      case 'qwen':
        return new QwenAdapter(config);
      case 'openrouter':
        return new OpenRouterAdapter(config);
      case 'hunyuan':
        return new HunyuanAdapter(config);
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  /**
   * Get all supported provider types
   * @returns An array of supported provider types
   */
  static getSupportedProviders(): ProviderType[] {
    return ['openai', 'gemini', 'glm', 'ernie', 'qwen', 'openrouter', 'hunyuan'];
  }

  /**
   * Check if a provider type is supported
   * @param providerType The provider type to check
   * @returns True if the provider is supported, false otherwise
   */
  static isProviderSupported(providerType: ProviderType): boolean {
    return this.getSupportedProviders().includes(providerType);
  }
}