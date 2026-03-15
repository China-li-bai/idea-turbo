import { aiService } from '@/lib/ai';
import { dataStoreAdapter } from './dataStoreAdapter';
import type { CalendarEvent } from '@/types';

export interface TimeSlot {
  start: Date;
  end: Date;
  score: number;
  reasons: string[];
}

export interface RecommendationResult {
  recommendedSlots: TimeSlot[];
  conflicts: Array<{
    event: CalendarEvent;
    severity: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
  insights: string[];
}

export interface UserPreferences {
  preferredHours: number[];
  preferredDays: number[];
  avoidHours: number[];
  avoidDays: number[];
  averageMeetingDuration: number;
  commonLocations: string[];
  frequentParticipants: string[];
}

class SmartRecommendationService {
  private preferences: UserPreferences | null = null;

  async initialize(): Promise<void> {
    this.preferences = await this.learnUserPreferences();
  }

  async learnUserPreferences(): Promise<UserPreferences> {
    const events = await dataStoreAdapter.getAllEvents();
    
    if (events.length === 0) {
      return this.getDefaultPreferences();
    }

    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};
    const durations: number[] = [];
    const locations: Record<string, number> = {};
    const participants: Record<string, number> = {};

    for (const event of events) {
      const hour = event.startTime.getHours();
      const day = event.startTime.getDay();
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;

      if (event.endTime) {
        const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
        durations.push(duration);
      }

      if (event.location) {
        locations[event.location] = (locations[event.location] || 0) + 1;
      }

      if (event.shiftMetadata?.employeeName) {
        participants[event.shiftMetadata.employeeName] = (participants[event.shiftMetadata.employeeName] || 0) + 1;
      }
    }

    const sortedHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([hour]) => parseInt(hour));

