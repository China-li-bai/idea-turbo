import { aiService } from '@/lib/ai';
import { unifiedDataService } from './unifiedDataService';
import type { CalendarEvent } from '@/types';

export interface ReminderConfig {
  eventId: string;
  reminderTime: Date;
  type: 'notification' | 'email' | 'sms';
  priority: 'high' | 'medium' | 'low';
  message: string;
  sent: boolean;
}

export interface SmartReminderResult {
  shouldRemind: boolean;
  priority: 'high' | 'medium' | 'low';
  message: string;
  advanceTime: number;
  reasoning: string[];
}

export interface EventImportance {
  score: number;
  factors: string[];
  level: 'critical' | 'high' | 'medium' | 'low';
}

class SmartReminderService {
  private reminderQueue: Map<string, ReminderConfig> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    this.startReminderCheck();
  }

  private startReminderCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000);
  }

  private async checkReminders(): Promise<void> {
    const now = new Date();
    
    for (const [eventId, config] of this.reminderQueue.entries()) {
      if (!config.sent && config.reminderTime <= now) {
        await this.sendReminder(config);
        config.sent = true;
      }
    }
  }

  private async sendReminder(config: ReminderConfig): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(config.message, {
          body: `优先级: ${config.priority}`,
          icon: '/calendar-icon.png',
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(config.message, {
            body: `优先级: ${config.priority}`,
          });
        }
      }
    }

    console.log(`[提醒] ${config.message}`);
  }

  async analyzeEventImportance(event: CalendarEvent): Promise<EventImportance> {
    let score = 50;
    const factors: string[] = [];

    if (event.shiftMetadata) {
      score += 20;
      factors.push('排班事件');
    }

    if (event.location) {
      score += 10;
      factors.push('有地点信息');
    }

    if (event.description && event.description.length > 50) {
      score += 10;
      factors.push('有详细描述');
    }

    const now = new Date();
    const hoursUntilEvent = (event.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilEvent < 1) {
      score += 30;
      factors.push('即将开始');
    } else if (hoursUntilEvent < 24) {
      score += 15;
      factors.push('24小时内');
    }

    const aiAnalysis = await this.getAIImportanceAnalysis(event);
    if (aiAnalysis) {
      score += aiAnalysis.adjustment;
      factors.push(...aiAnalysis.factors);
    }

    score = Math.max(0, Math.min(100, score));

    let level: 'critical' | 'high' | 'medium' | 'low';
    if (score >= 90) level = 'critical';
    else if (score >= 70) level = 'high';
    else if (score >= 50) level = 'medium';
    else level = 'low';

    return { score, factors, level };
  }

  private async getAIImportanceAnalysis(
    event: CalendarEvent
  ): Promise<{ adjustment: number; factors: string[] } | null> {
    try {
      const response = await aiService.chat([
        {
          role: 'system',
          content: `你是一个日程重要性分析助手。分析事件的重要性并返回JSON格式：
{
  "adjustment": -20到20之间的数字,
  "factors": ["因素1", "因素2"]
}`,
        },
        {
          role: 'user',
          content: `分析这个事件的重要性：
标题: ${event.title}
描述: ${event.description || '无'}
地点: ${event.location || '无'}
时间: ${event.startTime.toLocaleString()}`,
        },
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI重要性分析失败:', error);
    }
    return null;
  }

  async calculateSmartReminder(
    event: CalendarEvent,
    importance: EventImportance
  ): Promise<SmartReminderResult> {
    const now = new Date();
    const hoursUntilEvent = (event.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const reasoning: string[] = [];
    let advanceTime = 30;
    let priority: 'high' | 'medium' | 'low' = 'medium';

    switch (importance.level) {
      case 'critical':
        advanceTime = 60;
        priority = 'high';
        reasoning.push('重要事件，提前1小时提醒');
        break;
      case 'high':
        advanceTime = 30;
        priority = 'high';
        reasoning.push('高优先级事件，提前30分钟提醒');
        break;
      case 'medium':
        advanceTime = 15;
        priority = 'medium';
        reasoning.push('普通事件，提前15分钟提醒');
        break;
      case 'low':
        advanceTime = 5;
        priority = 'low';
        reasoning.push('低优先级事件，提前5分钟提醒');
        break;
    }

    if (event.location) {
      advanceTime += 15;
      reasoning.push('有地点，额外提前15分钟考虑路程');
    }

    if (hoursUntilEvent < 0.5) {
      advanceTime = Math.max(5, advanceTime - 10);
      reasoning.push('即将开始，缩短提前时间');
    }

    const shouldRemind = hoursUntilEvent > 0 && hoursUntilEvent < 24;

    const message = this.generateReminderMessage(event, importance, advanceTime);

    return {
      shouldRemind,
      priority,
      message,
      advanceTime,
      reasoning,
    };
  }

  private generateReminderMessage(
    event: CalendarEvent,
    importance: EventImportance,
    advanceTime: number
  ): string {
    const timeStr = event.startTime.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    let emoji = '📅';
    if (importance.level === 'critical') emoji = '🔴';
    else if (importance.level === 'high') emoji = '🟠';
    else if (importance.level === 'medium') emoji = '🟡';
    else emoji = '🟢';

    let message = `${emoji} ${event.title} 将在 ${advanceTime} 分钟后开始 (${timeStr})`;

    if (event.location) {
      message += `\n📍 地点: ${event.location}`;
    }

    return message;
  }

  async scheduleReminder(event: CalendarEvent): Promise<ReminderConfig | null> {
    const importance = await this.analyzeEventImportance(event);
    const smartReminder = await this.calculateSmartReminder(event, importance);

    if (!smartReminder.shouldRemind) {
      return null;
    }

    const reminderTime = new Date(
      event.startTime.getTime() - smartReminder.advanceTime * 60 * 1000
    );

    const config: ReminderConfig = {
      eventId: event.id,
      reminderTime,
      type: 'notification',
      priority: smartReminder.priority,
      message: smartReminder.message,
      sent: false,
    };

    this.reminderQueue.set(event.id, config);

    return config;
  }

  async scheduleAllReminders(): Promise<void> {
    const events = await unifiedDataService.getAllEvents({
      dateRange: {
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    for (const event of events) {
      await this.scheduleReminder(event);
    }
  }

  cancelReminder(eventId: string): void {
    this.reminderQueue.delete(eventId);
  }

  getPendingReminders(): ReminderConfig[] {
    return Array.from(this.reminderQueue.values()).filter(r => !r.sent);
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

export const smartReminderService = new SmartReminderService();
