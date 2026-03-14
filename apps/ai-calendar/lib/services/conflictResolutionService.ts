import { aiService } from '@/lib/ai';
import { smartRecommendationService, type TimeSlot } from './smartRecommendationService';
import { unifiedDataService } from './unifiedDataService';
import { aiPrivacyMiddleware } from '@/lib/utils/aiPrivacy';
import type { CalendarEvent } from '@/types';

export interface ConflictInfo {
  event1: CalendarEvent;
  event2: CalendarEvent;
  overlapDuration: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'full' | 'partial' | 'adjacent';
}

export interface ResolutionOption {
  type: 'reschedule' | 'shorten' | 'merge' | 'cancel' | 'keep';
  description: string;
  impact: 'low' | 'medium' | 'high';
  suggestedChanges: {
    eventId: string;
    changes: Partial<CalendarEvent>;
  }[];
  reasoning: string;
}

export interface ConflictResolution {
  conflict: ConflictInfo;
  options: ResolutionOption[];
  recommendedOption: ResolutionOption;
  aiSuggestion: string;
}

class ConflictResolutionService {
  async detectConflicts(
    startDate: Date,
    endDate: Date
  ): Promise<ConflictInfo[]> {
    const events = await unifiedDataService.getAllEvents({
      dateRange: { start: startDate, end: endDate },
    });

    const conflicts: ConflictInfo[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        if (this.hasConflict(event1, event2)) {
          const conflict = this.analyzeConflict(event1, event2);
          conflicts.push(conflict);
        }
      }
    }

    return conflicts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private hasConflict(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.startTime < event2.endTime && event1.endTime > event2.startTime;
  }

  private analyzeConflict(event1: CalendarEvent, event2: CalendarEvent): ConflictInfo {
    const overlapStart = new Date(Math.max(event1.startTime.getTime(), event2.startTime.getTime()));
    const overlapEnd = new Date(Math.min(event1.endTime.getTime(), event2.endTime.getTime()));
    const overlapDuration = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);

    const event1Duration = (event1.endTime.getTime() - event1.startTime.getTime()) / (1000 * 60);
    const event2Duration = (event2.endTime.getTime() - event2.startTime.getTime()) / (1000 * 60);
    const minDuration = Math.min(event1Duration, event2Duration);

    let type: 'full' | 'partial' | 'adjacent';
    if (overlapDuration >= minDuration * 0.9) {
      type = 'full';
    } else if (overlapDuration >= minDuration * 0.5) {
      type = 'partial';
    } else {
      type = 'adjacent';
    }

