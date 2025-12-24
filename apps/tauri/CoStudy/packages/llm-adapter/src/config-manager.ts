import { ProviderType, ProviderConfig as OldProviderConfig } from './types';
import { ConfigProviderConfig, ManagerConfig, EnvConfig, ConfigValidationResult } from './config-types';

/**
 * Configuration Manager for LLM adapters
 * Handles loading, validation, and management of provider configurations
 */
export class ConfigManager {
  private configs: Map<ProviderType, ConfigProviderConfig> = new Map();
  private defaultProvider?: ProviderType;

  /**
   * Set configuration for a specific provider
   */
  setConfig(providerType: ProviderType, config: ConfigProviderConfig): void {
    // Validate configuration
    const validation = this.validateConfig(providerType, config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration for ${providerType}: ${validation.errors.join(', ')}`);
    }

    this.configs.set(providerType, config);
    
    // Set as default if no default is set
    if (!this.defaultProvider) {
      this.defaultProvider = providerType;
    }
  }

  /**
   * Get configuration for a specific provider
   */
  getConfig(providerType: ProviderType): ConfigProviderConfig | undefined {
    return this.configs.get(providerType);
  }

  /**
   * Remove configuration for a specific provider
   */
  removeConfig(providerType: ProviderType): void {
    this.configs.delete(providerType);
    
    // Update default provider if necessary
    if (this.defaultProvider === providerType) {
      this.defaultProvider = this.configs.keys().next().value;
    }
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): ProviderType[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(providerType: ProviderType): void {
    if (!this.configs.has(providerType)) {
      throw new Error(`Provider ${providerType} is not configured`);
    }
    this.defaultProvider = providerType;
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): ProviderType | undefined {
    return this.defaultProvider;
  }

  /**
   * Load configurations from environment variables
   */
  loadFromEnvironment(envConfig: EnvConfig = {}): void {
    const prefix = envConfig.prefix || 'LLM_';
    const providers = envConfig.providers || ['glm', 'ernie', 'hunyuan', 'openrouter', 'gemini'] as ProviderType[];
    
    for (const providerType of providers) {
      const envConfig = this.loadProviderFromEnv(providerType, prefix);
      if (envConfig) {
        this.setConfig(providerType, envConfig);
      }
    }
  }

  /**
   * Load configuration for a specific provider from environment variables
   */
  private loadProviderFromEnv(providerType: ProviderType, prefix: string): ConfigProviderConfig | null {
    const upperProvider = providerType.toUpperCase();
    const apiKey = process.env[`${prefix}${upperProvider}_API_KEY`];
    
    if (!apiKey) {
      return null;
    }

    const config: ConfigProviderConfig = {
      apiKey,
      baseURL: process.env[`${prefix}${upperProvider}_BASE_URL`],
      timeout: 30000,
      retryCount: process.env[`${prefix}${upperProvider}_RETRY_COUNT`] 
        ? parseInt(process.env[`${prefix}${upperProvider}_RETRY_COUNT`]!, 10) 
        : 2,
      retryDelay: process.env[`${prefix}${upperProvider}_RETRY_DELAY`] 
        ? parseInt(process.env[`${prefix}${upperProvider}_RETRY_DELAY`]!, 10) 
        : undefined,
      model: process.env[`${prefix}${upperProvider}_MODEL`],
    };

    // Provider-specific environment variables
    if (providerType === 'ernie') {
      config.secretKey = process.env[`${prefix}${upperProvider}_SECRET_KEY`];
      config.accessToken = process.env[`${prefix}${upperProvider}_ACCESS_TOKEN`];
    } else if (providerType === 'hunyuan') {
      config.secretId = process.env[`${prefix}${upperProvider}_SECRET_ID`];
      config.secretKey = process.env[`${prefix}${upperProvider}_SECRET_KEY`];
    } else if (providerType === 'openrouter') {
      config.siteName = process.env[`${prefix}${upperProvider}_SITE_NAME`];
      config.appUrl = process.env[`${prefix}${upperProvider}_APP_URL`];
    } else if (providerType === 'gemini') {
      config.projectId = process.env[`${prefix}${upperProvider}_PROJECT_ID`];
      config.location = process.env[`${prefix}${upperProvider}_LOCATION`];
    }

    return config;
  }

  /**
   * Validate configuration for a specific provider
   */
  validateConfig(providerType: ProviderType, config: ConfigProviderConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Base validation
    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      warnings.push('Timeout should be between 1000ms and 300000ms');
    }

    if (config.retryCount && (config.retryCount < 0 || config.retryCount > 10)) {
      warnings.push('Retry count should be between 0 and 10');
    }

    if (config.retryDelay && (config.retryDelay < 100 || config.retryDelay > 60000)) {
      warnings.push('Retry delay should be between 100ms and 60000ms');
    }

    // Provider-specific validation
    if (providerType === 'ernie' && !config.accessToken && !config.secretKey) {
      errors.push('ERNIE requires either accessToken or secretKey');
    }

    if (providerType === 'hunyuan' && (!config.secretId || !config.secretKey)) {
      errors.push('Hunyuan requires both secretId and secretKey');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate all configurations
   */
  validateAllConfigs(): Record<ProviderType, boolean> {
    const results: Record<ProviderType, boolean> = {} as Record<ProviderType, boolean>;
    
    for (const [providerType, config] of this.configs.entries()) {
      const validation = this.validateConfig(providerType, config);
      results[providerType] = validation.isValid;
    }
    
    return results;
  }

  /**
   * Convert old configuration format to new format
   */
  convertOldConfig(_providerType: ProviderType, oldConfig: OldProviderConfig): ConfigProviderConfig {
    // For most cases, the old config is already compatible
    return { ...oldConfig } as ConfigProviderConfig;
  }

  /**
   * Create a manager configuration from current configurations
   */
  createManagerConfig(): ManagerConfig {
    const providers: Record<ProviderType, ConfigProviderConfig> = {} as Record<ProviderType, ConfigProviderConfig>;
    
    for (const [providerType, config] of this.configs.entries()) {
      providers[providerType] = config;
    }
    
    return {
      providers,
      defaultProvider: this.defaultProvider,
      fallbackEnabled: true
    };
  }
}