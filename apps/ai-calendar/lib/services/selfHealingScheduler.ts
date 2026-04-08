import { SmartScheduler } from './smartScheduler';
import type { UnifiedCalendarItem, LiquidScheduleMetadata } from '@/types/unified';
import { taskDecomposerService } from './taskDecomposerService';

export interface RescheduleResult {
  originalItem: UnifiedCalendarItem;
  newSlot: { start: number; end: number } | null;
  rescheduledItem: UnifiedCalendarItem;
  success: boolean;
  reason: string;
}

export interface ConflictInfo {
  liquidItem: UnifiedCalendarItem;
  conflictLevel: 'full' | 'partial';
  suggestedNewSlot: { start: number; end: number } | null;
}

export interface SelfHealingResult {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];
  rescheduledItems: RescheduleResult[];
  failedReschedules: Array<{ item: UnifiedCalendarItem; reason: string }>;
  newEventAdded: boolean;
}

export class SelfHealingScheduler {
  private static instance: SelfHealingScheduler;
  private scheduler: SmartScheduler;

  private constructor() {
    this.scheduler = new SmartScheduler({
      workHours: { start: 9, end: 18 },
      workDays: [1, 2, 3, 4, 5],
      defaultDuration: 60,
      bufferMinutes: 15,
      maxSearchDays: 14
    });
  }

  static getInstance(): SelfHealingScheduler {
    if (!SelfHealingScheduler.instance) {
      SelfHealingScheduler.instance = new SelfHealingScheduler();
    }
    return SelfHealingScheduler.instance;
  }

  detectLiquidConflicts(
    newEvent: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[]
  ): ConflictInfo[] {
    if (!newEvent.startTime || !newEvent.endTime) {
      return [];
    }

    const liquidItems = taskDecomposerService.getPendingLiquidItems(allItems);
    const scheduledItems = allItems.filter(item =>
      item.type === 'event' &&
      item.startTime &&
      item.status === 'scheduled'
    );

    const conflicts: ConflictInfo[] = [];

    for (const liquidItem of liquidItems) {
      const estimatedMinutes = liquidItem.metadata?.estimatedMinutes || 60;
      const newStart = new Date(newEvent.startTime);
      const newEnd = new Date(newEvent.endTime);

      const liquidStart = liquidItem.metadata?.liquidSchedule?.flexibleDuration
        ? this.findNearestAvailableTime(
            new Date(newStart.getTime() + 24 * 60 * 60 * 1000),
            estimatedMinutes,
            scheduledItems
          )
        : this.findNearestAvailableTime(
            newStart,
            estimatedMinutes,
            scheduledItems
          );

      if (this.isOverlapping(
        newStart.getTime(),
        newEnd.getTime(),
        liquidStart?.getTime() || liquidItem.startTime || 0,
        (liquidStart?.getTime() || 0) + estimatedMinutes * 60 * 1000
      )) {
        conflicts.push({
          liquidItem,
          conflictLevel: 'partial',
          suggestedNewSlot: liquidStart
            ? { start: liquidStart.getTime(), end: liquidStart.getTime() + estimatedMinutes * 60 * 1000 }
            : null
        });
      }
    }

    return conflicts;
  }

