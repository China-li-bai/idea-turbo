/**
 * Simplified configuration types for LLM adapter
 * This file defines unified configuration interfaces for all LLM providers
 */

import { ProviderType } from './types';

// Base configuration interface that all providers will use
export interface BaseConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryCount?: number;
  retryDelay?: number;
  model?: string; // Default model for the provider
}

// Extended configuration for specific providers
export interface ExtendedConfig extends BaseConfig {
  // ERNIE-specific
  secretKey?: string;
  accessToken?: string;
  
  // Hunyuan-specific
  secretId?: string;
  
  // OpenRouter-specific
  siteName?: string;
  appUrl?: string;
  
  // Gemini-specific
  projectId?: string;
  location?: string;
  
  // Additional provider-specific properties
  [key: string]: any;
}

// Unified configuration for all providers
export type ConfigProviderConfig = BaseConfig & Partial<ExtendedConfig>;

// Configuration for the adapter manager
export interface ManagerConfig {
  providers: Record<ProviderType, ConfigProviderConfig>;
  defaultProvider?: ProviderType;
  retryCount?: number;
  retryDelay?: number;
  fallbackEnabled?: boolean;
}

// Environment variable configuration
export interface EnvConfig {
  prefix?: string; // Prefix for environment variables, e.g., 'LLM_'
  providers?: ProviderType[]; // Providers to load from environment
}

// Configuration validation result
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}