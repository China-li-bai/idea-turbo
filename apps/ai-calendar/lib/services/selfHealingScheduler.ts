import { SmartScheduler } from './smartScheduler';
import { liquidScheduler } from './liquidSchedulerService';
import type { UnifiedCalendarItem, LiquidScheduleMetadata, PriorityLevel } from '@/types/unified';
import { taskDecomposerService } from './taskDecomposerService';

export interface RescheduleResult {
  originalItem: UnifiedCalendarItem;
  newSlot: { start: number; end: number } | null;
  rescheduledItem: UnifiedCalendarItem;
  success: boolean;
  reason: string;
  needsConfirmation: boolean;
  hardConstraintViolated: boolean;
}

export interface ConflictInfo {
  liquidItem: UnifiedCalendarItem;
  conflictLevel: 'full' | 'partial';
  suggestedNewSlot: { start: number; end: number } | null;
  canAutoResolve: boolean;
  priorityComparison: 'new_higher' | 'existing_higher' | 'equal';
}

export interface SelfHealingResult {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];
  rescheduledItems: RescheduleResult[];
  failedReschedules: Array<{ item: UnifiedCalendarItem; reason: string }>;
  newEventAdded: boolean;
  itemsNeedingConfirmation: RescheduleResult[];
  freedTimeRedistributed: boolean;
}

export interface UndoAction {
  itemId: string;
  originalSlot: { start: number; end: number };
  originalState: string;
  timestamp: number;
}

export class SelfHealingScheduler {
  private static instance: SelfHealingScheduler;
  private scheduler: SmartScheduler;
  private undoStack: UndoAction[] = [];
  private readonly MAX_UNDO_AGE_MS = 30 * 1000;

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

    const scheduledLiquidItems = allItems.filter(item =>
      item.type === 'event' &&
      item.startTime &&
      item.endTime &&
      item.status === 'scheduled' &&
      item.metadata?.liquidSchedule?.liquidGroupId
    );

    const conflicts: ConflictInfo[] = [];

    for (const liquidItem of scheduledLiquidItems) {
      if (!liquidItem.startTime || !liquidItem.endTime) continue;

      if (this.isOverlapping(
        newEvent.startTime,
        newEvent.endTime,
        liquidItem.startTime,
        liquidItem.endTime
      )) {
        const liquidState = liquidItem.metadata.liquidSchedule?.liquidState;
        if (liquidState === 'locked') continue;

        const newPriority = this.getEffectivePriority(newEvent);
        const existingPriority = this.getEffectivePriority(liquidItem);

        const priorityComparison: ConflictInfo['priorityComparison'] =
          newPriority < existingPriority ? 'new_higher' :
          newPriority > existingPriority ? 'existing_higher' : 'equal';

        const canAutoResolve = priorityComparison === 'new_higher' &&
          liquidState !== 'confirmed' &&
          this.canDisplaceItem(liquidItem);

        const estimatedMinutes = liquidItem.metadata?.estimatedMinutes || 60;
        const suggestedSlot = this.findBestRescheduleSlot(liquidItem, allItems);

        conflicts.push({
          liquidItem,
          conflictLevel: this.calculateConflictLevel(newEvent, liquidItem),
          suggestedNewSlot: suggestedSlot
            ? { start: suggestedSlot.start, end: suggestedSlot.end }
            : null,
          canAutoResolve,
          priorityComparison
        });
      }
    }

    const pendingLiquidItems = taskDecomposerService.getPendingLiquidItems(allItems);
    for (const pendingItem of pendingLiquidItems) {
      const estimatedMinutes = pendingItem.metadata?.estimatedMinutes || 60;
      const potentialStart = newEvent.startTime;
      const potentialEnd = potentialStart + estimatedMinutes * 60 * 1000;

      if (this.isOverlapping(
        newEvent.startTime,
        newEvent.endTime,
        potentialStart,
        potentialEnd
      )) {
        conflicts.push({
          liquidItem: pendingItem,
          conflictLevel: 'partial',
          suggestedNewSlot: null,
          canAutoResolve: true,
          priorityComparison: 'new_higher'
        });
      }
    }

