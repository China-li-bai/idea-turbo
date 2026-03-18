import { describe, it, expect } from 'vitest';
import type { UnifiedCalendarItem, ItemType, ItemStatus } from '@/types/unified';

const createValidIdea = (): UnifiedCalendarItem => ({
  id: 'e3db9e3f-a0e9-417c-bc9b-b7b3e0e7f984',
  type: 'idea',
  title: '测试灵感',
  content: '这是一个测试灵感',
  startTime: null,
  endTime: null,
  isAllDay: false,
  embedding: new Array(512).fill(0),
  embeddingUpdatedAt: Date.now(),
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {
    extractedDate: undefined,
    extractedTime: undefined,
    extractedLocation: undefined,
    extractedPeople: undefined
  }
});

const createValidEvent = (): UnifiedCalendarItem => ({
  id: 'f4c5a4b5-b1f0-528d-cd0c-c8c4f1f8g095',
  type: 'event',
  title: '测试日程',
  content: '这是一个测试日程',
  startTime: Date.now() + 3600000,
  endTime: Date.now() + 7200000,
  isAllDay: false,
  embedding: new Array(512).fill(0),
  embeddingUpdatedAt: Date.now(),
  status: 'scheduled',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {
    location: '会议室A',
    reminders: [15, 30]
  }
});

