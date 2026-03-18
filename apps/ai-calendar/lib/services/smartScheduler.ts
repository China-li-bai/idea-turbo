import {
  areIntervalsOverlapping,
  differenceInMinutes,
  addMinutes,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  isEqual,
  getDay,
  format,
  parseISO
} from 'date-fns';
import type { UnifiedCalendarItem } from '@/types/unified';

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  conflictWith?: UnifiedCalendarItem;
}

export interface SchedulingSuggestion {
  suggestedStart: Date;
  suggestedEnd: Date;
  confidence: number;
  alternatives: Array<{ start: Date; end: Date }>;
  conflicts: UnifiedCalendarItem[];
  relatedItems: UnifiedCalendarItem[];
  reason: string;
}

export interface SchedulerOptions {
  workHours: {
    start: number;
    end: number;
  };
  workDays: number[];
  defaultDuration: number;
  bufferMinutes: number;
  maxSearchDays: number;
}

const DEFAULT_OPTIONS: SchedulerOptions = {
  workHours: { start: 9, end: 18 },
  workDays: [1, 2, 3, 4, 5],
  defaultDuration: 60,
  bufferMinutes: 15,
  maxSearchDays: 14
};

export class SmartScheduler {
  private options: SchedulerOptions;

  constructor(options?: Partial<SchedulerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  findFreeSlots(
    date: Date,
    duration: number,
    existingEvents: UnifiedCalendarItem[],
    slotInterval: number = 30
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dayStart = this.getWorkDayStart(date);
    const dayEnd = this.getWorkDayEnd(date);

    if (!this.isWorkDay(date)) {
      return slots;
    }

    const dayEvents = this.getEventsInDay(date, existingEvents);

    let current = new Date(dayStart);
    while (isBefore(current, dayEnd)) {
      const slotEnd = addMinutes(current, duration);

      if (isAfter(slotEnd, dayEnd)) {
        break;
      }

      const conflict = this.findConflict(current, slotEnd, dayEvents);

      slots.push({
        start: new Date(current),
        end: new Date(slotEnd),
        available: !conflict,
        conflictWith: conflict
      });

      current = addMinutes(current, slotInterval);
    }

    return slots;
  }

  findBestTimeSlot(
    duration: number,
    preferences: {
      preferredDate?: number;
      preferredTime?: string;
      avoidWeekends?: boolean;
    },
    allItems: UnifiedCalendarItem[]
  ): SchedulingSuggestion {
    const scheduledEvents = this.getScheduledEvents(allItems);

    if (preferences.preferredDate || preferences.preferredTime) {
      const preferredStart = this.buildPreferredDateTime(preferences);
      const preferredEnd = addMinutes(preferredStart, duration);
      const conflicts = this.checkConflict(preferredStart, preferredEnd, scheduledEvents);

      if (conflicts.length === 0) {
        return {
          suggestedStart: preferredStart,
          suggestedEnd: preferredEnd,
          confidence: 0.95,
          alternatives: [],
          conflicts: [],
          relatedItems: this.findRelatedItems(preferredStart, allItems),
          reason: `按照您指定的时间安排：${format(preferredStart, 'M月d日 HH:mm')} - ${format(preferredEnd, 'HH:mm')}`
        };
      }
    }

    const searchStart = preferences.preferredDate
      ? new Date(preferences.preferredDate)
      : new Date();

    if (preferences.preferredTime) {
      const [hours, minutes] = preferences.preferredTime.split(':').map(Number);
      searchStart.setHours(hours || 0, minutes || 0, 0, 0);
    }

    const slots = this.findAvailableSlots(
      searchStart,
      duration,
      scheduledEvents,
      preferences.avoidWeekends
    );

    if (slots.length === 0) {
      return this.createFallbackSuggestion(searchStart, duration);
    }

    const bestSlot = this.selectBestSlot(slots, preferences);
    const alternatives = slots
      .filter(s => s !== bestSlot)
      .slice(0, 3)
      .map(s => ({ start: s.start, end: s.end }));

    const conflicts = bestSlot.conflictWith ? [bestSlot.conflictWith] : [];

    return {
      suggestedStart: bestSlot.start,
      suggestedEnd: bestSlot.end,
      confidence: this.calculateConfidence(bestSlot, preferences),
      alternatives,
      conflicts,
      relatedItems: this.findRelatedItems(searchStart, allItems),
      reason: this.generateReason(bestSlot, preferences)
    };
  }

  private buildPreferredDateTime(preferences: {
    preferredDate?: number;
    preferredTime?: string;
  }): Date {
    const date = preferences.preferredDate
      ? new Date(preferences.preferredDate)
      : new Date();

    if (preferences.preferredTime) {
      const [hours, minutes] = preferences.preferredTime.split(':').map(Number);
      date.setHours(hours || 0, minutes || 0, 0, 0);
    }

    return date;
  }

  private findAvailableSlots(
    startDate: Date,
    duration: number,
    events: UnifiedCalendarItem[],
    avoidWeekends?: boolean
  ): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    let searchDate = startOfDay(startDate);
    let daysSearched = 0;

    while (availableSlots.length < 10 && daysSearched < this.options.maxSearchDays) {
      const isWeekend = getDay(searchDate) === 0 || getDay(searchDate) === 6;

      if (!isWeekend || !avoidWeekends) {
        const daySlots = this.findFreeSlots(searchDate, duration, events);
        availableSlots.push(...daySlots.filter(s => s.available));
      }

      searchDate = addMinutes(searchDate, 24 * 60);
      daysSearched++;
    }

    return availableSlots;
  }

