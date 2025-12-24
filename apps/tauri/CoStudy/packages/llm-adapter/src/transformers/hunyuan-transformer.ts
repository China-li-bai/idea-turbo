import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, BaseMessage, Choice, TokenUsage } from '../types';

/**
 * Hunyuan transformer implementation
 * Handles conversion between unified format and Hunyuan-specific format
 */
export class HunyuanTransformer extends BaseTransformer {
  constructor() {
    super('hunyuan');
  }

  getDefaultBaseURL(): string {
    return 'https://hunyuan.tencentcloudapi.com';
  }

  getEndpointPath(): string {
    return '/';
  }

  getAuthHeaders(config: ProviderConfig): Record<string, string> {
    // Hunyuan uses a complex authentication process with signatures
    // This is a simplified version - in a real implementation, you would
    // need to generate the proper signature based on the request
    return {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `TC3-HMAC-SHA256 Credential=${config.secretId}, Signature=${config.signature}`,
      'X-TC-Action': 'ChatCompletions',
      'X-TC-Region': config.region || 'ap-beijing',
    };
  }

  transformRequest(request: LLMRequest): any {
    // Transform messages to Hunyuan format
    const messages = this.transformMessages(request.messages);

    const hunyuanRequest: any = {
      Model: request.model || 'hunyuan-lite',
      Messages: messages,
    };

    // Map parameters to Hunyuan format
    if (request.temperature !== undefined) {
      hunyuanRequest.Temperature = Math.max(0, Math.min(2, request.temperature)); // Hunyuan requires 0-2
    }
    if (request.top_p !== undefined) {
      hunyuanRequest.TopP = Math.max(0, Math.min(1, request.top_p)); // Hunyuan requires 0-1
    }
    if (request.max_tokens !== undefined) {
      hunyuanRequest.Length = request.max_tokens;
    }
    if (request.stream !== undefined) {
      hunyuanRequest.Stream = request.stream ? 1 : 0;
    }
    if (request.stop) {
      hunyuanRequest.StopSequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }
    if (request.presence_penalty !== undefined) {
      hunyuanRequest.PresencePenalty = request.presence_penalty;
    }
    if (request.frequency_penalty !== undefined) {
      hunyuanRequest.FrequencyPenalty = request.frequency_penalty;
    }

    return hunyuanRequest;
  }

  transformResponse(response: any): LLMResponse {
    const choices: Choice[] = response.Response.Choices.map((choice: any) => ({
      index: choice.Index,
      message: {
        role: choice.Message.Role.toLowerCase(),
        content: choice.Message.Content || '',
      } as BaseMessage,
      finish_reason: choice.FinishReason || 'stop',
    }));

    const usage: TokenUsage | undefined = response.Response.Usage ? {
      prompt_tokens: response.Response.Usage.PromptTokens || 0,
      completion_tokens: response.Response.Usage.CompletionTokens || 0,
      total_tokens: response.Response.Usage.TotalTokens || 0,
    } : undefined;

    return {
      id: response.Response.RequestId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.Response.Model || 'hunyuan-lite',
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