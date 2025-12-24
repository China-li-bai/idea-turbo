/**
 * Core interfaces and types for LLM adapter
 * This file defines the unified data structure for all LLM providers
 */

// Base message interface that all providers will adapt to
export interface BaseMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

// Structured output format for JSON schema
export interface ResponseFormat {
  type: 'json_object' | 'text';
  json_schema?: JSONSchema;
}

export interface JSONSchema {
  name: string;
  description?: string;
  schema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
    items?: any;
    enum?: any[];
    [key: string]: any; // Allow additional JSON Schema properties
  };
  strict?: boolean;
}

// Unified request interface
export interface LLMRequest {
  messages: BaseMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  repetition_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  // Structured output support
  response_format?: ResponseFormat;
  // Additional properties for specific providers
  candidate_count?: number;
  enable_search?: boolean;
  disable_search?: boolean;
  enable_citation?: boolean;
  penalty_score?: number;
  user_id?: string;
}

// Unified response interface
export interface LLMResponse {
  id: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Choice[];
  usage?: TokenUsage;
}

export interface Choice {
  index: number;
  message?: BaseMessage;
  delta?: Partial<BaseMessage>;
  finish_reason?: 'stop' | 'length' | 'content_filter' | 'function_call' | 'tool_calls';
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Provider-specific configuration
export interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryCount?: number;
  retryDelay?: number;
  [key: string]: any; // Allow additional properties for specific providers
}

// Provider-specific configurations
export interface GLMConfig extends ProviderConfig {
  // GLM-specific configuration
}

export interface ERNIEConfig extends ProviderConfig {
  // ERNIE-specific configuration
  secretKey?: string;
  accessToken?: string;
}

export interface HunyuanConfig extends ProviderConfig {
  // Hunyuan-specific configuration
  secretId?: string;
  secretKey?: string;
}

export interface OpenRouterConfig extends ProviderConfig {
  // OpenRouter-specific configuration
  siteName?: string;
  appUrl?: string;
}

export interface GeminiConfig extends ProviderConfig {
  // Gemini-specific configuration
  projectId?: string;
  location?: string;
}

export interface OpenAIConfig extends ProviderConfig {
  // OpenAI-specific configuration
  organization?: string;
}

export interface QwenConfig extends ProviderConfig {
  // Qwen-specific configuration
  workspace?: string;
}

// Provider type
export type ProviderType = 'glm' | 'ernie' | 'hunyuan' | 'openrouter' | 'gemini' | 'openai' | 'qwen';

// Error types
export class LLMAdapterError extends Error {
  constructor(
    message: string,
    public provider: ProviderType,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'LLMAdapterError';
  }
}

// Stream event types
export interface StreamEvent {
  type: 'content' | 'done' | 'error';
  content?: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call' | 'tool_calls';
  error?: string;
}

// Provider priority order
export const PROVIDER_PRIORITY: ProviderType[] = [
  'glm',
  'ernie',
  'hunyuan',
  'openrouter',
  'gemini',
  'openai',
  'qwen'
];