import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, Choice, TokenUsage } from '../types';

/**
 * OpenAI transformer implementation
 * Handles conversion between unified format and OpenAI-specific format
 */
export class OpenAITransformer extends BaseTransformer {
  constructor() {
    super('openai');
  }

  getDefaultBaseURL(): string {
    return 'https://api.openai.com/v1';
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
    // OpenAI format is already standard, so minimal transformation needed
    const openaiRequest: any = {
      model: request.model || 'gpt-3.5-turbo', // Default to a common model
      messages: this.transformMessages(request.messages),
    };

    // Add optional parameters
    if (request.temperature !== undefined) {
      openaiRequest.temperature = request.temperature;
    }
    if (request.top_p !== undefined) {
      openaiRequest.top_p = request.top_p;
    }
    if (request.max_tokens !== undefined) {
      openaiRequest.max_tokens = request.max_tokens;
    }
    if (request.stream !== undefined) {
      openaiRequest.stream = request.stream;
    }
    if (request.stop) {
      openaiRequest.stop = request.stop;
    }
    if (request.presence_penalty !== undefined) {
      openaiRequest.presence_penalty = request.presence_penalty;
    }
    if (request.frequency_penalty !== undefined) {
      openaiRequest.frequency_penalty = request.frequency_penalty;
    }
    if (request.logit_bias) {
      openaiRequest.logit_bias = request.logit_bias;
    }
    if (request.user) {
      openaiRequest.user = request.user;
    }

    return openaiRequest;
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