  findBestRescheduleSlot(
    item: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[],
    searchDays: number = 14
  ): { start: number; end: number } | null {
    const estimatedMinutes = item.metadata?.estimatedMinutes || 60;
    const scheduledEvents = allItems.filter(
      i => i.type === 'event' && i.startTime && i.status === 'scheduled'
    );

    const preferredSlots = item.metadata?.liquidSchedule?.preferredTimeSlots;

    const searchStart = new Date();
    if (preferredSlots && preferredSlots.length > 0) {
      const firstSlot = preferredSlots[0];
      if (firstSlot.startHour !== undefined) {
        searchStart.setHours(firstSlot.startHour, 0, 0, 0);
      }
    }

    const slots = this.scheduler.findFreeSlots(
      searchStart,
      estimatedMinutes,
      scheduledEvents,
      30
    );

    const availableSlots = slots.filter(slot => slot.available);

    if (preferredSlots && preferredSlots.length > 0 && availableSlots.length > 0) {
      const scoredSlots = availableSlots.map(slot => {
        let score = 1;
        for (const pref of preferredSlots) {
          const slotHour = slot.start.getHours();
          if (pref.startHour !== undefined && slotHour >= pref.startHour) {
            score += (pref.score || 1);
          }
          if (pref.dayOfWeek !== undefined && slot.start.getDay() === pref.dayOfWeek) {
            score += (pref.score || 1);
          }
        }
        return { slot, score };
      });

      scoredSlots.sort((a, b) => b.score - a.score);
      const best = scoredSlots[0].slot;
      return { start: best.start.getTime(), end: best.end.getTime() };
    }

    if (availableSlots.length > 0) {
      const best = availableSlots[0];
      return { start: best.start.getTime(), end: best.end.getTime() };
    }

    return null;
  }

  rescheduleItem(
    item: UnifiedCalendarItem,
    newSlot: { start: number; end: number }
  ): RescheduleResult {
    const rescheduledItem = taskDecomposerService.updateItemReschedule(
      item,
      newSlot.start,
      newSlot.end,
      'auto_reschedule_conflict'
    );

    return {
      originalItem: item,
      newSlot,
      rescheduledItem,
      success: true,
      reason: `自动重排到 ${new Date(newSlot.start).toLocaleString()}`
    };
  }

  processNewEvent(
    newEvent: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[]
  ): SelfHealingResult {
    const conflicts = this.detectLiquidConflicts(newEvent, allItems);

    if (conflicts.length === 0) {
      return {
        hasConflicts: false,
        conflicts: [],
        rescheduledItems: [],
        failedReschedules: [],
        newEventAdded: true
      };
    }

    const rescheduledItems: RescheduleResult[] = [];
    const failedReschedules: Array<{ item: UnifiedCalendarItem; reason: string }> = [];

    for (const conflict of conflicts) {
      const newSlot = conflict.suggestedNewSlot ||
        this.findBestRescheduleSlot(conflict.liquidItem, allItems);

      if (newSlot) {
        const result = this.rescheduleItem(conflict.liquidItem, newSlot);
        rescheduledItems.push(result);
      } else {
        failedReschedules.push({
          item: conflict.liquidItem,
          reason: '未找到合适的重排时间槽'
        });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      rescheduledItems,
      failedReschedules,
      newEventAdded: true
    };
  }

  private findNearestAvailableTime(
    startFrom: Date,
    durationMinutes: number,
    scheduledEvents: UnifiedCalendarItem[]
  ): Date | null {
    const searchStart = new Date(startFrom);
    searchStart.setHours(9, 0, 0, 0);

    if (searchStart < new Date()) {
      searchStart.setTime(new Date().getTime());
      searchStart.setHours(searchStart.getHours() + 1, 0, 0, 0);
    }

    for (let day = 0; day < 14; day++) {
      const dayStart = new Date(searchStart);
      dayStart.setDate(dayStart.getDate() + day);
      dayStart.setHours(9, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(18, 0, 0, 0);

      const eventsOnDay = scheduledEvents.filter(e => {
        if (!e.startTime || !e.endTime) return false;
        const eventStart = new Date(e.startTime);
        return eventStart >= dayStart && eventStart < dayEnd;
      });

      eventsOnDay.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

      let current = new Date(dayStart);
      while (current.getTime() + durationMinutes * 60 * 1000 <= dayEnd.getTime()) {
        const slotEnd = new Date(current.getTime() + durationMinutes * 60 * 1000);

        const hasConflict = eventsOnDay.some(event => {
          return this.isOverlapping(
            current.getTime(),
            slotEnd.getTime(),
            event.startTime || 0,
            event.endTime || 0
          );
        });

        if (!hasConflict) {
          return current;
        }

        const nextHour = new Date(current);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        current = nextHour;
      }
    }

    return null;
  }

  private isOverlapping(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }
}

export const selfHealingScheduler = SelfHealingScheduler.getInstance();