  private selectBestSlot(
    slots: TimeSlot[],
    preferences: { preferredDate?: number; preferredTime?: string }
  ): TimeSlot {
    if (!preferences.preferredDate && !preferences.preferredTime) {
      return slots[0];
    }

    const preferredTimestamp = preferences.preferredDate
      ? new Date(preferences.preferredDate).getTime()
      : Date.now();

    const sorted = [...slots].sort((a, b) => {
      const aDiff = Math.abs(a.start.getTime() - preferredTimestamp);
      const bDiff = Math.abs(b.start.getTime() - preferredTimestamp);
      return aDiff - bDiff;
    });

    return sorted[0];
  }

  private calculateConfidence(
    slot: TimeSlot,
    preferences: { preferredDate?: number; preferredTime?: string }
  ): number {
    let confidence = 0.5;

    if (slot.available) {
      confidence += 0.3;
    }

    if (preferences.preferredDate) {
      const slotDay = startOfDay(slot.start).getTime();
      const preferredDay = startOfDay(new Date(preferences.preferredDate)).getTime();

      if (slotDay === preferredDay) {
        confidence += 0.15;
      }

      if (preferences.preferredTime) {
        const [hours, minutes] = preferences.preferredTime.split(':').map(Number);
        const preferredHour = hours;
        const slotHour = slot.start.getHours();

        if (Math.abs(slotHour - preferredHour) <= 1) {
          confidence += 0.05;
        }
      }
    }

    return Math.min(confidence, 1.0);
  }

  private generateReason(
    slot: TimeSlot,
    preferences: { preferredDate?: number; preferredTime?: string }
  ): string {
    const timeStr = format(slot.start, 'M月d日 HH:mm');
    const endStr = format(slot.end, 'HH:mm');

    if (preferences.preferredDate) {
      const preferredDay = startOfDay(new Date(preferences.preferredDate));
      const slotDay = startOfDay(slot.start);

      if (isEqual(preferredDay, slotDay)) {
        return `在您指定的日期找到了空闲时间段：${timeStr} - ${endStr}`;
      } else {
        return `您指定的日期没有足够空闲时间，建议安排在 ${timeStr} - ${endStr}`;
      }
    }

    return `为您找到最近的空闲时间段：${timeStr} - ${endStr}`;
  }

  private getWorkDayStart(date: Date): Date {
    return setMinutes(
      setHours(startOfDay(date), this.options.workHours.start),
      0
    );
  }

  private getWorkDayEnd(date: Date): Date {
    return setMinutes(
      setHours(startOfDay(date), this.options.workHours.end),
      0
    );
  }

  private isWorkDay(date: Date): boolean {
    const day = getDay(date);
    return this.options.workDays.includes(day);
  }

