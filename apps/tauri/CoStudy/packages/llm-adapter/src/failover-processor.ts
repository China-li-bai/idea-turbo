import { BaseLLMAdapter } from './base-adapter';
import { LLMRequest, LLMResponse, ProviderConfig, ProviderType } from './types';
import { AdapterFactory } from './adapter-factory';
import { 
  ErrorAnalyzer, 
  EnhancedLLMAdapterError, 
  ErrorCategory,
  ErrorInfo 
} from './error-handling';

/**
 * Failover options for request execution
 */
export interface FailoverOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackProviders?: ProviderType[];
  onFailover?: (from: ProviderType, to: ProviderType, errorInfo: ErrorInfo) => void;
}

/**
 * Failover Processor class
 * Handles failover logic between different providers
 */
export class FailoverProcessor {
  private adapters: Map<ProviderType, BaseLLMAdapter> = new Map();

  /**
   * Register an adapter for a provider
   * @param providerType The provider type
   * @param adapter The adapter instance
   */
  registerAdapter(providerType: ProviderType, adapter: BaseLLMAdapter): void {
    this.adapters.set(providerType, adapter);
  }

  /**
   * Create and register an adapter from configuration
   * @param providerType The provider type
   * @param config The configuration for the adapter
   */
  createAdapter(providerType: ProviderType, config: ProviderConfig): void {
    const adapter = AdapterFactory.createAdapter(providerType, config);
    this.registerAdapter(providerType, adapter);
  }

  /**
   * Get an adapter for a provider
   * @param providerType The provider type
   * @returns The adapter instance or undefined if not found
   */
  getAdapter(providerType: ProviderType): BaseLLMAdapter | undefined {
    return this.adapters.get(providerType);
  }

  /**
   * Execute a request with failover support
   * @param primaryProvider The primary provider to use
   * @param request The request to execute
   * @param options Failover options
   * @returns The response from the successful provider
   */
  async executeWithFailover(
    primaryProvider: ProviderType,
    request: LLMRequest,
    options: FailoverOptions = {}
  ): Promise<LLMResponse> {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      fallbackProviders = [],
      onFailover
    } = options;

    const providers = [primaryProvider, ...fallbackProviders];
    let lastErrorInfo: ErrorInfo;

    for (const provider of providers) {
      const adapter = this.getAdapter(provider);
      if (!adapter) {
        const error = new Error(`Adapter not found for provider: ${provider}`);
        lastErrorInfo = ErrorAnalyzer.analyzeError(provider, error);
        continue;
      }

      let retries = 0;
      while (retries <= maxRetries) {
        try {
          return await adapter.complete(request);
        } catch (error: any) {
          lastErrorInfo = ErrorAnalyzer.analyzeError(provider, error);
          retries++;
          
          // Skip retries for certain error types
          if (lastErrorInfo.category === ErrorCategory.AUTHENTICATION ||
              lastErrorInfo.category === ErrorCategory.VALIDATION) {
            break; // Don't retry these errors
          }
          
          if (retries <= maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      // If we get here, all retries failed for this provider
      if (onFailover && providers.indexOf(provider) < providers.length - 1) {
        const nextProvider = providers[providers.indexOf(provider) + 1];
        onFailover(provider, nextProvider, lastErrorInfo);
      }
    }

    // If we get here, all providers failed
    if (lastErrorInfo) {
      const lastProvider = providers[providers.length - 1];
      throw new EnhancedLLMAdapterError(
        lastProvider,
        lastErrorInfo,
        lastErrorInfo.statusCode,
        lastErrorInfo.originalError
      );
    }
    throw new Error('All providers failed');
  }

  /**
   * Execute a streaming request with failover support
   * @param primaryProvider The primary provider to use
   * @param request The request to execute
   * @param options Failover options
   * @returns An async generator that yields stream events
   */
  async *executeStreamWithFailover(
    primaryProvider: ProviderType,
    request: LLMRequest,
    options: FailoverOptions = {}
  ): AsyncGenerator<any> {
    const {
      maxRetries = 2,
      retryDelay = 1000,
      fallbackProviders = [],
      onFailover
    } = options;

    const providers = [primaryProvider, ...fallbackProviders];
    let lastErrorInfo: ErrorInfo;

    for (const provider of providers) {
      const adapter = this.getAdapter(provider);
      if (!adapter) {
        const error = new Error(`Adapter not found for provider: ${provider}`);
        lastErrorInfo = ErrorAnalyzer.analyzeError(provider, error);
        continue;
      }

      let retries = 0;
      while (retries <= maxRetries) {
        try {
          yield* adapter.stream(request);
          return; // If the stream completes successfully, exit
        } catch (error: any) {
          lastErrorInfo = ErrorAnalyzer.analyzeError(provider, error);
          retries++;
          
          // Skip retries for certain error types
          if (lastErrorInfo.category === ErrorCategory.AUTHENTICATION ||
              lastErrorInfo.category === ErrorCategory.VALIDATION) {
            break; // Don't retry these errors
          }
          
          if (retries <= maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      // If we get here, all retries failed for this provider
      if (onFailover && providers.indexOf(provider) < providers.length - 1) {
        const nextProvider = providers[providers.indexOf(provider) + 1];
        onFailover(provider, nextProvider, lastErrorInfo);
      }
    }

    // If we get here, all providers failed
    if (lastErrorInfo) {
      const lastProvider = providers[providers.length - 1];
      throw new EnhancedLLMAdapterError(
        lastProvider,
        lastErrorInfo,
        lastErrorInfo.statusCode,
        lastErrorInfo.originalError
      );
    }
    throw new Error('All providers failed');
  }
}