import { LLMRequest, LLMResponse, StreamEvent, ProviderConfig } from './types';

/**
 * Provider transformer interface
 * Encapsulates provider-specific request/response transformation logic
 */
export interface ProviderTransformer {
  /**
   * Transform the unified request to provider-specific format
   */
  transformRequest(request: LLMRequest): any;

  /**
   * Transform the provider response to unified format
   */
  transformResponse(response: any): LLMResponse;

  /**
   * Transform streaming data to unified format
   */
  transformStreamChunk(chunk: any): StreamEvent | null;

  /**
   * Get authentication headers for the provider
   */
  getAuthHeaders(config: ProviderConfig): Record<string, string>;

  /**
   * Get the default base URL for the provider
   */
  getDefaultBaseURL(): string;

  /**
   * Get the API endpoint path for the provider
   */
  getEndpointPath(): string;
}

/**
 * Base transformer with common functionality
 */
export abstract class BaseTransformer implements ProviderTransformer {
  protected providerType: string;

  constructor(providerType: string) {
    this.providerType = providerType;
  }

  abstract transformRequest(request: LLMRequest): any;
  abstract transformResponse(response: any): LLMResponse;
  abstract transformStreamChunk(chunk: any): StreamEvent | null;
  abstract getAuthHeaders(config: ProviderConfig): Record<string, string>;
  abstract getDefaultBaseURL(): string;
  abstract getEndpointPath(): string;

  /**
   * Common message transformation logic
   */
  protected transformMessages(messages: any[]): any[] {
    return messages.map((msg: any) => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content,
        };
      }
      
      // Handle multimodal content
      return {
        role: msg.role,
        content: msg.content.map((part: any) => {
          if (part.type === 'text') {
            return {
              type: 'text',
              text: part.text,
            };
          } else if (part.type === 'image_url') {
            return {
              type: 'image_url',
              image_url: {
                url: part.image_url.url,
                detail: part.image_url.detail || 'auto',
              },
            };
          }
          return part;
        }),
      };
    });
  }

  /**
   * Common choice transformation logic
   */
  protected transformChoice(choice: any): any {
    return {
      index: choice.index,
      message: choice.message ? {
        role: choice.message.role,
        content: choice.message.content || '',
      } : undefined,
      delta: choice.delta,
      finish_reason: choice.finish_reason,
    };
  }

  /**
   * Common usage transformation logic
   */
  protected transformUsage(usage: any): any {
    return usage ? {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
    } : undefined;
  }
}