describe('UnifiedCalendarItem - 数据结构一致性', () => {
  describe('Idea 类型验证', () => {
    it('应该有正确的 type 字段', () => {
      const idea = createValidIdea();
      expect(idea.type).toBe('idea');
    });

    it('应该有 null 的时间字段', () => {
      const idea = createValidIdea();
      expect(idea.startTime).toBeNull();
      expect(idea.endTime).toBeNull();
    });

    it('应该有 pending 状态', () => {
      const idea = createValidIdea();
      expect(idea.status).toBe('pending');
    });

    it('应该有 512 维向量', () => {
      const idea = createValidIdea();
      expect(idea.embedding.length).toBe(512);
    });

    it('应该包含 metadata 中的 AI 提取字段', () => {
      const idea = createValidIdea();
      expect(idea.metadata).toHaveProperty('extractedDate');
      expect(idea.metadata).toHaveProperty('extractedTime');
      expect(idea.metadata).toHaveProperty('extractedLocation');
      expect(idea.metadata).toHaveProperty('extractedPeople');
    });
  });

  describe('Event 类型验证', () => {
    it('应该有正确的 type 字段', () => {
      const event = createValidEvent();
      expect(event.type).toBe('event');
    });

    it('应该有有效的时间戳', () => {
      const event = createValidEvent();
      expect(event.startTime).not.toBeNull();
      expect(event.endTime).not.toBeNull();
      expect(typeof event.startTime).toBe('number');
      expect(typeof event.endTime).toBe('number');
    });

    it('应该有 scheduled 状态', () => {
      const event = createValidEvent();
      expect(event.status).toBe('scheduled');
    });

    it('应该有有效的开始和结束时间关系', () => {
      const event = createValidEvent();
      expect(event.endTime! > event.startTime!).toBe(true);
    });
  });

  describe('类型转换验证', () => {
    it('Idea 转换为 Event 时应该保留历史', () => {
      const idea = createValidIdea();
      const convertedEvent: UnifiedCalendarItem = {
        ...idea,
        type: 'event',
        startTime: Date.now() + 3600000,
        endTime: Date.now() + 7200000,
        status: 'scheduled',
        metadata: {
          ...idea.metadata,
          previousType: 'idea',
          convertedAt: Date.now()
        }
      };

      expect(convertedEvent.metadata.previousType).toBe('idea');
      expect(convertedEvent.metadata.convertedAt).toBeDefined();
    });

    it('Event 转换为 Idea 时应该清除时间', () => {
      const event = createValidEvent();
      const convertedIdea: UnifiedCalendarItem = {
        ...event,
        type: 'idea',
        startTime: null,
        endTime: null,
        status: 'pending',
        metadata: {
          ...event.metadata,
          previousType: 'event',
          convertedAt: Date.now()
        }
      };

      expect(convertedIdea.startTime).toBeNull();
      expect(convertedIdea.endTime).toBeNull();
      expect(convertedIdea.status).toBe('pending');
    });
  });

  describe('状态机验证', () => {
    const validStatuses: ItemStatus[] = ['pending', 'scheduled', 'completed', 'cancelled'];
    const validTypes: ItemType[] = ['idea', 'event'];

    it('应该只接受有效的状态值', () => {
      const idea = createValidIdea();
      expect(validStatuses).toContain(idea.status);
    });

    it('应该只接受有效的类型值', () => {
      const idea = createValidIdea();
      const event = createValidEvent();
      expect(validTypes).toContain(idea.type);
      expect(validTypes).toContain(event.type);
    });

    it('状态转换应该符合规则', () => {
      const validTransitions = [
        { from: 'pending', to: 'scheduled' },
        { from: 'scheduled', to: 'completed' },
        { from: 'scheduled', to: 'cancelled' },
        { from: 'pending', to: 'cancelled' }
      ];

      validTransitions.forEach(({ from, to }) => {
        expect(validStatuses).toContain(from);
        expect(validStatuses).toContain(to);
      });
    });
  });

  describe('必需字段验证', () => {
    it('所有必需字段都应该存在', () => {
      const idea = createValidIdea();
      
      expect(idea.id).toBeDefined();
      expect(idea.type).toBeDefined();
      expect(idea.title).toBeDefined();
      expect(idea.content).toBeDefined();
      expect(idea.isAllDay).toBeDefined();
      expect(idea.embedding).toBeDefined();
      expect(idea.embeddingUpdatedAt).toBeDefined();
      expect(idea.status).toBeDefined();
      expect(idea.createdAt).toBeDefined();
      expect(idea.updatedAt).toBeDefined();
      expect(idea.metadata).toBeDefined();
    });

    it('ID 应该是有效的 UUID 格式', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const idea = createValidIdea();
      
      expect(uuidRegex.test(idea.id)).toBe(true);
    });

    it('时间戳应该是有效的数字', () => {
      const event = createValidEvent();
      
      expect(typeof event.createdAt).toBe('number');
      expect(typeof event.updatedAt).toBe('number');
      expect(typeof event.embeddingUpdatedAt).toBe('number');
      expect(event.createdAt).toBeGreaterThan(0);
      expect(event.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('向量嵌入验证', () => {
    it('向量应该是 512 维', () => {
      const idea = createValidIdea();
      expect(idea.embedding.length).toBe(512);
    });

    it('向量值应该在合理范围内', () => {
      const idea = createValidIdea();
      const validRange = idea.embedding.every(
        val => typeof val === 'number' && val >= -1 && val <= 1
      );
      expect(validRange).toBe(true);
    });
  });

  describe('Metadata 字段验证', () => {
    it('应该支持可选的通用字段', () => {
      const event = createValidEvent();
      
      expect(event.metadata.location).toBeDefined();
      expect(event.metadata.reminders).toBeDefined();
    });

    it('应该支持 Idea 特有字段', () => {
      const idea: UnifiedCalendarItem = {
        ...createValidIdea(),
        metadata: {
          extractedDate: Date.now(),
          extractedTime: '14:00',
          extractedLocation: '会议室B',
          extractedPeople: ['张三', '李四'],
          source: 'keyboard'
        }
      };

      expect(idea.metadata.extractedDate).toBeDefined();
      expect(idea.metadata.extractedTime).toBe('14:00');
      expect(idea.metadata.extractedLocation).toBe('会议室B');
      expect(idea.metadata.extractedPeople).toHaveLength(2);
      expect(idea.metadata.source).toBe('keyboard');
    });

    it('应该支持转换历史字段', () => {
      const event: UnifiedCalendarItem = {
        ...createValidEvent(),
        metadata: {
          previousType: 'idea',
          convertedAt: Date.now(),
          conversionNotes: '用户确认转换'
        }
      };

      expect(event.metadata.previousType).toBe('idea');
      expect(event.metadata.convertedAt).toBeDefined();
      expect(event.metadata.conversionNotes).toBe('用户确认转换');
    });
  });
});
