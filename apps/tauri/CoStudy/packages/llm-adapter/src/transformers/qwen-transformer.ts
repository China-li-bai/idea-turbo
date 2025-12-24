import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, BaseMessage, Choice, TokenUsage } from '../types';

/**
 * Qwen transformer implementation
 * Handles conversion between unified format and Qwen-specific format
 */
export class QwenTransformer extends BaseTransformer {
  constructor() {
    super('qwen');
  }

  getDefaultBaseURL(): string {
    return 'https://dashscope.aliyuncs.com/api/v1';
  }

  getEndpointPath(): string {
    return '/services/aigc/text-generation/generation';
  }

  getAuthHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  transformRequest(request: LLMRequest): any {
    // Transform messages to Qwen format
    const messages = this.transformMessages(request.messages);

    const qwenRequest: any = {
      model: request.model || 'qwen-turbo',
      messages,
    };

    // Map parameters to Qwen format
    if (request.temperature !== undefined) {
      qwenRequest.temperature = Math.max(0, Math.min(2, request.temperature)); // Qwen requires 0-2
    }
    if (request.top_p !== undefined) {
      qwenRequest.top_p = Math.max(0.01, Math.min(0.99, request.top_p)); // Qwen requires 0.01-0.99
    }
    if (request.max_tokens !== undefined) {
      qwenRequest.max_tokens = request.max_tokens;
    }
    if (request.repetition_penalty !== undefined) {
      qwenRequest.repetition_penalty = request.repetition_penalty;
    }
    if (request.stop) {
      qwenRequest.stop = request.stop;
    }
    if (request.stream !== undefined) {
      qwenRequest.stream = request.stream;
    }
    if (request.enable_search !== undefined) {
      qwenRequest.enable_search = request.enable_search;
    }

    return qwenRequest;
  }

  transformResponse(response: any): LLMResponse {
    const choices: Choice[] = response.output.choices.map((choice: any) => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content || '',
      } as BaseMessage,
      finish_reason: choice.finish_reason || 'stop',
    }));

    const usage: TokenUsage | undefined = response.usage ? {
      prompt_tokens: response.usage.input_tokens || 0,
      completion_tokens: response.usage.output_tokens || 0,
      total_tokens: response.usage.total_tokens || 0,
    } : undefined;

    return {
      id: response.request_id,
      object: 'chat.completion',
      created: Date.now(),
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