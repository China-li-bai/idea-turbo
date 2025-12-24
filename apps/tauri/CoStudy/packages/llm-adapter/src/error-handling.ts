import { ProviderType } from './types';

/**
 * Enhanced error types for LLM adapter
 * Provides detailed error information and recovery suggestions
 */

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PROVIDER_ERROR = 'provider_error',
  UNKNOWN = 'unknown'
}

// Recovery actions
export enum RecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  REAUTHENTICATE = 'reauthenticate',
  ADJUST_REQUEST = 'adjust_request',
  CONTACT_SUPPORT = 'contact_support',
  NONE = 'none'
}

// Enhanced error information
export interface ErrorInfo {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  suggestedAction: RecoveryAction;
  retryAfter?: number; // Seconds to wait before retrying
  details?: Record<string, any>;
}

// Error recovery suggestions
export interface RecoverySuggestion {
  action: RecoveryAction;
  description: string;
  parameters?: Record<string, any>;
}

/**
 * Enhanced LLM Adapter Error
 * Provides detailed error information and recovery suggestions
 */
export class EnhancedLLMAdapterError extends Error {
  public readonly provider: ProviderType;
  public readonly statusCode?: number;
  public readonly originalError?: any;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly suggestedAction: RecoveryAction;
  public readonly retryAfter?: number;
  public readonly details?: Record<string, any>;
  public readonly timestamp: number;

  constructor(
    provider: ProviderType,
    errorInfo: ErrorInfo,
    statusCode?: number,
    originalError?: any
  ) {
    super(errorInfo.message);
    this.name = 'EnhancedLLMAdapterError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.category = errorInfo.category;
    this.severity = errorInfo.severity;
    this.suggestedAction = errorInfo.suggestedAction;
    this.retryAfter = errorInfo.retryAfter;
    this.details = errorInfo.details;
    this.timestamp = Date.now();
  }

  /**
   * Get recovery suggestions for this error
   */
  getRecoverySuggestions(): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];

    switch (this.category) {
      case ErrorCategory.AUTHENTICATION:
        suggestions.push({
          action: RecoveryAction.REAUTHENTICATE,
          description: 'Check your API key and authentication credentials'
        });
        suggestions.push({
          action: RecoveryAction.FALLBACK,
          description: 'Try using a different provider if available'
        });
        break;

      case ErrorCategory.RATE_LIMIT:
        suggestions.push({
          action: RecoveryAction.RETRY,
          description: `Retry after ${this.retryAfter || 60} seconds`,
          parameters: { retryAfter: this.retryAfter || 60 }
        });
        suggestions.push({
          action: RecoveryAction.FALLBACK,
          description: 'Try using a different provider if available'
        });
        break;

      case ErrorCategory.NETWORK:
        suggestions.push({
          action: RecoveryAction.RETRY,
          description: 'Retry the request after a short delay'
        });
        suggestions.push({
          action: RecoveryAction.FALLBACK,
          description: 'Try using a different provider if available'
        });
        break;

      case ErrorCategory.VALIDATION:
        suggestions.push({
          action: RecoveryAction.ADJUST_REQUEST,
          description: 'Check and adjust your request parameters'
        });
        break;

      case ErrorCategory.PROVIDER_ERROR:
        suggestions.push({
          action: RecoveryAction.FALLBACK,
          description: 'Try using a different provider if available'
        });
        if (this.severity === ErrorSeverity.HIGH || this.severity === ErrorSeverity.CRITICAL) {
          suggestions.push({
            action: RecoveryAction.CONTACT_SUPPORT,
            description: 'Contact the provider support team'
          });
        }
        break;

      case ErrorCategory.UNKNOWN:
        suggestions.push({
          action: RecoveryAction.RETRY,
          description: 'Retry the request as this might be a temporary issue'
        });
        suggestions.push({
          action: RecoveryAction.FALLBACK,
          description: 'Try using a different provider if available'
        });
        break;
    }

    return suggestions;
  }

  /**
   * Check if this error is recoverable
   */
  isRecoverable(): boolean {
    return this.suggestedAction !== RecoveryAction.NONE && 
           this.suggestedAction !== RecoveryAction.CONTACT_SUPPORT;
  }

  /**
   * Get a user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.category) {
      case ErrorCategory.AUTHENTICATION:
        return `Authentication failed for ${this.provider}. Please check your API key.`;
      case ErrorCategory.RATE_LIMIT:
        return `Rate limit exceeded for ${this.provider}. Please try again later.`;
      case ErrorCategory.NETWORK:
        return `Network error occurred while connecting to ${this.provider}. Please check your connection.`;
      case ErrorCategory.VALIDATION:
        return `Invalid request parameters for ${this.provider}. Please check your request.`;
      case ErrorCategory.PROVIDER_ERROR:
        return `An error occurred on the ${this.provider} side. Please try again later.`;
      default:
        return `An unknown error occurred with ${this.provider}.`;
    }
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      provider: this.provider,
      statusCode: this.statusCode,
      category: this.category,
      severity: this.severity,
      suggestedAction: this.suggestedAction,
      retryAfter: this.retryAfter,
      details: this.details,
      timestamp: this.timestamp,
      userFriendlyMessage: this.getUserFriendlyMessage(),
      recoverySuggestions: this.getRecoverySuggestions(),
      isRecoverable: this.isRecoverable()
    };
  }
}

/**
 * Error analyzer for categorizing errors
 */
