import { BaseLLMAdapter } from '../base-adapter';
import { ProviderConfig } from '../types';
import { GeminiTransformer } from '../transformers/gemini-transformer';

/**
 * Gemini adapter implementation
 * Documentation: https://ai.google.dev/docs
 * Free tier: 15 requests per minute, 1,500 requests per day
 */
export class GeminiAdapter extends BaseLLMAdapter {
  constructor(config: ProviderConfig) {
    const transformer = new GeminiTransformer();
    super('gemini', config, transformer);
  }
}