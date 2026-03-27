import type {
  LLMProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderConfig,
} from '../types';

export class OpenAICompatibleProvider implements LLMProvider {
  name: string;
  private config: ProviderConfig;
  private useServerProxy: boolean;

  constructor(name: string, config: ProviderConfig) {
    this.name = name;
    this.config = config;
    this.useServerProxy = typeof window !== 'undefined';
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (this.useServerProxy) {
      return this.chatViaProxy(request);
    }
    return this.chatDirect(request);
  }

  private async chatViaProxy(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: this.name,
        messages: request.messages,
        model: request.model || this.config.defaultModel || this.config.model,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        response_format: request.response_format,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`${this.name} API error: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  private async chatDirect(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        model: request.model || this.config.defaultModel || this.config.model,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`${this.name} API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  async chatStream(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (this.useServerProxy) {
      return this.chatStreamViaProxy(request, onChunk);
    }
    return this.chatStreamDirect(request, onChunk);
  }

  private async chatStreamViaProxy(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: this.name,
        messages: request.messages,
        model: request.model || this.config.defaultModel || this.config.model,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        top_p: request.top_p,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`${this.name} API error: ${error.error || response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  private async chatStreamDirect(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        model: request.model || this.config.defaultModel || this.config.model,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`${this.name} API error: ${error.message || response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }
}
