import { BaseTransformer } from '../transformer';
import { LLMRequest, LLMResponse, ProviderConfig, BaseMessage, Choice, TokenUsage } from '../types';

/**
 * Gemini transformer implementation
 * Handles conversion between unified format and Gemini-specific format
 */
export class GeminiTransformer extends BaseTransformer {
  constructor() {
    super('gemini');
  }

  getDefaultBaseURL(): string {
    return 'https://generativelanguage.googleapis.com/v1beta';
  }

  getEndpointPath(): string {
    return '/models/gemini-pro:generateContent';
  }

  getAuthHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'x-goog-api-key': config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  transformRequest(request: LLMRequest): any {
    // Transform messages to Gemini format
    const contents = this.transformMessages(request.messages).map(msg => {
      if (msg.role === 'system') {
        // Gemini doesn't have system messages, prepend to first user message
        return {
          role: 'user',
          parts: [{ text: `System instruction: ${msg.content}` }]
        };
      }
      
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      };
    });

    const geminiRequest: any = {
      contents,
      generationConfig: {},
    };

    // Map parameters to Gemini format
    if (request.temperature !== undefined) {
      geminiRequest.generationConfig.temperature = request.temperature;
    }
    if (request.top_p !== undefined) {
      geminiRequest.generationConfig.topP = request.top_p;
    }
    if (request.max_tokens !== undefined) {
      geminiRequest.generationConfig.maxOutputTokens = request.max_tokens;
    }
    if (request.stop) {
      geminiRequest.generationConfig.stopSequences = Array.isArray(request.stop) 
        ? request.stop 
        : [request.stop];
    }
    if (request.top_k !== undefined) {
      geminiRequest.generationConfig.topK = request.top_k;
    }
    if (request.candidate_count !== undefined) {
      geminiRequest.generationConfig.candidateCount = request.candidate_count;
    }

    return geminiRequest;
  }

  transformResponse(response: any): LLMResponse {
    const choices: Choice[] = response.candidates.map((candidate: any, index: number) => ({
      index,
      message: {
        role: 'assistant',
        content: candidate.content.parts[0]?.text || '',
      } as BaseMessage,
      finish_reason: candidate.finishReason?.toLowerCase() || 'stop',
    }));

    const usage: TokenUsage | undefined = response.usageMetadata ? {
      prompt_tokens: response.usageMetadata.promptTokenCount,
      completion_tokens: response.usageMetadata.candidatesTokenCount,
      total_tokens: response.usageMetadata.totalTokenCount,
    } : undefined;

    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model || 'gemini-pro',
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