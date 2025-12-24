import { StreamEvent, ProviderType } from './types';

/**
 * Unified stream processor for all providers
 * Ensures consistent behavior across different LLM providers
 */
export class StreamProcessor {
  /**
   * Process a stream chunk from any provider and return a unified event
   */
  static process(chunk: any, providerType: ProviderType): StreamEvent | null {
    // Handle provider-specific error formats
    const errorEvent = this.processError(chunk, providerType);
    if (errorEvent) return errorEvent;

    // Handle provider-specific content formats
    const contentEvent = this.processContent(chunk, providerType);
    if (contentEvent) return contentEvent;

    // Handle provider-specific completion formats
    const doneEvent = this.processDone(chunk, providerType);
    if (doneEvent) return doneEvent;

    return null;
  }

  /**
   * Process error events from different providers
   */
  private static processError(chunk: any, providerType: ProviderType): StreamEvent | null {
    switch (providerType) {
      case 'openai':
        if (chunk.error) {
          return {
            type: 'error',
            error: `OpenAI API Error: ${chunk.error.message}`,
          };
        }
        break;
      
      case 'glm':
        if (chunk.event === 'error') {
          return {
            type: 'error',
            error: `GLM API Error: ${chunk.data}`,
          };
        }
        break;
      
      case 'ernie':
        if (chunk.error_code) {
          return {
            type: 'error',
            error: `ERNIE API Error: ${chunk.error_msg}`,
          };
        }
        break;
      
      case 'hunyuan':
        if (chunk.Error) {
          return {
            type: 'error',
            error: `Hunyuan API Error: ${chunk.Error.Message}`,
          };
        }
        break;
      
      case 'openrouter':
        if (chunk.error) {
          return {
            type: 'error',
            error: `OpenRouter API Error: ${chunk.error.message}`,
          };
        }
        break;
      
      case 'gemini':
        if (chunk.error) {
          return {
            type: 'error',
            error: `Gemini API Error: ${chunk.error.message}`,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Process content events from different providers
   */
  private static processContent(chunk: any, providerType: ProviderType): StreamEvent | null {
    let content: string | undefined;

    switch (providerType) {
      case 'openai':
      case 'openrouter':
      case 'ernie':
      case 'hunyuan':
        content = chunk.choices?.[0]?.delta?.content;
        break;
      
      case 'glm':
        content = chunk.choices?.[0]?.delta?.content;
        break;
      
      case 'gemini':
        content = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        break;
    }

    if (content) {
      return {
        type: 'content',
        content,
      };
    }

    return null;
  }

  /**
   * Process completion events from different providers
   */
  private static processDone(chunk: any, providerType: ProviderType): StreamEvent | null {
    let finishReason: string | undefined;

    switch (providerType) {
      case 'openai':
      case 'openrouter':
      case 'glm':
      case 'ernie':
      case 'hunyuan':
        finishReason = chunk.choices?.[0]?.finish_reason;
        break;
      
      case 'gemini':
        finishReason = chunk.candidates?.[0]?.finishReason;
        break;
    }

    // Handle provider-specific completion signals
    switch (providerType) {
      case 'glm':
        if (chunk.event === 'finish') {
          return {
            type: 'done',
          };
        }
        break;
    }

    if (finishReason) {
      return {
        type: 'done',
        finishReason: finishReason as any,
      };
    }

    return null;
  }
}