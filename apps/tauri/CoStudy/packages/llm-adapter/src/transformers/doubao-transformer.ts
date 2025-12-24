import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, BaseMessage, Choice, TokenUsage } from '../types';

/**
 * Doubao transformer implementation
 * Handles conversion between unified format and Doubao-specific format
 */
export class DoubaoTransformer extends BaseTransformer {
  constructor() {
    super('doubao');
  }

  getDefaultBaseURL(): string {
    return 'https://ark.cn-beijing.volces.com/api/v3';
  }

  getEndpointPath(): string {
    return '/chat/completions';
  }

  getAuthHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  transformRequest(request: LLMRequest): any {
    // Transform messages to Doubao format
    const messages = this.transformMessages(request.messages);

    const doubaoRequest: any = {
      model: request.model || 'doubao-lite-4k',
      messages,
    };

    // Map parameters to Doubao format
    if (request.temperature !== undefined) {
      doubaoRequest.temperature = Math.max(0, Math.min(2, request.temperature)); // Doubao requires 0-2
    }
    if (request.top_p !== undefined) {
      doubaoRequest.top_p = Math.max(0, Math.min(1, request.top_p)); // Doubao requires 0-1
    }
    if (request.max_tokens !== undefined) {
      doubaoRequest.max_tokens = request.max_tokens;
    }
    if (request.stream !== undefined) {
      doubaoRequest.stream = request.stream;
    }
    if (request.stop) {
      doubaoRequest.stop = request.stop;
    }
    if (request.presence_penalty !== undefined) {
      doubaoRequest.presence_penalty = request.presence_penalty;
    }
    if (request.frequency_penalty !== undefined) {
      doubaoRequest.frequency_penalty = request.frequency_penalty;
    }
    if (request.user) {
      doubaoRequest.user = request.user;
    }

    return doubaoRequest;
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