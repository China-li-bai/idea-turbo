export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  STORAGE = 'storage',
  AI = 'ai',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface AppError {
  id: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: number;
  context?: string;
  originalError?: Error;
  stack?: string;
}

interface ErrorListener {
  (error: AppError): void;
}

class ErrorHandlerClass {
  private static instance: ErrorHandlerClass;
  private listeners: Set<ErrorListener> = new Set();
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ErrorHandlerClass {
    if (!ErrorHandlerClass.instance) {
      ErrorHandlerClass.instance = new ErrorHandlerClass();
    }
    return ErrorHandlerClass.instance;
  }

  handle(
    error: Error | string,
    context?: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.UNKNOWN
  ): AppError {
    const appError = this.createAppError(error, context, severity, category);
    
    this.errorHistory.unshift(appError);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop();
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context || 'App'}]`, error);
      if (appError.stack) {
        console.error(appError.stack);
      }
    }

    this.notifyListeners(appError);

    return appError;
  }

  private createAppError(
    error: Error | string,
    context?: string,
    severity: ErrorSeverity,
    category: ErrorCategory
  ): AppError {
    const originalError = typeof error === 'string' ? new Error(error) : error;
    
    return {
      id: this.generateErrorId(),
      message: originalError.message,
      userMessage: this.getUserFriendlyMessage(originalError, category),
      severity,
      category,
      timestamp: Date.now(),
      context,
      originalError,
      stack: originalError.stack
    };
  }

  private getUserFriendlyMessage(error: Error, category: ErrorCategory): string {
    const errorMessages: Record<string, Record<string, string>> = {
      [ErrorCategory.NETWORK]: {
        'NetworkError': '网络连接失败，请检查网络设置',
        'Failed to fetch': '无法连接到服务器，请稍后重试',
        'default': '网络请求失败，请检查网络连接'
      },
      [ErrorCategory.STORAGE]: {
        'QuotaExceededError': '存储空间不足，请清理浏览器缓存',
        'NotFoundError': '数据未找到，可能已被删除',
        'default': '数据存储失败，请稍后重试'
      },
      [ErrorCategory.AI]: {
        'Model not loaded': 'AI 模型加载失败，请刷新页面重试',
        'API key invalid': 'API 密钥无效，请检查配置',
        'Rate limit exceeded': '请求过于频繁，请稍后重试',
        'default': 'AI 处理失败，请稍后重试'
      },
      [ErrorCategory.VALIDATION]: {
        'default': '输入数据格式不正确，请检查后重试'
      },
      [ErrorCategory.PERMISSION]: {
        'Permission denied': '权限不足，无法执行此操作',
        'default': '权限验证失败'
      },
      [ErrorCategory.UNKNOWN]: {
        'default': '操作失败，请稍后重试'
      }
    };

    const categoryMessages = errorMessages[category] || errorMessages[ErrorCategory.UNKNOWN];
    
    for (const [key, message] of Object.entries(categoryMessages)) {
      if (error.message.includes(key) || error.name.includes(key)) {
        return message;
      }
    }
    
    return categoryMessages.default;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(error: AppError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  createErrorBoundary(error: Error, errorInfo: React.ErrorInfo): AppError {
    return this.handle(
      error,
      `ErrorBoundary: ${errorInfo.componentStack}`,
      ErrorSeverity.HIGH,
      ErrorCategory.UNKNOWN
    );
  }
}

export const ErrorHandler = ErrorHandlerClass.getInstance();

export function handleError(
  error: Error | string,
  context?: string,
  severity?: ErrorSeverity,
  category?: ErrorCategory
): AppError {
  return ErrorHandler.handle(error, context, severity, category);
}