  private getEventsInDay(date: Date, events: UnifiedCalendarItem[]): UnifiedCalendarItem[] {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    return events.filter(event => {
      if (!event.startTime || event.status === 'cancelled') {
        return false;
      }

      const eventStart = new Date(event.startTime);
      return areIntervalsOverlapping(
        { start: dayStart, end: dayEnd },
        { start: eventStart, end: new Date(event.endTime || event.startTime) }
      );
    });
  }

  private findConflict(
    slotStart: Date,
    slotEnd: Date,
    events: UnifiedCalendarItem[]
  ): UnifiedCalendarItem | undefined {
    return events.find(event => {
      if (!event.startTime || !event.endTime) {
        return false;
      }

      return areIntervalsOverlapping(
        { start: slotStart, end: slotEnd },
        { start: new Date(event.startTime), end: new Date(event.endTime) }
      );
    });
  }

  private getScheduledEvents(items: UnifiedCalendarItem[]): UnifiedCalendarItem[] {
    return items.filter(
      item => item.type === 'event' &&
              item.status === 'scheduled' &&
              item.startTime !== null
    );
  }

  private findRelatedItems(
    context: Date,
    allItems: UnifiedCalendarItem[]
  ): UnifiedCalendarItem[] {
    const contextDay = startOfDay(context);
    const contextEnd = endOfDay(context);

    return allItems.filter(item => {
      if (item.type === 'event' && item.startTime) {
        const eventStart = new Date(item.startTime);
        return areIntervalsOverlapping(
          { start: contextDay, end: contextEnd },
          { start: eventStart, end: new Date(item.endTime || item.startTime) }
        );
      }
      return false;
    }).slice(0, 5);
  }

  private createFallbackSuggestion(startDate: Date, duration: number): SchedulingSuggestion {
    const suggestedStart = this.getNextWorkDay(startDate);
    const suggestedEnd = addMinutes(suggestedStart, duration);

    return {
      suggestedStart,
      suggestedEnd,
      confidence: 0.3,
      alternatives: [],
      conflicts: [],
      relatedItems: [],
      reason: `未找到合适的空闲时间，建议安排在 ${format(suggestedStart, 'M月d日 HH:mm')}`
    };
  }

  private getNextWorkDay(date: Date): Date {
    let nextDay = addMinutes(startOfDay(date), 24 * 60);

    while (!this.isWorkDay(nextDay)) {
      nextDay = addMinutes(nextDay, 24 * 60);
    }

    return setMinutes(setHours(nextDay, this.options.workHours.start), 0);
  }

  checkConflict(
    startTime: Date,
    endTime: Date,
    events: UnifiedCalendarItem[]
  ): UnifiedCalendarItem[] {
    return events.filter(event => {
      if (!event.startTime || !event.endTime || event.status === 'cancelled') {
        return false;
      }

      return areIntervalsOverlapping(
        { start: startTime, end: endTime },
        { start: new Date(event.startTime), end: new Date(event.endTime) }
      );
    });
  }

  getAvailableTimeRanges(
    date: Date,
    events: UnifiedCalendarItem[]
  ): Array<{ start: Date; end: Date }> {
    if (!this.isWorkDay(date)) {
      return [];
    }

    const dayStart = this.getWorkDayStart(date);
    const dayEnd = this.getWorkDayEnd(date);
    const dayEvents = this.getEventsInDay(date, events);

    const sortedEvents = [...dayEvents]
      .filter(e => e.startTime && e.endTime)
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

    const ranges: Array<{ start: Date; end: Date }> = [];
    let currentStart = dayStart;

    for (const event of sortedEvents) {
      const eventStart = new Date(event.startTime!);
      const eventEnd = new Date(event.endTime!);

      if (isAfter(eventStart, currentStart)) {
        ranges.push({
          start: new Date(currentStart),
          end: new Date(eventStart)
        });
      }

      if (isAfter(eventEnd, currentStart)) {
        currentStart = eventEnd;
      }
    }

    if (isBefore(currentStart, dayEnd)) {
      ranges.push({
        start: new Date(currentStart),
        end: new Date(dayEnd)
      });
    }

    return ranges;
  }
}

export const smartScheduler = new SmartScheduler();
