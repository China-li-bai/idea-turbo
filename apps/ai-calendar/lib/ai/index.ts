import { OpenAICompatibleProvider } from './providers/openaiCompatible';
import { LocalLLMProvider } from './providers/localLLM';
import { aiConfigManager } from './config';
import type {
  LLMProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  Message,
} from './types';

export class AIService {
  private providers: Map<string, LLMProvider> = new Map();
  private localProvider: LocalLLMProvider | null = null;
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const config = await aiConfigManager.getConfig();

    for (const [name, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig && name !== 'local') {
        this.providers.set(
          name,
          new OpenAICompatibleProvider(name, providerConfig)
        );
      }
    }

    const localConfig = config.providers.local;
    this.localProvider = new LocalLLMProvider({
      modelId: localConfig?.modelId || 'damo/MiniCPM4-0.5B-Instruct-int4-onnx',
      modelSource: localConfig?.modelSource || 'modelscope',
      baseURL: localConfig?.baseURL || '',
      apiKey: localConfig?.apiKey || '',
      model: localConfig?.model || 'MiniCPM4-0.5B-Instruct',
      preferWebGPU: true,
    });
    this.providers.set('local', this.localProvider);

    this.initialized = true;
  }

  getLocalProvider(): LocalLLMProvider | null {
    return this.localProvider;
  }

  async getProvider(name?: string): Promise<LLMProvider> {
    await this.initialize();

    const providerName = name || (await aiConfigManager.getConfig()).defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    return provider;
  }

  async chat(
    messages: Message[],
    options?: Partial<ChatCompletionRequest> & { provider?: string }
  ): Promise<ChatCompletionResponse> {
    const provider = await this.getProvider(options?.provider);
    const config = await aiConfigManager.getConfig();

    return provider.chat({
      model: options?.model || config.providers[config.defaultProvider]?.model || '',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens,
      top_p: options?.top_p,
      stream: false,
      response_format: options?.response_format,
    });
  }

  async chatStream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    options?: Partial<ChatCompletionRequest> & { provider?: string }
  ): Promise<void> {
    const provider = await this.getProvider(options?.provider);
    const config = await aiConfigManager.getConfig();

    if (provider.chatStream) {
      return provider.chatStream(
        {
          model: options?.model || config.providers[config.defaultProvider]?.model || '',
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens,
          top_p: options?.top_p,
          stream: true,
        },
        onChunk
      );
    }

    const response = await this.chat(messages, options);
    const content = response.choices[0]?.message?.content || '';
    onChunk(content);
  }
}

export const aiService = new AIService();

export * from './types';
export * from './config';
export { OpenAICompatibleProvider } from './providers/openaiCompatible';