    return conflicts;
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
        newEventAdded: true,
        itemsNeedingConfirmation: [],
        freedTimeRedistributed: false
      };
    }

    const rescheduledItems: RescheduleResult[] = [];
    const failedReschedules: Array<{ item: UnifiedCalendarItem; reason: string }> = [];
    const itemsNeedingConfirmation: RescheduleResult[] = [];

    for (const conflict of conflicts) {
      const newSlot = conflict.suggestedNewSlot ||
        this.findBestRescheduleSlot(conflict.liquidItem, allItems);

      if (!newSlot) {
        failedReschedules.push({
          item: conflict.liquidItem,
          reason: '未找到合适的重排时间槽'
        });
        continue;
      }

      const constraintViolations = liquidScheduler.checkHardConstraints(
        conflict.liquidItem,
        newSlot
      );

      if (constraintViolations.length > 0) {
        failedReschedules.push({
          item: conflict.liquidItem,
          reason: `硬约束冲突: ${constraintViolations.join(', ')}`
        });
        continue;
      }

      const needsConfirmation = this.shouldRequireConfirmation(
        conflict.liquidItem,
        conflict.priorityComparison
      );

      const result = this.rescheduleItem(conflict.liquidItem, newSlot, needsConfirmation);
      rescheduledItems.push(result);

      if (needsConfirmation) {
        itemsNeedingConfirmation.push(result);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      rescheduledItems,
      failedReschedules,
      newEventAdded: true,
      itemsNeedingConfirmation,
      freedTimeRedistributed: false
    };
  }

  processTimeChange(
    updatedItem: UnifiedCalendarItem,
    oldStartTime: number | null,
    oldEndTime: number | null,
    allItems: UnifiedCalendarItem[]
  ): SelfHealingResult {
    if (!updatedItem.startTime || !updatedItem.endTime) {
      return {
        hasConflicts: false,
        conflicts: [],
        rescheduledItems: [],
        failedReschedules: [],
        newEventAdded: false,
        itemsNeedingConfirmation: [],
        freedTimeRedistributed: false
      };
    }

    const result = this.processNewEvent(updatedItem, allItems);

    if (oldStartTime && oldEndTime) {
      const freedSlot = { start: oldStartTime, end: oldEndTime };
      const redistributed = this.redistributeFreedTime(freedSlot, allItems);
      result.freedTimeRedistributed = redistributed;
    }

    return result;
  }

  processItemDeletion(
    deletedItem: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[]
  ): { freedTimeRedistributed: boolean; scheduledFromFreedTime: RescheduleResult[] } {
    if (!deletedItem.startTime || !deletedItem.endTime) {
      return { freedTimeRedistributed: false, scheduledFromFreedTime: [] };
    }

    const freedSlot = { start: deletedItem.startTime, end: deletedItem.endTime };
    const remaining = allItems.filter(i => i.id !== deletedItem.id);

    const pendingLiquidItems = remaining.filter(
      item =>
        item.type === 'event' &&
        item.metadata?.liquidSchedule?.liquidGroupId &&
        (item.status === 'pending' || !item.startTime)
    );

    if (pendingLiquidItems.length === 0) {
      return { freedTimeRedistributed: false, scheduledFromFreedTime: [] };
    }

    const scheduledEvents = remaining.filter(
      i => i.type === 'event' && i.startTime && i.status === 'scheduled'
    );

    const sorted = this.sortByDisplacementPriority(pendingLiquidItems);
    const results: RescheduleResult[] = [];

    for (const item of sorted) {
      const estimatedMinutes = item.metadata.estimatedMinutes || 60;
      const slotDuration = (freedSlot.end - freedSlot.start) / (1000 * 60);

      if (slotDuration >= estimatedMinutes * 0.5) {
        const effectiveEnd = Math.min(
          freedSlot.start + estimatedMinutes * 60 * 1000,
          freedSlot.end
        );
        const proposedSlot = { start: freedSlot.start, end: effectiveEnd };
        const violations = liquidScheduler.checkHardConstraints(item, proposedSlot);

        if (violations.length === 0) {
          const rescheduleResult = this.rescheduleItem(item, proposedSlot, false);
          results.push(rescheduleResult);
          break;
        }
      }
    }

    return {
      freedTimeRedistributed: results.length > 0,
      scheduledFromFreedTime: results
    };
  }

  processItemCompletion(
    completedItem: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[]
  ): { freedTimeRedistributed: boolean; scheduledFromFreedTime: RescheduleResult[] } {
    return this.processItemDeletion(completedItem, allItems);
  }

  findBestRescheduleSlot(
    item: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[],
    _searchDays: number = 14
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

    if (availableSlots.length === 0) return null;

    const scoredSlots = availableSlots.map(slot => {
      let score = 0;

      if (preferredSlots && preferredSlots.length > 0) {
        for (const pref of preferredSlots) {
          const slotHour = slot.start.getHours();
          if (pref.startHour !== undefined && slotHour >= pref.startHour) {
            score += (pref.score || 10);
          }
          if (pref.dayOfWeek !== undefined && slot.start.getDay() === pref.dayOfWeek) {
            score += (pref.score || 5);
          }
        }
      }

      const rescheduleCount = item.metadata?.rescheduleCount || 0;
      const stabilityBonus = Math.min(rescheduleCount * 3, 15);
      score += stabilityBonus;

      const deadline = item.metadata?.liquidSchedule?.deadline;
      if (deadline) {
        const hoursUntilDeadline = (deadline - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilDeadline < 24) {
          score += 20;
        } else if (hoursUntilDeadline < 48) {
          score += 10;
        }
      }

      const daysAhead = (slot.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysAhead < 1) score += 5;
      else if (daysAhead < 3) score += 3;

      return { slot, score };
    });

    scoredSlots.sort((a, b) => b.score - a.score);

    for (const { slot } of scoredSlots) {
      const proposedSlot = { start: slot.start.getTime(), end: slot.end.getTime() };
      const violations = liquidScheduler.checkHardConstraints(item, proposedSlot);
      if (violations.length === 0) {
        return proposedSlot;
      }
    }

    const best = scoredSlots[0].slot;
    return { start: best.start.getTime(), end: best.end.getTime() };
  }

  rescheduleItem(
    item: UnifiedCalendarItem,
    newSlot: { start: number; end: number },
    needsConfirmation: boolean = false
  ): RescheduleResult {
    this.pushUndoAction(item);

    const rescheduledItem = taskDecomposerService.updateItemReschedule(
      item,
      newSlot.start,
      newSlot.end,
      'auto_reschedule_conflict'
    );

    const updatedMetadata = {
      ...rescheduledItem.metadata,
      liquidSchedule: {
        ...rescheduledItem.metadata.liquidSchedule,
        scheduledBy: 'auto' as const,
        lastScheduledAt: Date.now(),
      }
    };

    return {
      originalItem: item,
      newSlot,
      rescheduledItem: { ...rescheduledItem, metadata: updatedMetadata },
      success: true,
      reason: `自动重排到 ${new Date(newSlot.start).toLocaleString()}`,
      needsConfirmation,
      hardConstraintViolated: false
    };
  }

  getUndoAction(itemId: string): UndoAction | undefined {
    this.cleanExpiredUndoActions();
    return this.undoStack.find(a => a.itemId === itemId);
  }

  getAllUndoActions(): UndoAction[] {
    this.cleanExpiredUndoActions();
    return [...this.undoStack];
  }

  clearUndoAction(itemId: string): void {
    this.undoStack = this.undoStack.filter(a => a.itemId !== itemId);
  }

  private getEffectivePriority(item: UnifiedCalendarItem): number {
    const priorityLevel = item.metadata?.liquidSchedule?.priorityLevel;
    if (priorityLevel) return priorityLevel;

    const priority = item.metadata?.priority;
    const map: Record<string, number> = { high: 1, medium: 2, low: 3 };
    return map[priority || 'medium'] || 3;
  }

  private canDisplaceItem(item: UnifiedCalendarItem): boolean {
    const state = item.metadata?.liquidSchedule?.liquidState;
    if (state === 'locked') return false;

    const rescheduleCount = item.metadata?.rescheduleCount || 0;
    if (rescheduleCount >= 5) return false;

    const deadline = item.metadata?.liquidSchedule?.deadline;
    if (deadline) {
      const hoursUntilDeadline = (deadline - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDeadline < 4) return false;
    }

    return true;
  }

  private shouldRequireConfirmation(
    item: UnifiedCalendarItem,
    priorityComparison: ConflictInfo['priorityComparison']
  ): boolean {
    if (priorityComparison === 'existing_higher') return true;

    const priorityLevel = item.metadata?.liquidSchedule?.priorityLevel || 3;
    if (priorityLevel <= 2) return true;

    const state = item.metadata?.liquidSchedule?.liquidState;
    if (state === 'confirmed') return true;

    const rescheduleCount = item.metadata?.rescheduleCount || 0;
    if (rescheduleCount >= 3) return true;

    return false;
  }

  private calculateConflictLevel(
    newEvent: UnifiedCalendarItem,
    existingItem: UnifiedCalendarItem
  ): 'full' | 'partial' {
    if (!newEvent.startTime || !newEvent.endTime || !existingItem.startTime || !existingItem.endTime) {
      return 'partial';
    }

    const overlapStart = Math.max(newEvent.startTime, existingItem.startTime);
    const overlapEnd = Math.min(newEvent.endTime, existingItem.endTime);
    const overlapDuration = overlapEnd - overlapStart;
    const existingDuration = existingItem.endTime - existingItem.startTime;

    return overlapDuration >= existingDuration * 0.8 ? 'full' : 'partial';
  }

  private redistributeFreedTime(
    freedSlot: { start: number; end: number },
    allItems: UnifiedCalendarItem[]
  ): boolean {
    const pendingItems = allItems.filter(
      item =>
        item.type === 'event' &&
        item.metadata?.liquidSchedule?.liquidGroupId &&
        (item.status === 'pending' || !item.startTime)
    );

    if (pendingItems.length === 0) return false;

    const sorted = this.sortByDisplacementPriority(pendingItems);
    const slotDurationMinutes = (freedSlot.end - freedSlot.start) / (1000 * 60);

    for (const item of sorted) {
      const estimatedMinutes = item.metadata.estimatedMinutes || 60;
      if (slotDurationMinutes >= estimatedMinutes * 0.5) {
        return true;
      }
    }

    return false;
  }

  private sortByDisplacementPriority(items: UnifiedCalendarItem[]): UnifiedCalendarItem[] {
    return [...items].sort((a, b) => {
      const aDeadline = a.metadata?.liquidSchedule?.deadline;
      const bDeadline = b.metadata?.liquidSchedule?.deadline;
      if (aDeadline && bDeadline) return aDeadline - bDeadline;
      if (aDeadline) return -1;
      if (bDeadline) return 1;

      const aPriority = a.metadata?.liquidSchedule?.priorityLevel || 3;
      const bPriority = b.metadata?.liquidSchedule?.priorityLevel || 3;
      if (aPriority !== bPriority) return aPriority - bPriority;

      return 0;
    });
  }

  private pushUndoAction(item: UnifiedCalendarItem): void {
    if (item.startTime && item.endTime) {
      this.undoStack.push({
        itemId: item.id,
        originalSlot: { start: item.startTime, end: item.endTime },
        originalState: item.metadata?.liquidSchedule?.liquidState || 'pending',
        timestamp: Date.now()
      });
    }
    this.cleanExpiredUndoActions();
  }

  private cleanExpiredUndoActions(): void {
    const now = Date.now();
    this.undoStack = this.undoStack.filter(
      a => now - a.timestamp < this.MAX_UNDO_AGE_MS
    );
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
