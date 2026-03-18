import { describe, it, expect, beforeEach, vi } from 'vitest';
import { smartScheduler, SmartScheduler, type SchedulerOptions } from '../smartScheduler';
import type { UnifiedCalendarItem } from '@/types/unified';

const createTestEvent = (
  id: string,
  startHour: number,
  endHour: number,
  date: Date = new Date()
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
    metadata: {}
  };
};

const createTestIdea = (id: string, extractedTime?: string): UnifiedCalendarItem => ({
  id,
  type: 'idea',
  title: `Idea ${id}`,
  content: `Idea ${id}`,
  startTime: null,
  endTime: null,
  isAllDay: false,
  embedding: [],
  embeddingUpdatedAt: Date.now(),
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: extractedTime ? { extractedTime } : {}
});

describe('SmartScheduler - 时间分块分配算法', () => {
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

  describe('findFreeSlots - 空闲时间段识别', () => {
    it('应该在没有事件时返回完整的工作时间', () => {
      const slots = scheduler.findFreeSlots(today, 60, []);
      const availableSlots = slots.filter(s => s.available);
      expect(availableSlots.length).toBeGreaterThan(0);
    });

    it('应该识别已有事件的冲突', () => {
      const events: UnifiedCalendarItem[] = [
        createTestEvent('event-1', 10, 11)
      ];
      const slots = scheduler.findFreeSlots(today, 60, events);
      const conflictSlot = slots.find(s => 
        s.start.getHours() === 10 && !s.available
      );
      expect(conflictSlot).toBeDefined();
      expect(conflictSlot?.conflictWith?.id).toBe('event-1');
    });

    it('应该正确识别空闲时间段', () => {
      const events: UnifiedCalendarItem[] = [
        createTestEvent('event-1', 9, 10),
        createTestEvent('event-2', 14, 15)
      ];
      const slots = scheduler.findFreeSlots(today, 60, events);
      const availableSlots = slots.filter(s => s.available);
      
      const availableHours = availableSlots.map(s => s.start.getHours());
      expect(availableHours).not.toContain(9);
      expect(availableHours).toContain(10);
      expect(availableHours).toContain(11);
      expect(availableHours).not.toContain(14);
    });

    it('应该在周末返回空数组（当 avoidWeekends=true）', () => {
      const saturday = new Date(today);
      saturday.setDate(saturday.getDate() + (6 - saturday.getDay()));
      
      const slots = scheduler.findFreeSlots(saturday, 60, []);
      expect(slots.length).toBe(0);
    });
  });

  describe('findBestTimeSlot - 最佳时间选择', () => {
    it('应该优先使用用户指定的时间（无冲突）', () => {
      const preferredTime = new Date();
      preferredTime.setHours(15, 0, 0, 0);
      
      const suggestion = scheduler.findBestTimeSlot(
        60,
        {
          preferredDate: preferredTime.getTime(),
          preferredTime: '15:00'
        },
        []
      );

      expect(suggestion.suggestedStart.getHours()).toBe(15);
      expect(suggestion.confidence).toBe(0.95);
      expect(suggestion.reason).toContain('按照您指定的时间');
    });

    it('应该在有冲突时寻找替代时间', () => {
      const preferredTime = new Date();
      preferredTime.setHours(10, 0, 0, 0);
      
      const events: UnifiedCalendarItem[] = [
        createTestEvent('conflict-event', 10, 11, preferredTime)
      ];

      const suggestion = scheduler.findBestTimeSlot(
        60,
        {
          preferredDate: preferredTime.getTime(),
          preferredTime: '10:00'
        },
        events
      );

      expect(suggestion.suggestedStart.getHours()).not.toBe(10);
      expect(suggestion.alternatives.length).toBeGreaterThan(0);
    });

    it('应该返回备选时间', () => {
      const suggestion = scheduler.findBestTimeSlot(
        60,
        { avoidWeekends: true },
        []
      );

      expect(suggestion.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('应该正确计算置信度', () => {
      const preferredTime = new Date();
      preferredTime.setHours(14, 0, 0, 0);

      const suggestion = scheduler.findBestTimeSlot(
        60,
        {
          preferredDate: preferredTime.getTime(),
          preferredTime: '14:00'
        },
        []
      );

      expect(suggestion.confidence).toBeGreaterThan(0.8);
    });

    it('应该处理非工作时间的时间请求', () => {
      const preferredTime = new Date();
      preferredTime.setHours(0, 0, 0, 0);

      const suggestion = scheduler.findBestTimeSlot(
        60,
        {
          preferredDate: preferredTime.getTime(),
          preferredTime: '00:00'
        },
        []
      );

      expect(suggestion.suggestedStart.getHours()).toBe(0);
      expect(suggestion.confidence).toBe(0.95);
    });
  });

  describe('checkConflict - 冲突检测', () => {
    it('应该检测到重叠事件', () => {
      const events: UnifiedCalendarItem[] = [
        createTestEvent('event-1', 10, 12)
      ];

      const start = new Date();
      start.setHours(11, 0, 0, 0);
      const end = new Date();
      end.setHours(13, 0, 0, 0);

      const conflicts = scheduler.checkConflict(start, end, events);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].id).toBe('event-1');
    });

    it('应该不检测相邻但不重叠的事件', () => {
      const events: UnifiedCalendarItem[] = [
        createTestEvent('event-1', 10, 11)
      ];

      const start = new Date();
      start.setHours(11, 0, 0, 0);
      const end = new Date();
      end.setHours(12, 0, 0, 0);

      const conflicts = scheduler.checkConflict(start, end, events);
      expect(conflicts.length).toBe(0);
    });

    it('应该忽略已取消的事件', () => {
      const events: UnifiedCalendarItem[] = [
        {
          ...createTestEvent('event-1', 10, 12),
          status: 'cancelled'
        }
      ];

      const start = new Date();
      start.setHours(11, 0, 0, 0);
      const end = new Date();
      end.setHours(13, 0, 0, 0);

      const conflicts = scheduler.checkConflict(start, end, events);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('getAvailableTimeRanges - 可用时间范围', () => {
    it('应该返回工作时间内未被占用的时间段', () => {
      const events: UnifiedCalendarItem[] = [
        createTestEvent('event-1', 10, 12),
        createTestEvent('event-2', 14, 15)
      ];

      const ranges = scheduler.getAvailableTimeRanges(today, events);
      
      expect(ranges.length).toBeGreaterThan(0);
      
      const firstRange = ranges[0];
      expect(firstRange.start.getHours()).toBe(9);
      expect(firstRange.end.getHours()).toBe(10);
    });

    it('应该在整天空闲时返回完整工作时间', () => {
      const ranges = scheduler.getAvailableTimeRanges(today, []);
      
      expect(ranges.length).toBe(1);
      expect(ranges[0].start.getHours()).toBe(9);
      expect(ranges[0].end.getHours()).toBe(18);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理跨越多天的事件搜索', () => {
      const suggestion = scheduler.findBestTimeSlot(
        60,
        { avoidWeekends: true },
        []
      );

      expect(suggestion.suggestedStart).toBeDefined();
      expect(suggestion.suggestedEnd).toBeDefined();
    });

    it('应该处理空事件列表', () => {
      const suggestion = scheduler.findBestTimeSlot(
        60,
        {},
        []
      );

      expect(suggestion).toBeDefined();
      expect(suggestion.confidence).toBeGreaterThan(0);
    });

    it('应该处理非常长的持续时间', () => {
      const suggestion = scheduler.findBestTimeSlot(
        480, // 8小时
        {},
        []
      );

      expect(suggestion).toBeDefined();
    });
  });
});
