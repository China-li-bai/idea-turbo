'use client';

import { Component, ReactNode } from 'react';
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '@/lib/utils/errorHandler';
import { useI18nStore } from '@/lib/stores/i18nStore';
import styles from './ErrorToast.module.scss';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

interface I18nText {
  'zh-CN': string;
  'en-US': string;
  [key: string]: string;
}

const txt = (obj: I18nText, locale: string) => obj[locale] || obj['zh-CN'];

export class GlobalErrorBoundary extends Component<Props, State> {
  locale: string = 'zh-CN';

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
    
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('ai-calendar-i18n');
      if (storedLocale) {
        try {
          const parsed = JSON.parse(storedLocale);
          this.locale = parsed.state?.locale || 'zh-CN';
        } catch {
          this.locale = 'zh-CN';
        }
      }
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorId: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = ErrorHandler.createErrorBoundary(error, errorInfo);
    this.setState({ errorId: appError.id });
  }

  get i18n() {
    return {
      title: txt({ 
        'zh-CN': '出现了一些问题', 
        'en-US': 'Something went wrong' 
      }, this.locale),
      message: txt({ 
        'zh-CN': '应用遇到了一个错误，我们正在努力修复。', 
        'en-US': 'The application encountered an error. We\'re working on fixing it.' 
      }, this.locale),
      errorDetails: txt({ 
        'zh-CN': '错误详情', 
        'en-US': 'Error Details' 
      }, this.locale),
      retry: txt({ 'zh-CN': '重试', 'en-US': 'Retry' }, this.locale),
      reload: txt({ 'zh-CN': '刷新页面', 'en-US': 'Reload Page' }, this.locale),
      tryThese: txt({ 
        'zh-CN': '您可以尝试以下操作：', 
        'en-US': 'You can try the following:' 
      }, this.locale),
      refreshPage: txt({ 
        'zh-CN': '🔄 刷新页面', 
        'en-US': '🔄 Refresh the page' 
      }, this.locale),
      clearCache: txt({ 
        'zh-CN': '🗑️ 清除浏览器缓存', 
        'en-US': '🗑️ Clear browser cache' 
      }, this.locale),
      contactSupport: txt({ 
        'zh-CN': '📞 联系技术支持', 
        'en-US': '📞 Contact support' 
      }, this.locale),
      reportIssue: txt({ 
        'zh-CN': '📋 报告此问题', 
        'en-US': '📋 Report this issue' 
      }, this.locale),
      ariaLabel: txt({ 
        'zh-CN': '错误边界', 
        'en-US': 'Error Boundary' 
      }, this.locale)
    };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className={styles.errorBoundary}
          role="alertdialog"
          aria-modal="true"
          aria-label={this.i18n.ariaLabel}
          aria-describedby="error-description"
        >
          <div className={styles.errorContent}>
            <div className={styles.errorIcon} aria-hidden="true">⚠️</div>
            <h2 className={styles.errorTitle}>{this.i18n.title}</h2>
            <p id="error-description" className={styles.errorMessage}>
              {this.i18n.message}
            </p>
            
            <div className={styles.errorSuggestions}>
              <p>{this.i18n.tryThese}</p>
              <ul>
                <li>{this.i18n.refreshPage}</li>
                <li>{this.i18n.clearCache}</li>
                <li>{this.i18n.contactSupport}</li>
              </ul>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>{this.i18n.errorDetails}</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            
            <div className={styles.errorActions}>
              <button 
                onClick={this.handleRetry} 
                className={styles.retryButton}
                aria-label={this.i18n.retry}
              >
                {this.i18n.retry}
              </button>
              <button 
                onClick={this.handleReload} 
                className={styles.reloadButton}
                aria-label={this.i18n.reload}
              >
                {this.i18n.reload}
              </button>
            </div>

            <button 
              className={styles.reportBtn}
              onClick={() => {
                window.open('mailto:support@privlocal.com?subject=Error Report', '_blank');
              }}
              aria-label={this.i18n.reportIssue}
            >
              {this.i18n.reportIssue}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
