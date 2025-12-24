import { 
  LLMRequest, 
  LLMResponse, 
  StreamEvent, 
  ProviderConfig, 
  LLMAdapterError,
  ProviderType 
} from './types';
import { ProviderTransformer } from './transformer';
import { StreamProcessor } from './stream-processor';
import { 
  EnhancedLLMAdapterError, 
  ErrorAnalyzer,
} from './error-handling';
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Simple EventEmitter implementation for browser compatibility
class SimpleEventEmitter {
  private listeners: Record<string, Function[]> = {};

  on(event: string, listener: Function): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.listeners[event]) {
      return false;
    }
    this.listeners[event].forEach(listener => {
      listener(...args);
    });
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
    return this;
  }
}

// Use Node.js EventEmitter if available, otherwise use our simple implementation
let EventEmitter: any;
try {
  EventEmitter = require('events').EventEmitter;
} catch (e) {
  EventEmitter = SimpleEventEmitter;
}

/**
 * Abstract base class for all LLM providers
 * Implements the common functionality and defines the interface for specific providers
 */
export abstract class BaseLLMAdapter extends EventEmitter {
  protected client: AxiosInstance;
  protected config: ProviderConfig;
  protected providerType: ProviderType;
  protected transformer: ProviderTransformer;

  constructor(providerType: ProviderType, config: ProviderConfig, transformer: ProviderTransformer) {
    super();
    this.providerType = providerType;
    this.config = config;
    this.transformer = transformer;
    
    // Initialize axios client with common configuration
    this.client = axios.create({
      baseURL: config.baseURL || transformer.getDefaultBaseURL(),
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Request interceptor for common logic
    this.client.interceptors.request.use(
      (config) => this.onRequest(config),
      (error) => Promise.reject(error)
    );

    // Response interceptor for common error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.onError(error)
    );
  }

  /**
   * Request interceptor - adds authentication headers
   */
  protected onRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    // Add authentication headers
    const authHeaders = this.transformer.getAuthHeaders(this.config);
    Object.keys(authHeaders).forEach(key => {
      config.headers.set(key, authHeaders[key]);
    });
    return config;
  }

  /**
   * Response error handler - standardizes error format using enhanced error handling
   */
  protected onError(error: any): Promise<never> {
    const status = error.response?.status;
    const errorInfo = ErrorAnalyzer.analyzeError(this.providerType, error, status);
    
    throw new EnhancedLLMAdapterError(
      this.providerType,
      errorInfo,
      status,
      error
    );
  }

  /**
   * Execute a non-streaming completion request
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const providerRequest = this.transformer.transformRequest(request);
      const endpointPath = this.transformer.getEndpointPath();
      const response = await this.client.post(endpointPath, providerRequest);
      return this.transformer.transformResponse(response.data);
    } catch (error: any) {
      if (error instanceof EnhancedLLMAdapterError || error instanceof LLMAdapterError) {
        throw error;
      }
      
      const errorInfo = ErrorAnalyzer.analyzeError(this.providerType, error);
      throw new EnhancedLLMAdapterError(
        this.providerType,
        errorInfo,
        undefined,
        error
      );
    }
  }

  /**
   * Execute a streaming completion request
   */
  async *stream(request: LLMRequest): AsyncGenerator<StreamEvent> {
    try {
      const providerRequest = this.transformer.transformRequest({ ...request, stream: true });
      const endpointPath = this.transformer.getEndpointPath();
      const response = await this.client.post(endpointPath, providerRequest, {
        responseType: 'stream',
      });

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          let parsedData: any;
          
          // Handle different streaming formats
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              parsedData = JSON.parse(data);
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          } else if (line.startsWith('{')) {
            // Some providers send raw JSON lines
            try {
              parsedData = JSON.parse(line);
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          } else {
            // Skip non-JSON lines
            continue;
          }
          
          // Use the unified stream processor
          const event = StreamProcessor.process(parsedData, this.providerType);
          if (event) {
            yield event;
            
            // Stop processing if we encounter an error or completion
            if (event.type === 'error' || event.type === 'done') {
              return;
            }
          }
        }
      }
    } catch (error: any) {
      if (error instanceof EnhancedLLMAdapterError || error instanceof LLMAdapterError) {
        throw error;
      }
      
      const errorInfo = ErrorAnalyzer.analyzeError(this.providerType, error);
      throw new EnhancedLLMAdapterError(
        this.providerType,
        errorInfo,
        undefined,
        error
      );
    }
  }

  /**
   * Get the provider type
   */
  getProviderType(): ProviderType {
    return this.providerType;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update axios client configuration
    if (config.baseURL) {
      this.client.defaults.baseURL = config.baseURL;
    }
    if (config.timeout) {
      this.client.defaults.timeout = config.timeout;
    }
    if (config.headers) {
      Object.keys(config.headers).forEach(key => {
        this.client.defaults.headers.common[key] = config.headers![key];
      });
    }
  }
}