import { BaseLLMAdapter } from '../base-adapter';
import { ProviderConfig } from '../types';
import { OpenRouterTransformer } from '../transformers/openrouter-transformer';

/**
 * OpenRouter adapter implementation
 * Documentation: https://openrouter.ai/docs
 * Free tier: Limited quota for free models
 */
export class OpenRouterAdapter extends BaseLLMAdapter {
  constructor(config: ProviderConfig) {
    const transformer = new OpenRouterTransformer();
    super('openrouter', config, transformer);
  }
}