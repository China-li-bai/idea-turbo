import { SmartScheduler } from './smartScheduler';
import type { UnifiedCalendarItem, LiquidScheduleMetadata, LiquidState, PriorityLevel } from '@/types/unified';

export interface SchedulingCandidate {
  item: UnifiedCalendarItem;
  slot: { start: number; end: number };
  score: number;
  constraintViolations: string[];
}

export interface ScheduleResult {
  scheduled: Array<{
    item: UnifiedCalendarItem;
    slot: { start: number; end: number };
    state: LiquidState;
  }>;
  skipped: Array<{
    item: UnifiedCalendarItem;
    reason: string;
  }>;
  promoted: Array<{
    item: UnifiedCalendarItem;
    fromState: LiquidState;
    toState: LiquidState;
  }>;
}

export interface LiquidSchedulerOptions {
  workHours: { start: number; end: number };
  workDays: number[];
  defaultDuration: number;
  bufferMinutes: number;
  maxSearchDays: number;
  tentativeFillThreshold: number;
  deadlineEscalationHours: number;
}

const DEFAULT_OPTIONS: LiquidSchedulerOptions = {
  workHours: { start: 9, end: 18 },
  workDays: [1, 2, 3, 4, 5],
  defaultDuration: 60,
  bufferMinutes: 15,
  maxSearchDays: 14,
  tentativeFillThreshold: 0.6,
  deadlineEscalationHours: 24,
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'liq-' + Math.random().toString(36).substring(2, 11);
}

export class LiquidSchedulerService {
  private static instance: LiquidSchedulerService;
  private scheduler: SmartScheduler;
  private options: LiquidSchedulerOptions;

  private constructor(options?: Partial<LiquidSchedulerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.scheduler = new SmartScheduler({
      workHours: this.options.workHours,
      workDays: this.options.workDays,
      defaultDuration: this.options.defaultDuration,
      bufferMinutes: this.options.bufferMinutes,
      maxSearchDays: this.options.maxSearchDays,
    });
  }

  static getInstance(): LiquidSchedulerService {
    if (!LiquidSchedulerService.instance) {
      LiquidSchedulerService.instance = new LiquidSchedulerService();
    }
    return LiquidSchedulerService.instance;
  }

  schedulePendingItems(allItems: UnifiedCalendarItem[]): ScheduleResult {
    const result: ScheduleResult = { scheduled: [], skipped: [], promoted: [] };

    const pendingItems = this.getPendingLiquidItems(allItems);
    if (pendingItems.length === 0) return result;

    const escalatedItems = this.escalateNearDeadlineItems(pendingItems);
    for (const item of escalatedItems) {
      result.promoted.push({
        item,
        fromState: item.metadata.liquidSchedule?.liquidState || 'pending',
        toState: 'confirmed',
      });
    }

    const sortedItems = this.sortBySchedulingPriority(pendingItems);

    const scheduledEvents = allItems.filter(
      (i) => i.type === 'event' && i.startTime && i.status === 'scheduled'
    );

    for (const item of sortedItems) {
      const estimatedMinutes = item.metadata.estimatedMinutes || 60;
      const candidates = this.findSchedulingCandidates(item, estimatedMinutes, scheduledEvents);

      if (candidates.length === 0) {
        result.skipped.push({ item, reason: '未找到满足约束的空闲时间槽' });
        continue;
      }

      const best = candidates[0];

      if (best.constraintViolations.length > 0) {
        result.skipped.push({
          item,
          reason: `硬约束冲突: ${best.constraintViolations.join(', ')}`,
        });
        continue;
      }

      const state = this.determineLiquidState(item, allItems);

      result.scheduled.push({
        item,
        slot: best.slot,
        state,
      });

      scheduledEvents.push({
        ...item,
        startTime: best.slot.start,
        endTime: best.slot.end,
        status: 'scheduled',
      });
    }

    this.promoteTentativeItems(allItems, result);

    return result;
  }

