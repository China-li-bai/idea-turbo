import { BaseLLMAdapter } from './base-adapter';
import { 
  LLMRequest, 
  LLMResponse, 
  StreamEvent,
  ProviderConfig,
  ProviderType
} from './types';
import { FailoverProcessor, FailoverOptions } from './failover-processor';
import { ConfigManager } from './config-manager';

/**
 * LLM Adapter Manager
 * Manages multiple LLM adapters with failover support
 */
export class LLMAdapterManager {
  private failoverProcessor: FailoverProcessor;
  private configManager: ConfigManager;

  constructor() {
    this.failoverProcessor = new FailoverProcessor();
    this.configManager = new ConfigManager();
  }

  /**
   * Initialize adapters from configurations
   */
  initialize(configs: Record<ProviderType, ProviderConfig>): void {
    for (const [providerType, config] of Object.entries(configs)) {
      this.configManager.setConfig(providerType as ProviderType, config);
      this.failoverProcessor.createAdapter(providerType as ProviderType, config);
    }
  }

  /**
   * Add or update a provider configuration
   */
  addProvider(providerType: ProviderType, config: ProviderConfig): void {
    this.configManager.setConfig(providerType, config);
    this.failoverProcessor.createAdapter(providerType, config);
  }

  /**
   * Remove a provider
   */
  removeProvider(providerType: ProviderType): void {
    this.configManager.removeConfig(providerType);
    // Note: We don't remove the adapter from the failover processor
    // as it might be used in ongoing operations
  }

  /**
   * Get a specific adapter
   */
  getAdapter(providerType: ProviderType): BaseLLMAdapter | undefined {
    return this.failoverProcessor.getAdapter(providerType);
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): ProviderType[] {
    return this.configManager.getConfiguredProviders();
  }

  /**
   * Execute a request with failover support
   */
  async complete(
    request: LLMRequest,
    options: FailoverOptions & { primaryProvider?: ProviderType } = {}
  ): Promise<LLMResponse> {
    const { primaryProvider, ...failoverOptions } = options;
    
    // If no primary provider is specified, use the first configured provider
    const provider = primaryProvider || this.configManager.getConfiguredProviders()[0];
    if (!provider) {
      throw new Error('No provider configured');
    }

    // If no fallback providers are specified, use all other configured providers
    const fallbackProviders = failoverOptions.fallbackProviders || 
      this.configManager.getConfiguredProviders().filter(p => p !== provider);

    return this.failoverProcessor.executeWithFailover(
      provider,
      request,
      { ...failoverOptions, fallbackProviders }
    );
  }

  /**
   * Execute a streaming request with failover support
   */
  async *stream(
    request: LLMRequest,
    options: FailoverOptions & { primaryProvider?: ProviderType } = {}
  ): AsyncGenerator<StreamEvent> {
    const { primaryProvider, ...failoverOptions } = options;
    
    // If no primary provider is specified, use the first configured provider
    const provider = primaryProvider || this.configManager.getConfiguredProviders()[0];
    if (!provider) {
      throw new Error('No provider configured');
    }

    // If no fallback providers are specified, use all other configured providers
    const fallbackProviders = failoverOptions.fallbackProviders || 
      this.configManager.getConfiguredProviders().filter(p => p !== provider);

    yield* this.failoverProcessor.executeStreamWithFailover(
      provider,
      request,
      { ...failoverOptions, fallbackProviders }
    );
  }

  /**
   * Load configurations from environment variables
   */
  loadFromEnvironment(prefix?: string): void {
    this.configManager.loadFromEnvironment({ prefix });
    
    // Create adapters for loaded configurations
    for (const providerType of this.configManager.getConfiguredProviders()) {
      const config = this.configManager.getConfig(providerType);
      if (config) {
        this.failoverProcessor.createAdapter(providerType, config);
      }
    }
  }

  /**
   * Validate all configurations
   */
  validateConfigs(): Record<ProviderType, boolean> {
    return this.configManager.validateAllConfigs();
  }
}