import { describe, it, expect, beforeEach } from 'vitest';
import { parseNaturalLanguage, formatTimeRange, formatRelativeDate, toTimestamp, fromTimestamp } from '../nlpParserLegacy';

describe('nlpParserLegacy - NLP 时间解析', () => {
  describe('parseNaturalLanguage - 中文时间解析', () => {
    describe('相对时间表达式', () => {
      it('应该解析"今天晚上12点"', async () => {
        const result = await parseNaturalLanguage('今天晚上12点睡觉', 'zh-CN');
        expect(result.date).toBeDefined();
        expect(result.time).toBe('00:00');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('应该解析"明天下午3点"', async () => {
        const result = await parseNaturalLanguage('明天下午3点开会', 'zh-CN');
        expect(result.date).toBeDefined();
        expect(result.time).toBe('15:00');
      });

      it('应该解析"后天上午10点"', async () => {
        const result = await parseNaturalLanguage('后天上午10点面试', 'zh-CN');
        expect(result.date).toBeDefined();
        expect(result.time).toBe('10:00');
      });

      it('应该解析"下周三"', async () => {
        const result = await parseNaturalLanguage('下周三开会', 'zh-CN');
        expect(result.date).toBeDefined();
        expect(result.type).toBe('event');
      });

      it('应该解析"下周五下午2点"', async () => {
        const result = await parseNaturalLanguage('下周五下午2点和李总见面', 'zh-CN');
        expect(result.date).toBeDefined();
        expect(result.time).toBe('14:00');
      });
    });

    describe('绝对时间表达式', () => {
      it('应该解析"3月15日下午2点"', async () => {
        const result = await parseNaturalLanguage('3月15日下午2点开会', 'zh-CN');
        expect(result.date).toBeDefined();
        if (result.date) {
          expect(result.date.getMonth()).toBe(2);
          expect(result.date.getDate()).toBe(15);
        }
        expect(result.time).toBe('14:00');
      });

      it('应该解析"12月25日"', async () => {
        const result = await parseNaturalLanguage('12月25日圣诞节', 'zh-CN');
        expect(result.date).toBeDefined();
        if (result.date) {
          expect(result.date.getMonth()).toBe(11);
          expect(result.date.getDate()).toBe(25);
        }
      });
    });

    describe('无时间表达式', () => {
      it('应该识别无时间的输入为 event', async () => {
        const result = await parseNaturalLanguage('研究一下怎么用 WebGPU 加速', 'zh-CN');
        expect(result.date).toBeUndefined();
        expect(result.time).toBeUndefined();
        expect(result.type).toBe('event');
      });

      it('应该识别待办关键词', async () => {
        const result = await parseNaturalLanguage('待办：完成项目文档', 'zh-CN');
        expect(result.type).toBe('todo');
      });

      it('应该识别笔记关键词', async () => {
        const result = await parseNaturalLanguage('笔记：今天学到了很多', 'zh-CN');
        expect(result.type).toBe('note');
      });
    });

    describe('地点和人员提取', () => {
      it('应该提取地点信息', async () => {
        const result = await parseNaturalLanguage('明天在会议室A开会', 'zh-CN');
        expect(result.location).toBe('会议室A');
      });

      it('应该提取人员信息', async () => {
        const result = await parseNaturalLanguage('明天和王总开会', 'zh-CN');
        expect(result.people).toContain('王总');
      });

      it('应该同时提取时间和地点', async () => {
        const result = await parseNaturalLanguage('明天下午3点在会议室B和李总开会', 'zh-CN');
        expect(result.time).toBe('15:00');
        expect(result.location).toBe('会议室B');
        expect(result.people).toContain('李总');
      });
    });

    describe('时长解析', () => {
      it('应该解析"2小时"', async () => {
        const result = await parseNaturalLanguage('明天开会2小时', 'zh-CN');
        expect(result.duration).toBe(120);
      });

      it('应该解析"30分钟"', async () => {
        const result = await parseNaturalLanguage('明天开会30分钟', 'zh-CN');
        expect(result.duration).toBe(30);
      });

      it('应该解析"半天"', async () => {
        const result = await parseNaturalLanguage('明天开会半天', 'zh-CN');
        expect(result.duration).toBe(240);
      });
    });

    describe('置信度计算', () => {
      it('完整信息应该有高置信度', async () => {
        const result = await parseNaturalLanguage('明天下午3点在会议室A和王总开会2小时', 'zh-CN');
        expect(result.confidence).toBeGreaterThan(0.8);
        expect(result.date).toBeDefined();
        expect(result.time).toBe('15:00');
        expect(result.location).toBe('会议室A');
        expect(result.people).toContain('王总');
        expect(result.duration).toBe(120);
      });

      it('只有时间应该有中等置信度', async () => {
        const result = await parseNaturalLanguage('明天下午3点开会', 'zh-CN');
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.confidence).toBeLessThan(0.9);
      });

      it('无时间信息应该有基础置信度', async () => {
        const result = await parseNaturalLanguage('研究一下技术方案', 'zh-CN');
        expect(result.confidence).toBe(0.5);
      });
    });
  });

  describe('parseNaturalLanguage - 英文时间解析', () => {
    it('应该解析"tomorrow 3pm"', async () => {
      const result = await parseNaturalLanguage('Meeting tomorrow 3pm', 'en-US');
      expect(result.date).toBeDefined();
      expect(result.time).toBe('15:00');
    });

    it('应该解析"next Monday"', async () => {
      const result = await parseNaturalLanguage('Meeting next Monday', 'en-US');
      expect(result.date).toBeDefined();
    });

    it('应该解析"March 15th"', async () => {
      const result = await parseNaturalLanguage('Event on March 15th', 'en-US');
      expect(result.date).toBeDefined();
      if (result.date) {
        expect(result.date.getMonth()).toBe(2);
        expect(result.date.getDate()).toBe(15);
      }
    });

    it('应该识别 todo 关键词', async () => {
      const result = await parseNaturalLanguage('todo: finish the report', 'en-US');
      expect(result.type).toBe('todo');
    });

    it('应该解析时长 "2 hours"', async () => {
      const result = await parseNaturalLanguage('Meeting for 2 hours tomorrow', 'en-US');
      expect(result.duration).toBe(120);
    });
  });

  describe('parseNaturalLanguage - 日文时间解析', () => {
    it('应该解析"明日午後3時"', async () => {
      const result = await parseNaturalLanguage('明日午後3時に会議', 'ja-JP');
      expect(result.date).toBeDefined();
      expect(result.time).toBe('15:00');
    });

    it('应该解析"来週月曜日"', async () => {
      const result = await parseNaturalLanguage('来週月曜日に会議', 'ja-JP');
      expect(result.date).toBeDefined();
    });
  });

  describe('parseNaturalLanguage - 韩文时间解析', () => {
    it('应该解析"내일 오후 3시"', async () => {
      const result = await parseNaturalLanguage('내일 오후 3시에 회의', 'ko-KR');
      expect(result.date).toBeDefined();
      expect(result.time).toBe('15:00');
    });

    it('应该解析"다음 주 월요일"', async () => {
      const result = await parseNaturalLanguage('다음 주 월요일에 회의', 'ko-KR');
      expect(result.date).toBeDefined();
    });
  });

  describe('formatTimeRange', () => {
    it('应该格式化上午时间 (中文)', () => {
      const start = new Date(2024, 0, 1, 9, 0);
      const end = new Date(2024, 0, 1, 10, 30);
      const result = formatTimeRange(start, end, 'zh-CN');
      expect(result).toBe('上午9:00 - 上午10:30');
    });

    it('应该格式化下午时间 (中文)', () => {
      const start = new Date(2024, 0, 1, 14, 0);
      const end = new Date(2024, 0, 1, 16, 30);
      const result = formatTimeRange(start, end, 'zh-CN');
      expect(result).toBe('下午2:00 - 下午4:30');
    });

    it('应该格式化时间 (英文)', () => {
      const start = new Date(2024, 0, 1, 9, 0);
      const end = new Date(2024, 0, 1, 10, 30);
      const result = formatTimeRange(start, end, 'en-US');
      expect(result).toBe('9 AM:00 - 10 AM:30');
    });
  });

  describe('formatRelativeDate', () => {
    it('应该返回"今天" (中文)', () => {
      const today = new Date();
      const result = formatRelativeDate(today, 'zh-CN');
      expect(result).toBe('今天');
    });

    it('应该返回"明天" (中文)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = formatRelativeDate(tomorrow, 'zh-CN');
      expect(result).toBe('明天');
    });

    it('应该返回"后天" (中文)', () => {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      const result = formatRelativeDate(dayAfterTomorrow, 'zh-CN');
      expect(result).toBe('后天');
    });

    it('应该返回"X天后" (中文)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const result = formatRelativeDate(futureDate, 'zh-CN');
      expect(result).toBe('5天后');
    });

    it('应该返回"today" (英文)', () => {
      const today = new Date();
      const result = formatRelativeDate(today, 'en-US');
      expect(result).toBe('today');
    });

    it('应该返回"tomorrow" (英文)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = formatRelativeDate(tomorrow, 'en-US');
      expect(result).toBe('tomorrow');
    });

    it('应该返回"今日" (日文)', () => {
      const today = new Date();
      const result = formatRelativeDate(today, 'ja-JP');
      expect(result).toBe('今日');
    });

    it('应该返回"오늘" (韩文)', () => {
      const today = new Date();
      const result = formatRelativeDate(today, 'ko-KR');
      expect(result).toBe('오늘');
    });
  });

  describe('时间戳转换工具', () => {
    it('toTimestamp 应该正确转换日期为时间戳', () => {
      const date = new Date(2024, 0, 15, 10, 30);
      const timestamp = toTimestamp(date);
      expect(timestamp).toBe(date.getTime());
      expect(typeof timestamp).toBe('number');
    });

    it('fromTimestamp 应该正确转换时间戳为日期', () => {
      const timestamp = 1705315800000;
      const date = fromTimestamp(timestamp);
      expect(date.getTime()).toBe(timestamp);
      expect(date instanceof Date).toBe(true);
    });

    it('时间戳转换应该是可逆的', () => {
      const originalDate = new Date(2024, 5, 20, 14, 30);
      const timestamp = toTimestamp(originalDate);
      const convertedDate = fromTimestamp(timestamp);
      expect(convertedDate.getTime()).toBe(originalDate.getTime());
    });
  });
});
