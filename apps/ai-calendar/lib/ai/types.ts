export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: Message;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProvider {
  name: string;
  
  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  chatStream?(
    request: ChatCompletionRequest,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}

export interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  defaultModel?: string;
}

export interface AIConfig {
  providers: {
    openai?: ProviderConfig;
    gemini?: ProviderConfig;
    glm?: ProviderConfig;
    bailian?: ProviderConfig;
    [key: string]: ProviderConfig | undefined;
  };
  defaultProvider: string;
}
