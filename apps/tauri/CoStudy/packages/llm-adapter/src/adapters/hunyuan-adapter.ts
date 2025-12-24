import { BaseLLMAdapter } from '../base-adapter';
import { ProviderConfig } from '../types';
import { HunyuanTransformer } from '../transformers/hunyuan-transformer';

/**
 * Hunyuan (Tencent) adapter implementation
 * Documentation: https://cloud.tencent.com/document/product/1729/104753
 * Free tier: Limited quota for free models
 */
export class HunyuanAdapter extends BaseLLMAdapter {
  constructor(config: ProviderConfig) {
    const transformer = new HunyuanTransformer();
    super('hunyuan', config, transformer);
  }
}