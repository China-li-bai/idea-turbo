import { BaseLLMAdapter } from '../base-adapter';
import { ProviderConfig } from '../types';
import { ErnieTransformer } from '../transformers/ernie-transformer';

/**
 * ERNIE (Baidu) adapter implementation
 * Documentation: https://cloud.baidu.com/doc/WENXINWORKSHOP/s/jlil56u11
 * Free tier: Limited quota for free models
 */
export class ErnieAdapter extends BaseLLMAdapter {
  constructor(config: ProviderConfig) {
    const transformer = new ErnieTransformer();
    super('ernie', config, transformer);
  }
}