    let severity: 'critical' | 'high' | 'medium' | 'low';
    if (type === 'full') {
      severity = 'critical';
    } else if (overlapDuration > 60) {
      severity = 'high';
    } else if (overlapDuration > 30) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    return {
      event1,
      event2,
      overlapDuration,
      severity,
      type,
    };
  }

  async generateResolutionOptions(
    conflict: ConflictInfo
  ): Promise<ResolutionOption[]> {
    const options: ResolutionOption[] = [];

    const alternativeSlots1 = await smartRecommendationService.suggestAlternativeTimes(
      conflict.event1,
      (conflict.event1.endTime.getTime() - conflict.event1.startTime.getTime()) / (1000 * 60)
    );

    if (alternativeSlots1.length > 0) {
      options.push({
        type: 'reschedule',
        description: `将 "${conflict.event1.title}" 移至 ${this.formatTimeSlot(alternativeSlots1[0])}`,
        impact: 'medium',
        suggestedChanges: [
          {
            eventId: conflict.event1.id,
            changes: {
              startTime: alternativeSlots1[0].start,
              endTime: alternativeSlots1[0].end,
            },
          },
        ],
        reasoning: '找到一个合适的时间替代方案',
      });
    }

    const alternativeSlots2 = await smartRecommendationService.suggestAlternativeTimes(
      conflict.event2,
      (conflict.event2.endTime.getTime() - conflict.event2.startTime.getTime()) / (1000 * 60)
    );

    if (alternativeSlots2.length > 0) {
      options.push({
        type: 'reschedule',
        description: `将 "${conflict.event2.title}" 移至 ${this.formatTimeSlot(alternativeSlots2[0])}`,
        impact: 'medium',
        suggestedChanges: [
          {
            eventId: conflict.event2.id,
            changes: {
              startTime: alternativeSlots2[0].start,
              endTime: alternativeSlots2[0].end,
            },
          },
        ],
        reasoning: '找到一个合适的时间替代方案',
      });
    }

    if (conflict.type === 'partial') {
      const newEndTime = new Date(conflict.event1.startTime.getTime() + 30 * 60 * 1000);
      options.push({
        type: 'shorten',
        description: `缩短 "${conflict.event1.title}" 到30分钟`,
        impact: 'low',
        suggestedChanges: [
          {
            eventId: conflict.event1.id,
            changes: {
              endTime: newEndTime,
            },
          },
        ],
        reasoning: '缩短会议时长可以避免冲突',
      });
    }

    if (conflict.event1.title.toLowerCase().includes('会议') && 
        conflict.event2.title.toLowerCase().includes('会议')) {
      options.push({
        type: 'merge',
        description: `合并两个会议`,
        impact: 'high',
        suggestedChanges: [
          {
            eventId: conflict.event1.id,
            changes: {
              title: `${conflict.event1.title} + ${conflict.event2.title}`,
              description: `${conflict.event1.description || ''}\n${conflict.event2.description || ''}`,
            },
          },
          {
            eventId: conflict.event2.id,
            changes: {
              title: '[已合并]',
            },
          },
        ],
        reasoning: '两个会议主题相似，可以合并讨论',
      });
    }

    options.push({
      type: 'keep',
      description: '保持现状，不做调整',
      impact: 'low',
      suggestedChanges: [],
      reasoning: '用户可能有意安排重叠',
    });

    return options;
  }

  async resolveConflict(conflict: ConflictInfo): Promise<ConflictResolution> {
    const options = await this.generateResolutionOptions(conflict);

    const nonKeepOptions = options.filter(o => o.type !== 'keep');
    const recommendedOption = nonKeepOptions.length > 0 
      ? nonKeepOptions.reduce((best, current) => 
          this.compareOptions(best, current) ? best : current
        )
      : options[options.length - 1];

    const aiSuggestion = await this.getAIResolutionSuggestion(conflict, options);

    return {
      conflict,
      options,
      recommendedOption,
      aiSuggestion,
    };
  }

  private compareOptions(a: ResolutionOption, b: ResolutionOption): boolean {
    const impactOrder = { low: 0, medium: 1, high: 2 };
    return impactOrder[a.impact] <= impactOrder[b.impact];
  }

  private async getAIResolutionSuggestion(
    conflict: ConflictInfo,
    options: ResolutionOption[]
  ): Promise<string> {
    try {
      const sanitizedEvent1 = aiPrivacyMiddleware.sanitizeEvent(conflict.event1);
      const sanitizedEvent2 = aiPrivacyMiddleware.sanitizeEvent(conflict.event2);
      
      const optionsDesc = options.map(o => `- ${o.description}: ${o.reasoning}`).join('\n');

      const response = await aiService.chat([
        {
          role: 'system',
          content: '你是一个智能日程助手，帮助用户解决日程冲突。请给出简洁的建议，不超过50字。',
        },
        {
          role: 'user',
          content: `发现日程冲突：
事件1: "${sanitizedEvent1.title}" (${sanitizedEvent1.startTime.toLocaleString()})
事件2: "${sanitizedEvent2.title}" (${sanitizedEvent2.startTime.toLocaleString()})
冲突时长: ${Math.round(conflict.overlapDuration)}分钟
严重程度: ${conflict.severity}

可选方案：
${optionsDesc}

请给出建议。`,
        },
      ]);

      return response.choices[0]?.message?.content || '建议调整其中一个事件的时间';
    } catch (error) {
      return '建议调整其中一个事件的时间';
    }
  }

  private formatTimeSlot(slot: TimeSlot): string {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const day = days[slot.start.getDay()];
    const date = slot.start.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const time = `${slot.start.getHours()}:${slot.start.getMinutes().toString().padStart(2, '0')}`;
    
    return `${day} ${date} ${time}`;
  }

  async applyResolution(resolution: ConflictResolution, optionIndex: number): Promise<boolean> {
    const option = resolution.options[optionIndex];
    
    for (const change of option.suggestedChanges) {
      if (change.changes.title === '[已合并]') {
        await unifiedDataService.deleteEvent(change.eventId);
      } else {
        await unifiedDataService.updateEvent(change.eventId, change.changes);
      }
    }

    return true;
  }

  async autoResolveConflicts(
    startDate: Date,
    endDate: Date,
    autoApply: boolean = false
  ): Promise<ConflictResolution[]> {
    const conflicts = await this.detectConflicts(startDate, endDate);
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict);
      resolutions.push(resolution);

      if (autoApply && resolution.recommendedOption.type !== 'keep') {
        const optionIndex = resolution.options.indexOf(resolution.recommendedOption);
        await this.applyResolution(resolution, optionIndex);
      }
    }

    return resolutions;
  }
}

export const conflictResolutionService = new ConflictResolutionService();
