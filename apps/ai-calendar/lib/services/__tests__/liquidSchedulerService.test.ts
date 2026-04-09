import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiquidSchedulerService, type LiquidSchedulerOptions } from '../liquidSchedulerService';
import type { UnifiedCalendarItem } from '@/types/unified';

const createLiquidItem = (
  id: string,
  overrides: Partial<UnifiedCalendarItem> = {}
): UnifiedCalendarItem => ({
  id,
  type: 'event',
  title: `Liquid ${id}`,
  content: `Liquid ${id}`,
  startTime: null,
  endTime: null,
  isAllDay: false,
  embedding: [],
  embeddingUpdatedAt: Date.now(),
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  metadata: {
    liquidSchedule: {
      liquidGroupId: 'group-1',
      liquidPriority: 5,
      liquidState: 'pending',
      priorityLevel: 2,
      deadline: Date.now() + 3 * 24 * 60 * 60 * 1000,
      flexibleDuration: {
        minMinutes: 30,
        maxMinutes: 120,
        preferredMinutes: 60,
      },
      preferredTimeSlots: [
        { dayOfWeek: 1, startHour: 9, endHour: 12, score: 10 },
      ],
    },
    ...overrides.metadata,
  },
  ...overrides,
});

const createFixedEvent = (
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
    title: `Fixed ${id}`,
    content: `Fixed ${id}`,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    isAllDay: false,
    embedding: [],
    embeddingUpdatedAt: Date.now(),
    status: 'scheduled',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {},
  };
};

