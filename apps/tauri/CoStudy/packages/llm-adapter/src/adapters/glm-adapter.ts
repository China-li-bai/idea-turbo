import { BaseLLMAdapter } from '../base-adapter';
import { ProviderConfig } from '../types';
import { GLMTransformer } from '../transformers/glm-transformer';

/**
 * GLM (智谱AI) adapter implementation
 * Documentation: https://open.bigmodel.cn/dev/api
 * Free tier: GLM-4-Flash model with limited quota
 */
export class GLMAdapter extends BaseLLMAdapter {
  constructor(config: ProviderConfig) {
    const transformer = new GLMTransformer();
    super('glm', config, transformer);
  }
}