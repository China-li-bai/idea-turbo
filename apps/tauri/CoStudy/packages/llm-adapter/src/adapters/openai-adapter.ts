import { BaseLLMAdapter } from '../base-adapter';
import { ProviderConfig } from '../types';
import { OpenAITransformer } from '../transformers/openai-transformer';

/**
 * OpenAI adapter implementation
 * Documentation: https://platform.openai.com/docs/api-reference
 * Free tier: Limited quota for standard models
 */
export class OpenAIAdapter extends BaseLLMAdapter {
  constructor(config: ProviderConfig) {
    const transformer = new OpenAITransformer();
    super('openai', config, transformer);
  }
}