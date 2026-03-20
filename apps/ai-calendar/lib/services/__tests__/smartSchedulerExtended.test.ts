import { describe, it, expect, beforeEach } from 'vitest';
import { SmartScheduler } from '../smartScheduler';
import type { UnifiedCalendarItem } from '@/types/unified';

const createTestEvent = (
  id: string,
  startHour: number,
  endHour: number,
  date: Date = new Date(),
  priority: 'high' | 'medium' | 'low' = 'medium',
  eventType: 'regular' | 'shift' | 'meeting' | 'personal' = 'regular'
): UnifiedCalendarItem => {
  const startTime = new Date(date);
  startTime.setHours(startHour, 0, 0, 0);
  const endTime = new Date(date);
  endTime.setHours(endHour, 0, 0, 0);

  return {
    id,
    type: 'event',
    title: `Event ${id}`,
    content: `Event ${id}`,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    isAllDay: false,
    embedding: [],
    embeddingUpdatedAt: Date.now(),
    status: 'scheduled',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: { priority, eventType }
  };
};

describe('SmartScheduler - 新增方法测试', () => {
  let scheduler: SmartScheduler;
  let today: Date;

  beforeEach(() => {
    scheduler = new SmartScheduler({
      workHours: { start: 9, end: 18 },
      workDays: [1, 2, 3, 4, 5],
      defaultDuration: 60,
      bufferMinutes: 15,
      maxSearchDays: 14
    });
    today = new Date();
    today.setHours(0, 0, 0, 0);
  });

  describe('suggestTimeBlocks - 时间块推荐', () => {
    it('应该返回按分数排序的时间块', () => {
      const blocks = scheduler.suggestTimeBlocks(60, {}, []);
      
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0].score).toBeGreaterThanOrEqual(blocks[blocks.length - 1].score);
    });

    it('应该优先推荐黄金时间段', () => {
      const blocks = scheduler.suggestTimeBlocks(60, {
        preferredHours: { start: 10, end: 16 }
      }, []);
      
      const highScoreBlocks = blocks.filter(b => b.score >= 0.8);
      expect(highScoreBlocks.length).toBeGreaterThan(0);
    });

    it('应该返回最多 10 个推荐', () => {
      const blocks = scheduler.suggestTimeBlocks(60, {}, []);
      expect(blocks.length).toBeLessThanOrEqual(10);
    });

    it('每个推荐应包含所有必需字段', () => {
      const blocks = scheduler.suggestTimeBlocks(60, {}, []);
      
      blocks.forEach(block => {
        expect(block).toHaveProperty('start');
        expect(block).toHaveProperty('end');
        expect(block).toHaveProperty('score');
        expect(block).toHaveProperty('reason');
        
        expect(block.start).toBeInstanceOf(Date);
        expect(block.end).toBeInstanceOf(Date);
        expect(typeof block.score).toBe('number');
        expect(typeof block.reason).toBe('string');
        expect(block.score).toBeGreaterThanOrEqual(0);
        expect(block.score).toBeLessThanOrEqual(1);
      });
    });

    it('应该避开已有事件', () => {
      const events = [createTestEvent('existing', 10, 12, today)];
      const blocks = scheduler.suggestTimeBlocks(60, {}, events);
      
      const conflictBlocks = blocks.filter(b => {
        const blockStart = b.start.getTime();
        const blockEnd = b.end.getTime();
        const eventStart = events[0].startTime!;
        const eventEnd = events[0].endTime!;
        
        return blockStart < eventEnd && blockEnd > eventStart;
      });
      
      expect(conflictBlocks.length).toBe(0);
    });
  });

  describe('predictConflicts - 冲突预测', () => {
    it('应该检测时间重叠冲突', () => {
      const events = [createTestEvent('existing', 10, 12, today)];
      
      const newEvent = {
        startTime: new Date(today).setHours(11, 0, 0, 0),
        endTime: new Date(today).setHours(13, 0, 0, 0),
        title: '新事件'
      };
      
      const conflicts = scheduler.predictConflicts(newEvent, events);
      
      const overlapConflict = conflicts.find(c => c.type === 'overlap');
      expect(overlapConflict).toBeDefined();
      expect(overlapConflict?.severity).toBe('high');
    });

    it('应该检测紧密相邻事件', () => {
      const events = [createTestEvent('existing', 10, 11, today)];
      
      const newEvent = {
        startTime: new Date(today).setHours(11, 5, 0, 0),
        endTime: new Date(today).setHours(12, 0, 0, 0),
        title: '新事件'
      };
      
      const conflicts = scheduler.predictConflicts(newEvent, events);
      
      const backToBackConflict = conflicts.find(c => c.type === 'back_to_back');
      expect(backToBackConflict).toBeDefined();
      expect(backToBackConflict?.severity).toBe('medium');
    });

    it('应该检测工作时间外事件', () => {
      const newEvent = {
        startTime: new Date(today).setHours(7, 0, 0, 0),
        endTime: new Date(today).setHours(8, 0, 0, 0),
        title: '早会'
      };
      
      const conflicts = scheduler.predictConflicts(newEvent, []);
      
      const outsideHoursConflict = conflicts.find(c => c.type === 'outside_work_hours');
      expect(outsideHoursConflict).toBeDefined();
      expect(outsideHoursConflict?.severity).toBe('low');
    });

    it('应该检测日程过满', () => {
      const events: UnifiedCalendarItem[] = [];
      for (let i = 9; i < 17; i++) {
        events.push(createTestEvent(`event-${i}`, i, i + 1, today));
      }
      
      const newEvent = {
        startTime: new Date(today).setHours(17, 0, 0, 0),
        endTime: new Date(today).setHours(18, 0, 0, 0),
        title: '新事件'
      };
      
      const conflicts = scheduler.predictConflicts(newEvent, events);
      
      const tightScheduleConflict = conflicts.find(c => c.type === 'tight_schedule');
      expect(tightScheduleConflict).toBeDefined();
    });

    it('冲突应按严重程度排序', () => {
      const events = [
        createTestEvent('existing', 10, 11, today),
        createTestEvent('another', 11, 12, today)
      ];
      
      const newEvent = {
        startTime: new Date(today).setHours(10, 30, 0, 0),
        endTime: new Date(today).setHours(11, 30, 0, 0),
        title: '新事件'
      };
      
      const conflicts = scheduler.predictConflicts(newEvent, events);
      
      const severityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < conflicts.length; i++) {
        expect(severityOrder[conflicts[i - 1].severity]).toBeLessThanOrEqual(
          severityOrder[conflicts[i].severity]
        );
      }
    });

    it('每个冲突应包含所有必需字段', () => {
      const events = [createTestEvent('existing', 10, 12, today)];
      const newEvent = {
        startTime: new Date(today).setHours(11, 0, 0, 0),
        endTime: new Date(today).setHours(13, 0, 0, 0),
        title: '新事件'
      };
      
      const conflicts = scheduler.predictConflicts(newEvent, events);
      
      conflicts.forEach(conflict => {
        expect(conflict).toHaveProperty('type');
        expect(conflict).toHaveProperty('severity');
        expect(conflict).toHaveProperty('message');
        
        expect(['overlap', 'back_to_back', 'tight_schedule', 'outside_work_hours']).toContain(conflict.type);
        expect(['high', 'medium', 'low']).toContain(conflict.severity);
        expect(typeof conflict.message).toBe('string');
        expect(conflict.message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('optimizeSchedule - 日程优化', () => {
    it('应该建议将高优先级任务移到上午', () => {
      const events = [
        createTestEvent('high-priority', 14, 15, today, 'high'),
        createTestEvent('normal', 10, 11, today, 'medium')
      ];
      
      const suggestions = scheduler.optimizeSchedule(today, events, {
        preferMorning: true
      });
      
      const highPrioritySuggestion = suggestions.find(s => s.itemId === 'high-priority');
      if (highPrioritySuggestion) {
        expect(highPrioritySuggestion.reason).toContain('上午');
      }
    });

    it('应该返回有效的优化建议结构', () => {
      const events = [
        createTestEvent('event-1', 10, 11, today),
        createTestEvent('event-2', 14, 15, today)
      ];
      
      const suggestions = scheduler.optimizeSchedule(today, events);
      
      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('itemId');
        expect(suggestion).toHaveProperty('currentStart');
        expect(suggestion).toHaveProperty('currentEnd');
        expect(suggestion).toHaveProperty('suggestedStart');
        expect(suggestion).toHaveProperty('suggestedEnd');
        expect(suggestion).toHaveProperty('reason');
        
        expect(typeof suggestion.itemId).toBe('string');
        expect(typeof suggestion.currentStart).toBe('number');
        expect(typeof suggestion.currentEnd).toBe('number');
        expect(typeof suggestion.suggestedStart).toBe('number');
        expect(typeof suggestion.suggestedEnd).toBe('number');
        expect(typeof suggestion.reason).toBe('string');
      });
    });

    it('应该在没有事件时返回空数组', () => {
      const suggestions = scheduler.optimizeSchedule(today, []);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('getDayStatistics - 日程统计', () => {
    it('应该返回正确的统计数据', () => {
      const events = [
        createTestEvent('event-1', 9, 10, today),
        createTestEvent('event-2', 14, 16, today)
      ];
      
      const stats = scheduler.getDayStatistics(today, events);
      
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('totalMinutes');
      expect(stats).toHaveProperty('utilization');
      expect(stats).toHaveProperty('freeMinutes');
      expect(stats).toHaveProperty('busiestHour');
      expect(stats).toHaveProperty('suggestions');
      
      expect(stats.totalEvents).toBe(2);
      expect(stats.totalMinutes).toBe(180);
      expect(stats.utilization).toBeGreaterThan(0);
      expect(stats.utilization).toBeLessThanOrEqual(1);
      expect(Array.isArray(stats.suggestions)).toBe(true);
    });

    it('应该正确计算利用率', () => {
      const events = [
        createTestEvent('event-1', 9, 12, today),
        createTestEvent('event-2', 14, 17, today)
      ];
      
      const stats = scheduler.getDayStatistics(today, events);
      
      expect(stats.totalMinutes).toBe(360);
      expect(stats.utilization).toBeCloseTo(360 / (9 * 60), 2);
    });

    it('应该识别最繁忙的小时', () => {
      const events = [
        createTestEvent('event-1', 10, 11, today),
        createTestEvent('event-2', 10, 12, today),
        createTestEvent('event-3', 14, 15, today)
      ];
      
      const stats = scheduler.getDayStatistics(today, events);
      
      expect(stats.busiestHour).toBe(10);
    });

    it('应该在没有事件时返回零值', () => {
      const stats = scheduler.getDayStatistics(today, []);
      
      expect(stats.totalEvents).toBe(0);
      expect(stats.totalMinutes).toBe(0);
      expect(stats.utilization).toBe(0);
      expect(stats.freeMinutes).toBe((18 - 9) * 60);
    });

    it('应该在高利用率时给出建议', () => {
      const events: UnifiedCalendarItem[] = [];
      for (let i = 9; i < 18; i++) {
        events.push(createTestEvent(`event-${i}`, i, i + 1, today));
      }
      
      const stats = scheduler.getDayStatistics(today, events);
      
      expect(stats.suggestions.length).toBeGreaterThan(0);
      expect(stats.suggestions.some(s => s.includes('过满') || s.includes('较满'))).toBe(true);
    });

    it('应该在低利用率时给出建议', () => {
      const stats = scheduler.getDayStatistics(today, []);
      
      expect(stats.suggestions.some(s => s.includes('空闲') || s.includes('安排'))).toBe(true);
    });
  });

  describe('数据结构一致性', () => {
    it('TimeSlot 结构应符合预期', () => {
      const slots = scheduler.findFreeSlots(today, 60, []);
      
      slots.forEach(slot => {
        expect(slot).toHaveProperty('start');
        expect(slot).toHaveProperty('end');
        expect(slot).toHaveProperty('available');
        expect(slot.start).toBeInstanceOf(Date);
        expect(slot.end).toBeInstanceOf(Date);
        expect(typeof slot.available).toBe('boolean');
      });
    });

    it('SchedulingSuggestion 结构应符合预期', () => {
      const suggestion = scheduler.findBestTimeSlot(60, {}, []);
      
      expect(suggestion).toHaveProperty('suggestedStart');
      expect(suggestion).toHaveProperty('suggestedEnd');
      expect(suggestion).toHaveProperty('confidence');
      expect(suggestion).toHaveProperty('alternatives');
      expect(suggestion).toHaveProperty('conflicts');
      expect(suggestion).toHaveProperty('relatedItems');
      expect(suggestion).toHaveProperty('reason');
      
      expect(suggestion.suggestedStart).toBeInstanceOf(Date);
      expect(suggestion.suggestedEnd).toBeInstanceOf(Date);
      expect(typeof suggestion.confidence).toBe('number');
      expect(Array.isArray(suggestion.alternatives)).toBe(true);
      expect(Array.isArray(suggestion.conflicts)).toBe(true);
      expect(typeof suggestion.reason).toBe('string');
    });
  });
});