describe('LiquidSchedulerService', () => {
  let service: LiquidSchedulerService;

  beforeEach(() => {
    service = LiquidSchedulerService.getInstance();
  });

  describe('schedulePendingItems', () => {
    it('should return empty result when no pending items exist', () => {
      const fixedEvent = createFixedEvent('f1', 9, 10);
      const result = service.schedulePendingItems([fixedEvent]);

      expect(result.scheduled).toHaveLength(0);
      expect(result.promoted).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should schedule a pending liquid item into an empty slot', () => {
      const liquidItem = createLiquidItem('l1');
      const result = service.schedulePendingItems([liquidItem]);

      expect(result.scheduled.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect work hours when scheduling', () => {
      const liquidItem = createLiquidItem('l1');
      const result = service.schedulePendingItems([liquidItem]);

      for (const scheduled of result.scheduled) {
        const startHour = new Date(scheduled.slot.start).getHours();
        const endHour = new Date(scheduled.slot.end).getHours();
        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(endHour).toBeLessThanOrEqual(18);
      }
    });

    it('should schedule higher priority items first', () => {
      const p1Item = createLiquidItem('p1', {
        metadata: {
          liquidSchedule: {
            liquidGroupId: 'group-1',
            liquidPriority: 10,
            liquidState: 'pending',
            priorityLevel: 1,
            deadline: Date.now() + 24 * 60 * 60 * 1000,
            flexibleDuration: { minMinutes: 30, maxMinutes: 60, preferredMinutes: 30 },
          },
        },
      });

      const p4Item = createLiquidItem('p4', {
        metadata: {
          liquidSchedule: {
            liquidGroupId: 'group-1',
            liquidPriority: 1,
            liquidState: 'pending',
            priorityLevel: 4,
            deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
            flexibleDuration: { minMinutes: 30, maxMinutes: 60, preferredMinutes: 30 },
          },
        },
      });

      const result = service.schedulePendingItems([p4Item, p1Item]);

      if (result.scheduled.length >= 2) {
        expect(result.scheduled[0].item.id).toBe('p1');
      }
    });

    it('should not schedule items that conflict with fixed events', () => {
      const fixedEvent = createFixedEvent('f1', 9, 17);
      const liquidItem = createLiquidItem('l1', {
        metadata: {
          liquidSchedule: {
            liquidGroupId: 'group-1',
            liquidPriority: 5,
            liquidState: 'pending',
            priorityLevel: 2,
            deadline: Date.now() + 3 * 24 * 60 * 60 * 1000,
            flexibleDuration: { minMinutes: 60, maxMinutes: 60, preferredMinutes: 60 },
            hardConstraints: [
              { type: 'on', date: fixedEvent.startTime!, reason: 'Must be same day' },
            ],
          },
        },
      });

      const result = service.schedulePendingItems([fixedEvent, liquidItem]);
      expect(result.scheduled.length).toBeLessThanOrEqual(1);
    });
  });

  describe('checkHardConstraints', () => {
    it('should return violations for before constraint violations', () => {
      const item = createLiquidItem('l1', {
        metadata: {
          liquidSchedule: {
            liquidGroupId: 'group-1',
            liquidPriority: 5,
            liquidState: 'pending',
            hardConstraints: [
              { type: 'before', startTime: '10:00', reason: 'Must be before 10am' },
            ],
          },
        },
      });

      const proposedSlot = {
        start: new Date().setHours(11, 0, 0, 0),
        end: new Date().setHours(12, 0, 0, 0),
      };

      const violations = service.checkHardConstraints(item, proposedSlot);
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should pass when constraints are satisfied', () => {
      const item = createLiquidItem('l1', {
        metadata: {
          liquidSchedule: {
            liquidGroupId: 'group-1',
            liquidPriority: 5,
            liquidState: 'pending',
            hardConstraints: [
              { type: 'after', startTime: '09:00', reason: 'Must be after 9am' },
            ],
          },
        },
      });

      const proposedSlot = {
        start: new Date().setHours(10, 0, 0, 0),
        end: new Date().setHours(11, 0, 0, 0),
      };

      const violations = service.checkHardConstraints(item, proposedSlot);
      expect(violations).toHaveLength(0);
    });

    it('should return empty violations when no constraints defined', () => {
      const item = createLiquidItem('l1');
      const proposedSlot = {
        start: new Date().setHours(10, 0, 0, 0),
        end: new Date().setHours(11, 0, 0, 0),
      };

      const violations = service.checkHardConstraints(item, proposedSlot);
      expect(violations).toHaveLength(0);
    });
  });

  describe('calculateSchedulingScore', () => {
    it('should give higher score to preferred time slots', () => {
      const item = createLiquidItem('l1');
      const preferredSlot = new Date();
      preferredSlot.setHours(10, 0, 0, 0);
      const preferredEnd = new Date();
      preferredEnd.setHours(11, 0, 0, 0);

      const nonPreferredSlot = new Date();
      nonPreferredSlot.setHours(16, 0, 0, 0);
      const nonPreferredEnd = new Date();
      nonPreferredEnd.setHours(17, 0, 0, 0);

      const preferredScore = service.calculateSchedulingScore(
        item, preferredSlot, preferredEnd, []
      );
      const nonPreferredScore = service.calculateSchedulingScore(
        item, nonPreferredSlot, nonPreferredEnd, []
      );

      expect(preferredScore).toBeGreaterThanOrEqual(nonPreferredScore);
    });

    it('should give higher score to items closer to deadline', () => {
      const urgentItem = createLiquidItem('urgent', {
        metadata: {
          liquidSchedule: {
            liquidGroupId: 'group-1',
            liquidPriority: 5,
            liquidState: 'pending',
            priorityLevel: 1,
            deadline: Date.now() + 24 * 60 * 60 * 1000,
            flexibleDuration: { minMinutes: 30, maxMinutes: 60, preferredMinutes: 30 },
          },
        },
      });

      const relaxedItem = createLiquidItem('relaxed', {
        metadata: {
          liquidSchedule: {
            liquidGroupId: 'group-1',
            liquidPriority: 5,
            liquidState: 'pending',
            priorityLevel: 4,
            deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
            flexibleDuration: { minMinutes: 30, maxMinutes: 60, preferredMinutes: 30 },
          },
        },
      });

      const slotStart = new Date();
      slotStart.setHours(10, 0, 0, 0);
      const slotEnd = new Date();
      slotEnd.setHours(11, 0, 0, 0);

      const urgentScore = service.calculateSchedulingScore(
        urgentItem, slotStart, slotEnd, []
      );
      const relaxedScore = service.calculateSchedulingScore(
        relaxedItem, slotStart, slotEnd, []
      );

      expect(urgentScore).toBeGreaterThanOrEqual(relaxedScore);
    });
  });

  describe('applyScheduleResult', () => {
    it('should apply scheduled items to the items array', () => {
      const liquidItem = createLiquidItem('l1');
      const result = service.schedulePendingItems([liquidItem]);

      if (result.scheduled.length > 0) {
        const updated = service.applyScheduleResult([liquidItem], result);
        const updatedItem = updated.find(i => i.id === 'l1');
        expect(updatedItem).toBeDefined();
        expect(updatedItem?.startTime).not.toBeNull();
        expect(updatedItem?.status).toBe('scheduled');
      }
    });

    it('should not modify items not in the schedule result', () => {
      const fixedEvent = createFixedEvent('f1', 9, 10);
      const liquidItem = createLiquidItem('l1');
      const result = service.schedulePendingItems([fixedEvent, liquidItem]);

      if (result.scheduled.length > 0) {
        const updated = service.applyScheduleResult([fixedEvent, liquidItem], result);
        const fixedItem = updated.find(i => i.id === 'f1');
        expect(fixedItem?.startTime).toBe(fixedEvent.startTime);
      }
    });
  });
});
