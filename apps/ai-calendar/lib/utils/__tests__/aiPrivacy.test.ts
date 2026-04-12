import { describe, it, expect, beforeEach } from 'vitest';
import { AIPrivacyMiddleware } from '../aiPrivacy';
import type { UnifiedCalendarItem } from '@/types/unified';

const createTestItem = (overrides: Partial<UnifiedCalendarItem> = {}): UnifiedCalendarItem => ({
  id: 'test-event',
  type: 'event',
  title: '测试事件',
  content: '测试内容',
  startTime: new Date('2024-03-15T10:00:00').getTime(),
  endTime: new Date('2024-03-15T11:00:00').getTime(),
  isAllDay: false,
  embedding: [],
  embeddingUpdatedAt: 0,
  status: 'scheduled',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {},
  ...overrides,
});

describe('AIPrivacyMiddleware', () => {
  let middleware: AIPrivacyMiddleware;

  beforeEach(() => {
    middleware = AIPrivacyMiddleware.getInstance();
    middleware.setEnabled(true);
  });

  describe('sanitizeInput', () => {
    it('应该检测并替换手机号', () => {
      const input = '我的手机号是13812345678，请记录';
      const result = middleware.sanitizeInput(input);
      expect(result).toContain('[手机号]');
      expect(result).not.toContain('13812345678');
    });

    it('应该检测并替换身份证号', () => {
      const input = '身份证号是11010119900101123X';
      const result = middleware.sanitizeInput(input);
      expect(result).toContain('[身份证号]');
      expect(result).not.toContain('11010119900101123X');
    });

    it('应该检测并替换邮箱', () => {
      const input = '联系邮箱：test@example.com';
      const result = middleware.sanitizeInput(input);
      expect(result).toContain('[邮箱]');
      expect(result).not.toContain('test@example.com');
    });

    it('应该检测并替换银行卡号', () => {
      const input = '银行卡号：6222021234567890123';
      const result = middleware.sanitizeInput(input);
      expect(result).toContain('[银行卡号]');
    });

    it('应该处理包含多种敏感信息的文本', () => {
      const input = '手机13812345678，邮箱test@example.com，身份证11010119900101123X';
      const result = middleware.sanitizeInput(input);
      expect(result).toContain('[手机号]');
      expect(result).toContain('[邮箱]');
      expect(result).toContain('[身份证号]');
    });

    it('应该保留不包含敏感信息的文本', () => {
      const input = '明天下午3点开会讨论项目进度';
      const result = middleware.sanitizeInput(input);
      expect(result).toBe(input);
    });

    it('禁用时应该返回原始输入', () => {
      middleware.setEnabled(false);
      const input = '手机13812345678';
      const result = middleware.sanitizeInput(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeEvent', () => {
    it('应该脱敏事件标题中的敏感信息', () => {
      const item = createTestItem({
        title: '密码修改会议',
      });
      
      const result = middleware.sanitizeEvent(item);
      expect(result.title).toContain('[敏感信息]');
    });

    it('应该脱敏详细地址', () => {
      const item = createTestItem({
        title: '客户会议',
        metadata: { location: '北京市朝阳区建国路88号SOHO现代城A座' },
      });
      
      const result = middleware.sanitizeEvent(item);
      expect(result.location).toContain('[详细地址已隐藏]');
    });

    it('应该保留简单地点信息', () => {
      const item = createTestItem({
        title: '团队会议',
        metadata: { location: '会议室A' },
      });
      
      const result = middleware.sanitizeEvent(item);
      expect(result.location).toBe('会议室A');
    });

    it('应该保留必要的事件信息', () => {
      const item = createTestItem({
        id: 'test-123',
        title: '项目讨论',
      });
      
      const result = middleware.sanitizeEvent(item);
      expect(result.id).toBe('test-123');
      expect(result.startTime).toEqual(item.startTime);
      expect(result.endTime).toEqual(item.endTime);
    });
  });

  describe('checkPrivacyRisk', () => {
    it('应该检测到手机号风险', () => {
      const result = middleware.checkPrivacyRisk('手机13812345678', 'nlp');
      expect(result.canSend).toBe(false);
      expect(result.warnings).toContain('检测到手机号');
    });

    it('应该检测到身份证号风险', () => {
      const result = middleware.checkPrivacyRisk('身份证110101199001011234', 'nlp');
      expect(result.canSend).toBe(false);
      expect(result.warnings).toContain('检测到身份证号');
    });

    it('应该检测到银行卡号风险', () => {
      const result = middleware.checkPrivacyRisk('银行卡6222021234567890123', 'nlp');
      expect(result.canSend).toBe(false);
      expect(result.warnings).toContain('检测到银行卡号');
    });

    it('应该检测到邮箱警告', () => {
      const result = middleware.checkPrivacyRisk('邮箱test@example.com', 'nlp');
      expect(result.warnings).toContain('检测到邮箱地址');
    });

    it('安全文本应该通过检查', () => {
      const result = middleware.checkPrivacyRisk('明天下午开会', 'nlp');
      expect(result.canSend).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('应该返回脱敏后的数据', () => {
      const result = middleware.checkPrivacyRisk('手机13812345678', 'nlp');
      expect(result.sanitizedData).toContain('[手机号]');
    });
  });

  describe('createSafePrompt', () => {
    it('应该创建安全的提示词', () => {
      const prompt = middleware.createSafePrompt('手机13812345678');
      expect(prompt).toContain('[手机号]');
    });

    it('应该正确处理事件数据', () => {
      const item = createTestItem({
        title: '密码重置会议',
      });
      
      const prompt = middleware.createSafePrompt('请分析这个事件', item);
      expect(prompt).toContain('请分析这个事件');
      expect(prompt).toContain('相关数据');
    });

    it('应该正确处理事件数组', () => {
      const items: UnifiedCalendarItem[] = [
        createTestItem({ id: 'test-1', title: '会议1' }),
        createTestItem({ id: 'test-2', title: '会议2' }),
      ];
      
      const prompt = middleware.createSafePrompt('请分析这些事件', items);
      expect(prompt).toContain('请分析这些事件');
      expect(prompt).toContain('会议1');
      expect(prompt).toContain('会议2');
    });
  });

  describe('getPrivacySettings', () => {
    it('应该返回当前隐私设置', () => {
      const settings = middleware.getPrivacySettings();
      expect(settings).toHaveProperty('enabled');
      expect(settings).toHaveProperty('confirmBeforeSend');
    });
  });
});