  findSchedulingCandidates(
    item: UnifiedCalendarItem,
    durationMinutes: number,
    scheduledEvents: UnifiedCalendarItem[],
    maxCandidates: number = 5
  ): SchedulingCandidate[] {
    const liquidMeta = item.metadata.liquidSchedule;
    const flexibleDuration = liquidMeta?.flexibleDuration;
    const effectiveDuration = flexibleDuration?.preferredMinutes || durationMinutes;

    const searchStart = new Date();
    const slots = this.scheduler.findFreeSlots(
      searchStart,
      effectiveDuration,
      scheduledEvents,
      30
    );

    const availableSlots = slots.filter((s) => s.available);
    const candidates: SchedulingCandidate[] = [];

    for (const slot of availableSlots) {
      const slotRange = { start: slot.start.getTime(), end: slot.end.getTime() };
      const violations = this.checkHardConstraints(item, slotRange);
      const score = this.calculateSchedulingScore(item, slot.start, slot.end, scheduledEvents);

      candidates.push({
        item,
        slot: slotRange,
        score: violations.length > 0 ? -1 : score,
        constraintViolations: violations,
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, maxCandidates);
  }

  checkHardConstraints(
    item: UnifiedCalendarItem,
    proposedSlot: { start: number; end: number }
  ): string[] {
    const constraints = item.metadata.liquidSchedule?.hardConstraints;
    if (!constraints || constraints.length === 0) return [];

    const violations: string[] = [];
    const slotStart = new Date(proposedSlot.start);
    const slotEnd = new Date(proposedSlot.end);

    for (const constraint of constraints) {
      switch (constraint.type) {
        case 'before': {
          if (constraint.date && proposedSlot.end > constraint.date) {
            violations.push(constraint.reason || `必须在 ${new Date(constraint.date).toLocaleDateString()} 之前完成`);
          }
          if (constraint.startTime) {
            const [h, m] = constraint.startTime.split(':').map(Number);
            const limitMs = slotStart.getHours() * 3600000 + slotStart.getMinutes() * 60000;
            const constraintMs = h * 3600000 + m * 60000;
            if (limitMs > constraintMs && proposedSlot.end > proposedSlot.start + (constraintMs - limitMs)) {
              violations.push(constraint.reason || `必须在 ${constraint.startTime} 之前`);
            }
          }
          break;
        }
        case 'after': {
          if (constraint.date && proposedSlot.start < constraint.date) {
            violations.push(constraint.reason || `必须在 ${new Date(constraint.date).toLocaleDateString()} 之后开始`);
          }
          break;
        }
        case 'between': {
          if (constraint.startTime && constraint.endTime) {
            const [startH, startM] = constraint.startTime.split(':').map(Number);
            const [endH, endM] = constraint.endTime.split(':').map(Number);
            const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
            const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes();
            const windowStart = startH * 60 + startM;
            const windowEnd = endH * 60 + endM;
            if (slotStartMinutes < windowStart || slotEndMinutes > windowEnd) {
              violations.push(constraint.reason || `必须在 ${constraint.startTime}-${constraint.endTime} 之间`);
            }
          }
          break;
        }
        case 'on': {
          if (constraint.date) {
            const constraintDate = new Date(constraint.date);
            if (
              slotStart.getFullYear() !== constraintDate.getFullYear() ||
              slotStart.getMonth() !== constraintDate.getMonth() ||
              slotStart.getDate() !== constraintDate.getDate()
            ) {
              violations.push(constraint.reason || `必须在 ${constraintDate.toLocaleDateString()} 当天`);
            }
          }
          break;
        }
      }
    }

    return violations;
  }

  calculateSchedulingScore(
    item: UnifiedCalendarItem,
    slotStart: Date,
    slotEnd: Date,
    _scheduledEvents: UnifiedCalendarItem[]
  ): number {
    const liquidMeta = item.metadata.liquidSchedule;
    let score = 50;

    const preferredSlots = liquidMeta?.preferredTimeSlots;
    if (preferredSlots && preferredSlots.length > 0) {
      for (const pref of preferredSlots) {
        const slotHour = slotStart.getHours();
        const slotDay = slotStart.getDay();

        if (pref.startHour !== undefined && slotHour >= pref.startHour) {
          score += (pref.score || 10);
        }
        if (pref.endHour !== undefined && slotHour < pref.endHour) {
          score += (pref.score || 10);
        }
        if (pref.dayOfWeek !== undefined && slotDay === pref.dayOfWeek) {
          score += (pref.score || 5);
        }
      }
    }

    const priorityLevel = liquidMeta?.priorityLevel || 3;
    score += (5 - priorityLevel) * 10;

    const rescheduleCount = item.metadata.rescheduleCount || 0;
    const stabilityBonus = Math.min(rescheduleCount * 3, 15);
    score += stabilityBonus;

    const deadline = liquidMeta?.deadline;
    if (deadline) {
      const hoursUntilDeadline = (deadline - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDeadline < 24) {
        score += 20;
      } else if (hoursUntilDeadline < 48) {
        score += 10;
      }
    }

    const now = new Date();
    const daysAhead = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAhead < 1) {
      score += 5;
    } else if (daysAhead < 3) {
      score += 3;
    }

    const hour = slotStart.getHours();
    if (hour >= 10 && hour <= 11) {
      score += 5;
    } else if (hour >= 14 && hour <= 15) {
      score += 3;
    }

    return score;
  }

  applyScheduleResult(
    items: UnifiedCalendarItem[],
    result: ScheduleResult
  ): UnifiedCalendarItem[] {
    let updated = [...items];

    for (const scheduled of result.scheduled) {
      updated = updated.map((item) => {
        if (item.id !== scheduled.item.id) return item;
        return {
          ...item,
          startTime: scheduled.slot.start,
          endTime: scheduled.slot.end,
          status: 'scheduled' as const,
          updatedAt: Date.now(),
          metadata: {
            ...item.metadata,
            liquidSchedule: {
              ...item.metadata.liquidSchedule,
              liquidState: scheduled.state,
              scheduledBy: 'auto' as const,
              lastScheduledAt: Date.now(),
              constraintCheckPassed: true,
              constraintViolations: [],
            },
          },
        };
      });
    }

    for (const promoted of result.promoted) {
      updated = updated.map((item) => {
        if (item.id !== promoted.item.id) return item;
        return {
          ...item,
          updatedAt: Date.now(),
          metadata: {
            ...item.metadata,
            liquidSchedule: {
              ...item.metadata.liquidSchedule,
              liquidState: promoted.toState,
            },
          },
        };
      });
    }

    return updated;
  }

  handleItemCompletion(
    completedItem: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[]
  ): ScheduleResult {
    const pendingItems = this.getPendingLiquidItems(allItems);
    if (pendingItems.length === 0) {
      return { scheduled: [], skipped: [], promoted: [] };
    }

    const freedSlot = completedItem.startTime && completedItem.endTime
      ? { start: completedItem.startTime, end: completedItem.endTime }
      : null;

    if (!freedSlot) {
      return this.schedulePendingItems(allItems);
    }

    const remaining = allItems.filter((i) => i.id !== completedItem.id);
    const scheduledEvents = remaining.filter(
      (i) => i.type === 'event' && i.startTime && i.status === 'scheduled'
    );

    const sortedPending = this.sortBySchedulingPriority(pendingItems);
    const result: ScheduleResult = { scheduled: [], skipped: [], promoted: [] };

    for (const item of sortedPending) {
      const estimatedMinutes = item.metadata.estimatedMinutes || 60;
      const slotDuration = (freedSlot.end - freedSlot.start) / (1000 * 60);

      if (slotDuration >= estimatedMinutes * 0.5) {
        const effectiveEnd = Math.min(
          freedSlot.start + estimatedMinutes * 60 * 1000,
          freedSlot.end
        );
        const proposedSlot = { start: freedSlot.start, end: effectiveEnd };
        const violations = this.checkHardConstraints(item, proposedSlot);

        if (violations.length === 0) {
          const state = this.determineLiquidState(item, remaining);
          result.scheduled.push({ item, slot: proposedSlot, state });
          break;
        }
      }
    }

    if (result.scheduled.length === 0) {
      return this.schedulePendingItems(remaining);
    }

    return result;
  }

  private getPendingLiquidItems(items: UnifiedCalendarItem[]): UnifiedCalendarItem[] {
    return items.filter(
      (item) =>
        item.type === 'event' &&
        item.metadata?.liquidSchedule?.liquidGroupId &&
        (item.status === 'pending' || item.metadata.liquidSchedule.liquidState === 'pending') &&
        !item.startTime
    );
  }

  private sortBySchedulingPriority(items: UnifiedCalendarItem[]): UnifiedCalendarItem[] {
    return [...items].sort((a, b) => {
      const aDeadline = a.metadata.liquidSchedule?.deadline;
      const bDeadline = b.metadata.liquidSchedule?.deadline;

      if (aDeadline && bDeadline) {
        return aDeadline - bDeadline;
      }
      if (aDeadline) return -1;
      if (bDeadline) return 1;

      const aPriority = a.metadata.liquidSchedule?.priorityLevel || 3;
      const bPriority = b.metadata.liquidSchedule?.priorityLevel || 3;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aStability = a.metadata.liquidSchedule?.stabilityScore || 0;
      const bStability = b.metadata.liquidSchedule?.stabilityScore || 0;
      return bStability - aStability;
    });
  }

  private escalateNearDeadlineItems(items: UnifiedCalendarItem[]): UnifiedCalendarItem[] {
    const now = Date.now();
    const escalationMs = this.options.deadlineEscalationHours * 60 * 60 * 1000;

    return items.filter((item) => {
      const deadline = item.metadata.liquidSchedule?.deadline;
      if (!deadline) return false;
      return deadline - now < escalationMs;
    });
  }

  private determineLiquidState(
    item: UnifiedCalendarItem,
    allItems: UnifiedCalendarItem[]
  ): LiquidState {
    const currentState = item.metadata.liquidSchedule?.liquidState;
    if (currentState === 'locked') return 'locked';

    const deadline = item.metadata.liquidSchedule?.deadline;
    const now = Date.now();
    const escalationMs = this.options.deadlineEscalationHours * 60 * 60 * 1000;

    if (deadline && deadline - now < escalationMs) {
      return 'confirmed';
    }

    const priorityLevel = item.metadata.liquidSchedule?.priorityLevel || 3;
    if (priorityLevel <= 2) return 'confirmed';

    const scheduledCount = allItems.filter(
      (i) => i.type === 'event' && i.startTime && i.status === 'scheduled'
    ).length;
    const workDayMinutes = (this.options.workHours.end - this.options.workHours.start) * 60;
    const weekMinutes = workDayMinutes * this.options.workDays.length;
    const utilization = scheduledCount > 0 ? scheduledCount / (weekMinutes / 60) : 0;

    if (utilization > this.options.tentativeFillThreshold) {
      return 'confirmed';
    }

    return 'tentative';
  }

  private promoteTentativeItems(
    allItems: UnifiedCalendarItem[],
    result: ScheduleResult
  ): void {
    const tentativeItems = allItems.filter(
      (item) =>
        item.type === 'event' &&
        item.startTime &&
        item.status === 'scheduled' &&
        item.metadata?.liquidSchedule?.liquidState === 'tentative'
    );

    const scheduledCount = allItems.filter(
      (i) => i.type === 'event' && i.startTime && i.status === 'scheduled'
    ).length;
    const workDayMinutes = (this.options.workHours.end - this.options.workHours.start) * 60;
    const weekMinutes = workDayMinutes * this.options.workDays.length;
    const utilization = scheduledCount / (weekMinutes / 60);

    if (utilization > this.options.tentativeFillThreshold) {
      for (const item of tentativeItems) {
        const deadline = item.metadata.liquidSchedule?.deadline;
        const now = Date.now();
        const escalationMs = this.options.deadlineEscalationHours * 60 * 60 * 1000;

        const shouldPromote =
          (deadline && deadline - now < escalationMs) ||
          item.metadata.liquidSchedule?.priorityLevel === 1 ||
          item.metadata.liquidSchedule?.priorityLevel === 2;

        if (shouldPromote) {
          result.promoted.push({
            item,
            fromState: 'tentative',
            toState: 'confirmed',
          });
        }
      }
    }
  }

  createLiquidItem(
    title: string,
    parentGoalId: string,
    options: {
      description?: string;
      estimatedMinutes?: number;
      priority?: 'high' | 'medium' | 'low';
      priorityLevel?: PriorityLevel;
      deadline?: number;
      preferredTimeSlots?: LiquidScheduleMetadata['preferredTimeSlots'];
      hardConstraints?: LiquidScheduleMetadata['hardConstraints'];
    } = {}
  ): UnifiedCalendarItem {
    const now = Date.now();
    const liquidGroupId = generateId();

    const priorityLevelMap: Record<string, PriorityLevel> = {
      high: 1,
      medium: 2,
      low: 3,
    };

    const effectivePriorityLevel =
      options.priorityLevel ||
      (options.priority ? priorityLevelMap[options.priority] : 3);

    const liquidMetadata: LiquidScheduleMetadata = {
      liquidGroupId,
      liquidPriority: 5 - effectivePriorityLevel,
      liquidState: 'pending',
      priorityLevel: effectivePriorityLevel,
      deadline: options.deadline,
      stabilityScore: 0,
      flexibleDuration: options.estimatedMinutes
        ? {
            preferredMinutes: options.estimatedMinutes,
            minMinutes: Math.floor(options.estimatedMinutes * 0.5),
            maxMinutes: options.estimatedMinutes * 2,
          }
        : undefined,
      preferredTimeSlots: options.preferredTimeSlots,
      hardConstraints: options.hardConstraints,
    };

    return {
      id: generateId(),
      type: 'event',
      title,
      content: options.description || '',
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: [],
      embeddingUpdatedAt: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      metadata: {
        parentGoalId,
        estimatedMinutes: options.estimatedMinutes,
        priority: options.priority || 'medium',
        liquidSchedule: liquidMetadata,
        rescheduleCount: 0,
      },
    };
  }
}

export const liquidScheduler = LiquidSchedulerService.getInstance();
