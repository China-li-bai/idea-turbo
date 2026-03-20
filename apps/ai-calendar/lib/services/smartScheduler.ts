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

  suggestTimeBlocks(
    duration: number,
    options?: {
      preferredDays?: number[];
      preferredHours?: { start: number; end: number };
      minBufferMinutes?: number;
      maxDaysAhead?: number;
    },
    allItems?: UnifiedCalendarItem[]
  ): Array<{
    start: Date;
    end: Date;
    score: number;
    reason: string;
  }> {
    const events = allItems ? this.getScheduledEvents(allItems) : [];
    const suggestions: Array<{ start: Date; end: Date; score: number; reason: string }> = [];
    
    const preferredDays = options?.preferredDays || this.options.workDays;
    const preferredHours = options?.preferredHours || { start: 10, end: 16 };
    const maxDays = options?.maxDaysAhead || 7;
    
    let searchDate = new Date();
    searchDate = startOfDay(searchDate);
    
    for (let day = 0; day < maxDays; day++) {
      const dayOfWeek = getDay(searchDate);
      
      if (!preferredDays.includes(dayOfWeek)) {
        searchDate = addMinutes(searchDate, 24 * 60);
        continue;
      }
      
      const daySlots = this.findFreeSlots(searchDate, duration, events, 30);
      
      for (const slot of daySlots) {
        if (!slot.available) continue;
        
        let score = 0.5;
        let reason = '';
        
        const hour = slot.start.getHours();
        if (hour >= preferredHours.start && hour < preferredHours.end) {
          score += 0.3;
          reason = '黄金时间段';
        } else if (hour >= this.options.workHours.start && hour < this.options.workHours.end) {
          score += 0.1;
          reason = '工作时间';
        }
        
        if (hour === 10 || hour === 14) {
          score += 0.1;
          reason = '高效时段';
        }
        
        if (day === 0) {
          score += 0.05;
          reason += reason ? '（今天）' : '今天';
        } else if (day === 1) {
          score += 0.03;
        }
        
        suggestions.push({
          start: slot.start,
          end: slot.end,
          score: Math.min(score, 1.0),
          reason: reason || '可用时段'
        });
      }
      
      searchDate = addMinutes(searchDate, 24 * 60);
    }
    
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  predictConflicts(
    newEvent: { startTime: number; endTime: number; title?: string },
    allItems: UnifiedCalendarItem[],
    options?: {
      lookAheadDays?: number;
      checkRecurring?: boolean;
    }
  ): Array<{
    type: 'overlap' | 'back_to_back' | 'tight_schedule' | 'outside_work_hours';
    severity: 'high' | 'medium' | 'low';
    conflictingEvent?: UnifiedCalendarItem;
    message: string;
    suggestion?: string;
  }> {
    const conflicts: Array<{
      type: 'overlap' | 'back_to_back' | 'tight_schedule' | 'outside_work_hours';
      severity: 'high' | 'medium' | 'low';
      conflictingEvent?: UnifiedCalendarItem;
      message: string;
      suggestion?: string;
    }> = [];
    
    const newStart = new Date(newEvent.startTime);
    const newEnd = new Date(newEvent.endTime);
    const scheduledEvents = this.getScheduledEvents(allItems);
    
    const overlapping = this.checkConflict(newStart, newEnd, scheduledEvents);
    for (const event of overlapping) {
      conflicts.push({
        type: 'overlap',
        severity: 'high',
        conflictingEvent: event,
        message: `与"${event.title}"时间冲突`,
        suggestion: '请选择其他时间或调整现有日程'
      });
    }
    
    const bufferMinutes = this.options.bufferMinutes;
    for (const event of scheduledEvents) {
      if (!event.startTime || !event.endTime) continue;
      
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      const gapBefore = differenceInMinutes(newStart, eventEnd);
      if (gapBefore > 0 && gapBefore < bufferMinutes) {
        conflicts.push({
          type: 'back_to_back',
          severity: 'medium',
          conflictingEvent: event,
          message: `与"${event.title}"间隔太近（仅${gapBefore}分钟）`,
          suggestion: `建议至少预留${bufferMinutes}分钟缓冲时间`
        });
      }
      
      const gapAfter = differenceInMinutes(eventStart, newEnd);
      if (gapAfter > 0 && gapAfter < bufferMinutes) {
        conflicts.push({
          type: 'back_to_back',
          severity: 'medium',
          conflictingEvent: event,
          message: `与"${event.title}"间隔太近（仅${gapAfter}分钟）`,
          suggestion: `建议至少预留${bufferMinutes}分钟缓冲时间`
        });
      }
    }
    
    const newStartHour = newStart.getHours();
    if (newStartHour < this.options.workHours.start || 
        newStartHour >= this.options.workHours.end) {
      conflicts.push({
        type: 'outside_work_hours',
        severity: 'low',
        message: `时间在工作时间之外（${this.options.workHours.start}:00-${this.options.workHours.end}:00）`,
        suggestion: '确认是否需要在非工作时间安排'
      });
    }
    
    const dayOfWeek = getDay(newStart);
    if (!this.options.workDays.includes(dayOfWeek)) {
      conflicts.push({
        type: 'outside_work_hours',
        severity: 'low',
        message: '安排在周末',
        suggestion: '确认是否需要在周末工作'
      });
    }
    
    const dayEvents = this.getEventsInDay(newStart, allItems);
    const totalMinutes = dayEvents.reduce((sum, e) => {
      if (!e.startTime || !e.endTime) return sum;
      return sum + differenceInMinutes(new Date(e.endTime), new Date(e.startTime));
    }, 0);
    
    const workDayMinutes = (this.options.workHours.end - this.options.workHours.start) * 60;
    const newEventMinutes = differenceInMinutes(newEnd, newStart);
    const utilizationAfter = (totalMinutes + newEventMinutes) / workDayMinutes;
    
    if (utilizationAfter > 0.8) {
      conflicts.push({
        type: 'tight_schedule',
        severity: 'medium',
        message: `当天日程已较满（${Math.round(utilizationAfter * 100)}%）`,
        suggestion: '考虑分散到其他日期'
      });
    }
    
    return conflicts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  optimizeSchedule(
    date: Date,
    allItems: UnifiedCalendarItem[],
    options?: {
      preferMorning?: boolean;
      groupSimilar?: boolean;
      minimizeContextSwitch?: boolean;
    }
  ): Array<{
    itemId: string;
    currentStart: number;
    currentEnd: number;
    suggestedStart: number;
    suggestedEnd: number;
    reason: string;
  }> {
    const suggestions: Array<{
      itemId: string;
      currentStart: number;
      currentEnd: number;
      suggestedStart: number;
      suggestedEnd: number;
      reason: string;
    }> = [];
    
    const dayEvents = this.getEventsInDay(date, allItems)
      .filter(e => e.startTime && e.endTime && e.status === 'scheduled')
      .sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    
    if (dayEvents.length === 0) return suggestions;
    
    if (options?.preferMorning) {
      const highPriorityEvents = dayEvents.filter(
        e => e.metadata?.priority === 'high'
      );
      
      for (const event of highPriorityEvents) {
        const currentHour = new Date(event.startTime!).getHours();
        if (currentHour >= 12) {
          const morningSlots = this.findFreeSlots(date, 
            differenceInMinutes(new Date(event.endTime!), new Date(event.startTime!)),
            allItems.filter(i => i.id !== event.id)
          ).filter(s => s.available && s.start.getHours() < 12);
          
          if (morningSlots.length > 0) {
            suggestions.push({
              itemId: event.id,
              currentStart: event.startTime!,
              currentEnd: event.endTime!,
              suggestedStart: morningSlots[0].start.getTime(),
              suggestedEnd: morningSlots[0].end.getTime(),
              reason: '高优先级任务建议安排在上午'
            });
          }
        }
      }
    }
    
    if (options?.minimizeContextSwitch) {
      const meetingEvents = dayEvents.filter(
        e => e.metadata?.eventType === 'meeting'
      );
      
      if (meetingEvents.length > 1) {
        let firstMeeting = meetingEvents[0];
        let lastMeeting = meetingEvents[meetingEvents.length - 1];
        
        const totalGap = differenceInMinutes(
          new Date(lastMeeting.startTime!),
          new Date(firstMeeting.endTime!)
        );
        
        if (totalGap > 60) {
          suggestions.push({
            itemId: firstMeeting.id,
            currentStart: firstMeeting.startTime!,
            currentEnd: firstMeeting.endTime!,
            suggestedStart: firstMeeting.startTime!,
            suggestedEnd: firstMeeting.endTime!,
            reason: '会议之间有较长时间间隔，建议合并或调整'
          });
        }
      }
    }
    
    return suggestions;
  }

  getDayStatistics(
    date: Date,
    allItems: UnifiedCalendarItem[]
  ): {
    totalEvents: number;
    totalMinutes: number;
    utilization: number;
    freeMinutes: number;
    busiestHour: number;
    suggestions: string[];
  } {
    const dayEvents = this.getEventsInDay(date, allItems)
      .filter(e => e.startTime && e.endTime);
    
    const totalMinutes = dayEvents.reduce((sum, e) => {
      return sum + differenceInMinutes(
        new Date(e.endTime!),
        new Date(e.startTime!)
      );
    }, 0);
    
    const workDayMinutes = (this.options.workHours.end - this.options.workHours.start) * 60;
    const utilization = totalMinutes / workDayMinutes;
    const freeMinutes = workDayMinutes - totalMinutes;
    
    const hourCounts = new Map<number, number>();
    for (const event of dayEvents) {
      const startHour = new Date(event.startTime!).getHours();
      const endHour = new Date(event.endTime!).getHours();
      for (let h = startHour; h < endHour; h++) {
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      }
    }
    
    let busiestHour = this.options.workHours.start;
    let maxCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > maxCount) {
        maxCount = count;
        busiestHour = hour;
      }
    }
    
    const suggestions: string[] = [];
    if (utilization > 0.9) {
      suggestions.push('日程过满，建议重新安排部分任务');
    } else if (utilization > 0.7) {
      suggestions.push('日程较满，注意预留休息时间');
    } else if (utilization < 0.3) {
      suggestions.push('空闲时间较多，可以考虑安排更多任务');
    }
    
    if (busiestHour >= 11 && busiestHour <= 14) {
      suggestions.push('中午时段会议较多，注意午餐时间');
    }
    
    return {
      totalEvents: dayEvents.length,
      totalMinutes,
      utilization,
      freeMinutes,
      busiestHour,
      suggestions
    };
  }
}

export const smartScheduler = new SmartScheduler();