    const sortedDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([day]) => parseInt(day));

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 60;

    const topLocations = Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([loc]) => loc);

    const topParticipants = Object.entries(participants)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    return {
      preferredHours: sortedHours.slice(0, 5),
      preferredDays: sortedDays.slice(0, 3),
      avoidHours: sortedHours.slice(-3),
      avoidDays: sortedDays.slice(-2),
      averageMeetingDuration: avgDuration,
      commonLocations: topLocations,
      frequentParticipants: topParticipants,
    };
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      preferredHours: [9, 10, 14, 15, 16],
      preferredDays: [1, 2, 3, 4, 5],
      avoidHours: [12, 18, 19, 20],
      avoidDays: [0, 6],
      averageMeetingDuration: 60,
      commonLocations: [],
      frequentParticipants: [],
    };
  }

  async recommendTimeSlots(
    title: string,
    duration: number = 60,
    dateRange?: { start: Date; end: Date },
    participants?: string[]
  ): Promise<RecommendationResult> {
    if (!this.preferences) {
      await this.initialize();
    }

    const start = dateRange?.start || new Date();
    const end = dateRange?.end || new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    const existingEvents = await dataStoreAdapter.getAllEvents({
      dateRange: { start, end },
    });

    let slots = this.generateCandidateSlots(start, end, duration);

    slots = slots.map(slot => this.scoreTimeSlot(slot, existingEvents, participants));

    slots.sort((a, b) => b.score - a.score);

    const conflicts = this.detectConflicts(slots, existingEvents);

    const insights = await this.generateInsights(title, slots, conflicts);

    return {
      recommendedSlots: slots.slice(0, 5),
      conflicts,
      insights,
    };
  }

  private generateCandidateSlots(
    start: Date,
    end: Date,
    duration: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const current = new Date(start);

    while (current < end) {
      const dayOfWeek = current.getDay();
      
      if (this.preferences?.preferredDays.includes(dayOfWeek) &&
          !this.preferences.avoidDays.includes(dayOfWeek)) {
        
        for (const hour of this.preferences.preferredHours) {
          const slotStart = new Date(current);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
          
          if (slotEnd > end) continue;
          
          slots.push({
            start: slotStart,
            end: slotEnd,
            score: 0,
            reasons: [],
          });
        }
      }
      
      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  private scoreTimeSlot(
    slot: TimeSlot,
    existingEvents: CalendarEvent[],
    participants?: string[]
  ): TimeSlot {
    let score = 100;
    const reasons: string[] = [];

    const hour = slot.start.getHours();
    if (this.preferences?.preferredHours.includes(hour)) {
      score += 20;
      reasons.push(`您通常在这个时间段安排日程`);
    }

    if (this.preferences?.avoidHours.includes(hour)) {
      score -= 30;
      reasons.push(`这个时间段您通常不安排日程`);
    }

    const dayOfWeek = slot.start.getDay();
    if (this.preferences?.preferredDays.includes(dayOfWeek)) {
      score += 10;
      reasons.push(`这是您偏好的工作日`);
    }

    if (this.preferences?.avoidDays.includes(dayOfWeek)) {
      score -= 20;
      reasons.push(`这是您通常休息的日子`);
    }

    const hasConflict = existingEvents.some(event => 
      slot.start < event.endTime && slot.end > event.startTime
    );

    if (hasConflict) {
      score -= 50;
      reasons.push(`这个时间段已有其他日程`);
    }

    return {
      ...slot,
      score: Math.max(0, score),
      reasons,
    };
  }

  private detectConflicts(
    slots: TimeSlot[],
    existingEvents: CalendarEvent[]
  ): RecommendationResult['conflicts'] {
    const conflicts: RecommendationResult['conflicts'] = [];

    for (const event of existingEvents) {
      const overlappingSlots = slots.filter(slot =>
        slot.start < event.endTime && slot.end > event.startTime
      );

      if (overlappingSlots.length > 0) {
        const overlapDuration = Math.min(
          event.endTime.getTime() - overlappingSlots[0].start.getTime(),
          overlappingSlots[0].end.getTime() - event.startTime.getTime()
        );

        const severity = overlapDuration > 30 * 60 * 1000 ? 'high' :
                        overlapDuration > 15 * 60 * 1000 ? 'medium' : 'low';

        conflicts.push({
          event,
          severity,
          suggestion: severity === 'high' 
            ? '建议选择其他时间段'
            : '可以考虑调整会议时长',
        });
      }
    }

    return conflicts;
  }

  private async generateInsights(
    title: string,
    slots: TimeSlot[],
    conflicts: RecommendationResult['conflicts']
  ): Promise<string[]> {
    const insights: string[] = [];

    if (slots.length > 0 && slots[0].score >= 80) {
      insights.push(`✨ 最佳推荐时间：${this.formatTimeSlot(slots[0])}`);
    }

    if (conflicts.length > 0) {
      insights.push(`⚠️ 发现 ${conflicts.length} 个时间冲突，建议调整`);
    }

    const aiInsight = await this.getAIInsight(title, slots, conflicts);
    if (aiInsight) {
      insights.push(`🤖 ${aiInsight}`);
    }

    return insights;
  }

  private async getAIInsight(
    title: string,
    slots: TimeSlot[],
    conflicts: RecommendationResult['conflicts']
  ): Promise<string | null> {
    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content: '你是一个智能日程助手，根据用户的日程安排提供简洁的洞察建议。用一句话回答，不超过30字。',
        },
        {
          role: 'user',
          content: `用户想安排"${title}"，最佳时间是${slots[0] ? this.formatTimeSlot(slots[0]) : '未知'}，有${conflicts.length}个冲突。请给出建议。`,
        },
      ]);

      return response.choices[0]?.message?.content || null;
    } catch (error) {
      return null;
    }
  }

  private formatTimeSlot(slot: TimeSlot): string {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const day = days[slot.start.getDay()];
    const date = slot.start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const time = `${slot.start.getHours()}:${slot.start.getMinutes().toString().padStart(2, '0')}`;
    
    return `${day} ${date} ${time}`;
  }

  async suggestAlternativeTimes(
    conflictingEvent: CalendarEvent,
    duration: number = 60
  ): Promise<TimeSlot[]> {
    const start = new Date(conflictingEvent.startTime);
    start.setDate(start.getDate() - 1);
    
    const end = new Date(conflictingEvent.endTime);
    end.setDate(end.getDate() + 7);

    const result = await this.recommendTimeSlots(
      `替代 ${conflictingEvent.title}`,
      duration,
      { start, end }
    );

    return result.recommendedSlots.filter(slot => 
      slot.start.getTime() !== conflictingEvent.startTime.getTime()
    );
  }

  getPreferences(): UserPreferences | null {
    return this.preferences;
  }
}

export const smartRecommendationService = new SmartRecommendationService();
