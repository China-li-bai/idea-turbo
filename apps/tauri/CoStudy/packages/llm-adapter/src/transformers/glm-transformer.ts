import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, Choice, TokenUsage } from '../types';

/**
 * GLM (智谱AI) transformer implementation
 * Handles conversion between unified format and GLM-specific format
 */
export class GLMTransformer extends BaseTransformer {
  constructor() {
    super('glm');
  }

  getDefaultBaseURL(): string {
    return 'https://open.bigmodel.cn/api/paas/v4';
  }

  getEndpointPath(): string {
    return '/chat/completions';
  }

  getAuthHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  transformRequest(request: LLMRequest): any {
    // Transform messages to GLM format
    const messages = this.transformMessages(request.messages);

    // Build GLM request
    const glmRequest: any = {
      model: request.model || 'glm-4-flash', // Default to free model
      messages,
    };

    // Add optional parameters with GLM-specific constraints
    if (request.temperature !== undefined) {
      glmRequest.temperature = Math.max(0.01, Math.min(1, request.temperature)); // GLM requires 0.01-1
    }
    if (request.top_p !== undefined) {
      glmRequest.top_p = Math.max(0.01, Math.min(0.99, request.top_p)); // GLM requires 0.01-0.99
    }
    if (request.max_tokens !== undefined) {
      glmRequest.max_tokens = request.max_tokens;
    }
    if (request.stream !== undefined) {
      glmRequest.stream = request.stream;
    }
    if (request.stop) {
      glmRequest.stop = request.stop;
    }
    
    // Add structured output support
    if (request.response_format) {
      glmRequest.response_format = request.response_format;
    }

    return glmRequest;
  }

  transformResponse(response: any): LLMResponse {
    const choices: Choice[] = response.choices.map((choice: any) => 
      this.transformChoice(choice)
    );

    const usage: TokenUsage | undefined = this.transformUsage(response.usage);

    return {
      id: response.id,
      object: response.object,
      created: response.created,
      model: response.model,
      choices,
      usage,
    };
  }

  transformStreamChunk(chunk: any): any {
    // This method is no longer used in the new architecture
    // Stream processing is handled by the unified StreamProcessor
    return chunk;
  }
}