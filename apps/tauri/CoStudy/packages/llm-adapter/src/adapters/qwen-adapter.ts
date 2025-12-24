import { BaseLLMAdapter } from '../base-adapter';
import { ProviderConfig } from '../types';
import { QwenTransformer } from '../transformers/qwen-transformer';

/**
 * Qwen (Alibaba) adapter implementation
 * Documentation: https://help.aliyun.com/zh/dashscope/developer-reference/quick-start
 * Free tier: Limited quota for free models
 */
export class QwenAdapter extends BaseLLMAdapter {
  constructor(config: ProviderConfig) {
    const transformer = new QwenTransformer();
    super('qwen', config, transformer);
  }
}