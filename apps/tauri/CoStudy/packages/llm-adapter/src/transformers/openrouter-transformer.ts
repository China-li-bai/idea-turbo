import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, BaseMessage, Choice, TokenUsage } from '../types';

/**
 * OpenRouter transformer implementation
 * Handles conversion between unified format and OpenRouter-specific format
 */
export class OpenRouterTransformer extends BaseTransformer {
  constructor() {
    super('openrouter');
  }

  getDefaultBaseURL(): string {
    return 'https://openrouter.ai/api/v1';
  }

  getEndpointPath(): string {
    return '/chat/completions';
  }

  getAuthHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.siteURL || 'https://example.com',
      'X-Title': config.siteName || 'LLM Adapter',
    };
  }

  transformRequest(request: LLMRequest): any {
    // Transform messages to OpenRouter format
    const messages = this.transformMessages(request.messages);

    const openRouterRequest: any = {
      model: request.model || 'openai/gpt-3.5-turbo',
      messages,
    };

    // Map parameters to OpenRouter format
    if (request.temperature !== undefined) {
      openRouterRequest.temperature = request.temperature;
    }
    if (request.top_p !== undefined) {
      openRouterRequest.top_p = request.top_p;
    }
    if (request.max_tokens !== undefined) {
      openRouterRequest.max_tokens = request.max_tokens;
    }
    if (request.stream !== undefined) {
      openRouterRequest.stream = request.stream;
    }
    if (request.stop) {
      openRouterRequest.stop = request.stop;
    }
    if (request.presence_penalty !== undefined) {
      openRouterRequest.presence_penalty = request.presence_penalty;
    }
    if (request.frequency_penalty !== undefined) {
      openRouterRequest.frequency_penalty = request.frequency_penalty;
    }
    if (request.top_k !== undefined) {
      openRouterRequest.top_k = request.top_k;
    }
    if (request.repetition_penalty !== undefined) {
      openRouterRequest.repetition_penalty = request.repetition_penalty;
    }
    if (request.user) {
      openRouterRequest.user = request.user;
    }

    return openRouterRequest;
  }

  transformResponse(response: any): LLMResponse {
    const choices: Choice[] = response.choices.map((choice: any) => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content || '',
      } as BaseMessage,
      finish_reason: choice.finish_reason || 'stop',
    }));

    const usage: TokenUsage | undefined = response.usage ? {
      prompt_tokens: response.usage.prompt_tokens || 0,
      completion_tokens: response.usage.completion_tokens || 0,
      total_tokens: response.usage.total_tokens || 0,
    } : undefined;

    return {
      id: response.id,
      object: 'chat.completion',
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