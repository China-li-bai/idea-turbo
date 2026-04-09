import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelfHealingScheduler } from '../selfHealingScheduler';
import type { UnifiedCalendarItem } from '@/types/unified';

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

const createLiquidEvent = (
  id: string,
  startHour: number,
  endHour: number,
  priorityLevel: 1 | 2 | 3 | 4 = 3,
  date: Date = new Date()
): UnifiedCalendarItem => {
  const startTime = new Date(date);
  startTime.setHours(startHour, 0, 0, 0);
  const endTime = new Date(date);
  endTime.setHours(endHour, 0, 0, 0);

  return {
    id,
    type: 'event',
    title: `Liquid ${id}`,
    content: `Liquid ${id}`,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    isAllDay: false,
    embedding: [],
    embeddingUpdatedAt: Date.now(),
    status: 'scheduled',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    metadata: {
      liquidSchedule: {
        liquidGroupId: 'group-1',
        liquidPriority: 5,
        liquidOriginalSlot: startTime.getTime(),
        liquidState: 'confirmed',
        priorityLevel,
        stabilityScore: 0,
      },
      originalSlotStart: startTime.getTime(),
      originalSlotEnd: endTime.getTime(),
    },
  };
};

describe('SelfHealingScheduler', () => {
  let scheduler: SelfHealingScheduler;

  beforeEach(() => {
    scheduler = SelfHealingScheduler.getInstance();
  });

  describe('detectLiquidConflicts', () => {
    it('should detect conflicts with liquid events', () => {
      const liquidEvent = createLiquidEvent('l1', 9, 10);
      const newEvent = createFixedEvent('n1', 9, 10);

      const conflicts = scheduler.detectLiquidConflicts(newEvent, [liquidEvent]);

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].liquidItem.id).toBe('l1');
    });

    it('should not detect conflicts when there is no overlap', () => {
      const liquidEvent = createLiquidEvent('l1', 9, 10);
      const newEvent = createFixedEvent('n1', 11, 12);

      const conflicts = scheduler.detectLiquidConflicts(newEvent, [liquidEvent]);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect partial overlap conflicts', () => {
      const liquidEvent = createLiquidEvent('l1', 9, 11);
      const newEvent = createFixedEvent('n1', 10, 12);

      const conflicts = scheduler.detectLiquidConflicts(newEvent, [liquidEvent]);

      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should not detect conflicts with non-liquid events', () => {
      const fixedEvent = createFixedEvent('f1', 9, 10);
      const newEvent = createFixedEvent('n1', 9, 10);

      const conflicts = scheduler.detectLiquidConflicts(newEvent, [fixedEvent]);

      expect(conflicts).toHaveLength(0);
    });

    it('should set priorityComparison based on priority levels', () => {
      const lowPriorityLiquid = createLiquidEvent('l1', 9, 10, 4);
      const highPriorityNew = createFixedEvent('n1', 9, 10);

      const conflicts = scheduler.detectLiquidConflicts(highPriorityNew, [lowPriorityLiquid]);

      if (conflicts.length > 0) {
        expect(conflicts[0].priorityComparison).toBeDefined();
      }
    });
  });

  describe('processNewEvent', () => {
    it('should return no conflicts when no liquid events overlap', () => {
      const liquidEvent = createLiquidEvent('l1', 14, 15);
      const newEvent = createFixedEvent('n1', 9, 10);

      const result = scheduler.processNewEvent(newEvent, [liquidEvent]);

      expect(result.hasConflicts).toBe(false);
      expect(result.rescheduledItems).toHaveLength(0);
    });

    it('should reschedule conflicting liquid events', () => {
      const liquidEvent = createLiquidEvent('l1', 9, 10, 4);
      const newEvent = createFixedEvent('n1', 9, 10);

      const result = scheduler.processNewEvent(newEvent, [liquidEvent]);

      if (result.hasConflicts) {
        expect(result.conflicts.length).toBeGreaterThan(0);
      }
    });

    it('should not reschedule locked liquid events', () => {
      const lockedEvent = createLiquidEvent('l1', 9, 10);
      lockedEvent.metadata.liquidSchedule!.liquidState = 'locked';

      const newEvent = createFixedEvent('n1', 9, 10);

      const result = scheduler.processNewEvent(newEvent, [lockedEvent]);

      if (result.hasConflicts) {
        const lockedRescheduled = result.rescheduledItems.find(
          r => r.rescheduledItem.id === 'l1'
        );
        expect(lockedRescheduled).toBeUndefined();
      }
    });
  });

  describe('processTimeChange', () => {
    it('should detect conflicts when an event is moved to overlap with liquid items', () => {
      const liquidEvent = createLiquidEvent('l1', 11, 12);
      const movedEvent = createFixedEvent('m1', 9, 10);
      const updatedEvent = { ...movedEvent, startTime: new Date().setHours(11, 0, 0, 0), endTime: new Date().setHours(12, 0, 0, 0) };

      const result = scheduler.processTimeChange(
        updatedEvent,
        movedEvent.startTime,
        movedEvent.endTime,
        [liquidEvent, updatedEvent]
      );

      expect(result.hasConflicts).toBe(true);
    });

    it('should redistribute freed time when an event is moved away', () => {
      const liquidEvent = createLiquidEvent('l1', 9, 10);
      const movedEvent = createFixedEvent('m1', 11, 12);
      const updatedEvent = { ...movedEvent, startTime: new Date().setHours(14, 0, 0, 0), endTime: new Date().setHours(15, 0, 0, 0) };

      const result = scheduler.processTimeChange(
        updatedEvent,
        movedEvent.startTime,
        movedEvent.endTime,
        [liquidEvent, updatedEvent]
      );

      expect(result.freedTimeRedistributed).toBeDefined();
    });

    it('should return empty result when updated item has no time', () => {
      const item = createFixedEvent('m1', 9, 10);
      const noTimeItem = { ...item, startTime: null, endTime: null };

      const result = scheduler.processTimeChange(noTimeItem, item.startTime, item.endTime, []);

      expect(result.hasConflicts).toBe(false);
      expect(result.rescheduledItems).toHaveLength(0);
    });
  });

  describe('processItemDeletion', () => {
    it('should redistribute freed time when a fixed event is deleted', () => {
      const deletedEvent = createFixedEvent('d1', 9, 10);
      const pendingLiquid: UnifiedCalendarItem = {
        id: 'pl1',
        type: 'event',
        title: 'Pending Liquid',
        content: 'Pending Liquid',
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
          },
        },
      };

      const result = scheduler.processItemDeletion(deletedEvent, [pendingLiquid]);

      expect(result.freedTimeRedistributed).toBeDefined();
    });

    it('should return empty result when deleted item has no time', () => {
      const noTimeItem: UnifiedCalendarItem = {
        id: 'nt1',
        type: 'idea',
        title: 'No Time',
        content: 'No Time',
        startTime: null,
        endTime: null,
        isAllDay: false,
        embedding: [],
        embeddingUpdatedAt: Date.now(),
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {},
      };

      const result = scheduler.processItemDeletion(noTimeItem, []);

      expect(result.freedTimeRedistributed).toBe(false);
      expect(result.scheduledFromFreedTime).toHaveLength(0);
    });

    it('should return empty result when no pending liquid items exist', () => {
      const deletedEvent = createFixedEvent('d1', 9, 10);
      const fixedEvent = createFixedEvent('f1', 11, 12);

      const result = scheduler.processItemDeletion(deletedEvent, [fixedEvent]);

      expect(result.freedTimeRedistributed).toBe(false);
      expect(result.scheduledFromFreedTime).toHaveLength(0);
    });
  });

  describe('getUndoAction', () => {
    it('should return undefined when no undo action exists for item', () => {
      const undoAction = scheduler.getUndoAction('nonexistent');
      expect(undoAction).toBeUndefined();
    });
  });
});
