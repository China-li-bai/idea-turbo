import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, BaseMessage, Choice, TokenUsage } from '../types';

/**
 * ERNIE transformer implementation
 * Handles conversion between unified format and ERNIE-specific format
 */
export class ErnieTransformer extends BaseTransformer {
  constructor() {
    super('ernie');
  }

  getDefaultBaseURL(): string {
    return 'https://aip.baidubce.com';
  }

  getEndpointPath(): string {
    return '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant';
  }

  getAuthHeaders(_config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  transformRequest(request: LLMRequest): any {
    // Transform messages to ERNIE format
    const messages = this.transformMessages(request.messages);

    const ernieRequest: any = {
      messages,
    };

    // Map parameters to ERNIE format
    if (request.temperature !== undefined) {
      ernieRequest.temperature = Math.max(0, Math.min(1, request.temperature)); // ERNIE requires 0-1
    }
    if (request.top_p !== undefined) {
      ernieRequest.top_p = Math.max(0, Math.min(1, request.top_p)); // ERNIE requires 0-1
    }
    if (request.penalty_score !== undefined) {
      ernieRequest.penalty_score = request.penalty_score;
    }
    if (request.disable_search !== undefined) {
      ernieRequest.disable_search = request.disable_search;
    }
    if (request.enable_citation !== undefined) {
      ernieRequest.enable_citation = request.enable_citation;
    }
    if (request.response_format) {
      ernieRequest.response_format = request.response_format;
    }
    if (request.user_id) {
      ernieRequest.user_id = request.user_id;
    }

    return ernieRequest;
  }

  transformResponse(response: any): LLMResponse {
    const choices: Choice[] = response.result ? [{
      index: 0,
      message: {
        role: 'assistant',
        content: response.result || '',
      } as BaseMessage,
      finish_reason: response.is_end ? 'stop' : 'length',
    }] : [];

    const usage: TokenUsage | undefined = response.usage ? {
      prompt_tokens: response.usage.prompt_tokens || 0,
      completion_tokens: response.usage.completion_tokens || 0,
      total_tokens: response.usage.total_tokens || 0,
    } : undefined;

    return {
      id: response.id || `ernie-${Date.now()}`,
      object: 'chat.completion',
      created: response.created || Math.floor(Date.now() / 1000),
      model: response.model || 'ernie-bot',
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