export class ErrorAnalyzer {
  /**
   * Analyze an error and return error information
   */
  static analyzeError(
    _provider: ProviderType,
    error: any,
    statusCode?: number
  ): ErrorInfo {
    // If it's already an EnhancedLLMAdapterError, return its info
    if (error instanceof EnhancedLLMAdapterError) {
      return {
        message: error.message,
        category: error.category,
        severity: error.severity,
        suggestedAction: error.suggestedAction,
        retryAfter: error.retryAfter,
        details: error.details
      };
    }

    // Extract error message
    const message = error?.message || String(error);

    // Analyze based on status code
    if (statusCode) {
      if (statusCode === 401 || statusCode === 403) {
        return {
          message,
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.HIGH,
          suggestedAction: RecoveryAction.REAUTHENTICATE
        };
      }

      if (statusCode === 429) {
        const retryAfter = this.extractRetryAfter(error);
        return {
          message,
          category: ErrorCategory.RATE_LIMIT,
          severity: ErrorSeverity.MEDIUM,
          suggestedAction: RecoveryAction.RETRY,
          retryAfter
        };
      }

      if (statusCode >= 400 && statusCode < 500) {
        return {
          message,
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          suggestedAction: RecoveryAction.ADJUST_REQUEST
        };
      }

      if (statusCode >= 500) {
        return {
          message,
          category: ErrorCategory.PROVIDER_ERROR,
          severity: ErrorSeverity.HIGH,
          suggestedAction: RecoveryAction.FALLBACK
        };
      }
    }

    // Analyze based on error message
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('network') || 
        lowerMessage.includes('timeout') || 
        lowerMessage.includes('connection') ||
        lowerMessage.includes('fetch')) {
      return {
        message,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        suggestedAction: RecoveryAction.RETRY
      };
    }

    if (lowerMessage.includes('rate limit') || 
        lowerMessage.includes('too many requests')) {
      const retryAfter = this.extractRetryAfter(error);
      return {
        message,
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        suggestedAction: RecoveryAction.RETRY,
        retryAfter
      };
    }

    if (lowerMessage.includes('unauthorized') || 
        lowerMessage.includes('forbidden') ||
        lowerMessage.includes('authentication') ||
        lowerMessage.includes('api key')) {
      return {
        message,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        suggestedAction: RecoveryAction.REAUTHENTICATE
      };
    }

    if (lowerMessage.includes('validation') || 
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('bad request')) {
      return {
        message,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        suggestedAction: RecoveryAction.ADJUST_REQUEST
      };
    }

    // Default to unknown error
    return {
      message,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      suggestedAction: RecoveryAction.RETRY
    };
  }

  /**
   * Extract retry after value from error
   */
  private static extractRetryAfter(error: any): number | undefined {
    // Try to extract from headers
    if (error?.headers?.['retry-after']) {
      const value = parseInt(error.headers['retry-after'], 10);
      if (!isNaN(value)) {
        return value;
      }
    }

    // Try to extract from error message
    const message = error?.message || '';
    const match = message.match(/retry after (\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Default to 60 seconds for rate limit errors
    return 60;
  }
}