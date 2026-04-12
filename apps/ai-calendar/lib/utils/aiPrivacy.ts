import { privacySanitizer } from './privacy';
import type { UnifiedCalendarItem } from '@/types/unified';

export interface SanitizedEvent {
  id: string;
  title: string;
  startTime: number | null;
  endTime: number | null;
  location?: string;
}

export interface PrivacyCheckResult {
  canSend: boolean;
  warnings: string[];
  sanitizedData?: any;
}

export class AIPrivacyMiddleware {
  private static instance: AIPrivacyMiddleware;
  private enabled: boolean = true;
  private confirmBeforeSend: boolean = true;

  static getInstance(): AIPrivacyMiddleware {
    if (!AIPrivacyMiddleware.instance) {
      AIPrivacyMiddleware.instance = new AIPrivacyMiddleware();
    }
    return AIPrivacyMiddleware.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setConfirmBeforeSend(confirm: boolean): void {
    this.confirmBeforeSend = confirm;
  }

  sanitizeInput(input: string, context: string = 'general'): string {
    if (!this.enabled) return input;

    let result = input;

    result = result.replace(/\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{1,4}\b/g, '[银行卡号]');
    result = result.replace(/\b\d{16,19}\b/g, '[银行卡号]');
    result = result.replace(/\b\d{17}[\dXx]\b/gi, '[身份证号]');
    result = result.replace(/\b1[3-9]\d{9}\b/g, '[手机号]');
    result = result.replace(/\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/g, '[邮箱]');
    result = result.replace(/密码|口令|token|secret|key/gi, '[敏感信息]');

    return result;
  }

  sanitizeEvent(item: UnifiedCalendarItem): SanitizedEvent {
    const sanitized: SanitizedEvent = {
      id: item.id,
      title: this.sanitizeTitle(item.title),
      startTime: item.startTime,
      endTime: item.endTime,
    };

    if (item.metadata.location) {
      sanitized.location = this.sanitizeLocation(item.metadata.location);
    }

    return sanitized;
  }

  sanitizeEvents(items: UnifiedCalendarItem[]): SanitizedEvent[] {
    return items.map(item => this.sanitizeEvent(item));
  }

  sanitizeTitle(title: string): string {
    const sensitiveKeywords = [
      '密码', '口令', 'token', 'secret', 'key', '密码',
      '银行卡', '信用卡', '账号', '账户',
    ];

    let sanitized = title;
    for (const keyword of sensitiveKeywords) {
      if (sanitized.toLowerCase().includes(keyword.toLowerCase())) {
        sanitized = sanitized.replace(
          new RegExp(keyword, 'gi'),
          '[敏感信息]'
        );
      }
    }

    return sanitized;
  }

  sanitizeLocation(location: string): string {
    const detailedAddressPattern = /[\u4e00-\u9fa5]+(?:省|市)[\u4e00-\u9fa5]+(?:市|区|县)[\u4e00-\u9fa5]+(?:路|街|道)\d+号/;
    if (detailedAddressPattern.test(location)) {
      return location.replace(/\d+号.*$/, '[详细地址已隐藏]');
    }

    return location;
  }

  checkPrivacyRisk(data: any, context: string): PrivacyCheckResult {
    const warnings: string[] = [];
    let canSend = true;

    if (typeof data === 'string') {
      if (/\b1[3-9]\d{9}\b/.test(data)) {
        warnings.push('检测到手机号');
        canSend = false;
      }
      if (/\b\d{17}[\dXx]\b/i.test(data)) {
        warnings.push('检测到身份证号');
        canSend = false;
      }
      if (/\b[\w.-]+@[\w.-]+\.\w+\b/.test(data)) {
        warnings.push('检测到邮箱地址');
      }
      if (/\b\d{16,19}\b/.test(data) || /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/.test(data)) {
        warnings.push('检测到银行卡号');
        canSend = false;
      }
    }

    return {
      canSend,
      warnings,
      sanitizedData: typeof data === 'string' ? this.sanitizeInput(data, context) : data,
    };
  }

  createSafePrompt(originalPrompt: string, data?: any): string {
    let safePrompt = this.sanitizeInput(originalPrompt);

    if (data) {
      if (Array.isArray(data)) {
        safePrompt += '\n\n相关数据：\n' + JSON.stringify(
          data.map(item => 
            'startTime' in item ? this.sanitizeEvent(item as UnifiedCalendarItem) : item
          ),
          null,
          2
        );
      } else if (typeof data === 'object') {
        safePrompt += '\n\n相关数据：\n' + JSON.stringify(
          'startTime' in data ? this.sanitizeEvent(data as UnifiedCalendarItem) : data,
          null,
          2
        );
      }
    }

    return safePrompt;
  }

  getPrivacySettings() {
    return {
      enabled: this.enabled,
      confirmBeforeSend: this.confirmBeforeSend,
    };
  }
}

export const aiPrivacyMiddleware = AIPrivacyMiddleware.getInstance();
