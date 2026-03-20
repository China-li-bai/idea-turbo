import { aiService } from '@/lib/ai';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import { smartScheduler } from '@/lib/services/smartScheduler';
import { taskDecomposerService, type DecompositionResult, type DecompositionContext } from '@/lib/services/taskDecomposerService';
import type { UnifiedCalendarItem } from '@/types/unified';
import type { Message } from '@/lib/ai/types';

export type IntentType = 
  | 'search'
  | 'reschedule'
  | 'find_free_time'
  | 'create_event'
  | 'cancel_event'
  | 'batch_actions'
  | 'decompose_goal'
  | 'unknown';

export interface ActionPlan {
  type: IntentType;
  confidence: number;
  actions: ScheduledAction[];
  explanation: string;
}

export interface ScheduledAction {
  type: 'reschedule' | 'create' | 'cancel' | 'search' | 'find_free_time' | 'decompose_goal';
  targetId?: string;
  targetTitle?: string;
  params: Record<string, unknown>;
  preview?: {
    before?: string;
    after?: string;
  };
  decomposition?: DecompositionResult;
}

export interface ActionResult {
  success: boolean;
  action: ScheduledAction;
  result?: unknown;
  error?: string;
}

export interface SecretaryContext {
  items: UnifiedCalendarItem[];
  locale: string;
  currentDate: Date;
}

const SYSTEM_PROMPT = `你是一个智能日程助手，帮助用户管理他们的日程和想法。

你的任务是分析用户的请求，理解他们的意图，并规划需要执行的操作。

## 可用操作类型：
1. search - 搜索日程或想法
2. reschedule - 重新安排日程时间
3. find_free_time - 查找空闲时间
4. create_event - 创建新日程
5. cancel_event - 取消日程
6. decompose_goal - 将复杂目标分解为可执行的任务

## 输出格式（JSON）：
{
  "intent": "<意图类型>",
  "confidence": <0.0-1.0>,
  "actions": [
    {
      "type": "<操作类型>",
      "targetTitle": "<目标日程标题关键词>",
      "params": {
        "newDate": "<新日期 YYYY-MM-DD>",
        "newTime": "<新时间 HH:MM>",
        "duration": <分钟数>,
        "query": "<搜索关键词>",
        "goalDescription": "<目标描述>"
      }
    }
  ],
  "explanation": "<用一句话解释你的理解>"
}

## 示例：

用户: "把明天的会议推迟到周五"
输出: {
  "intent": "reschedule",
  "confidence": 0.95,
  "actions": [
    {
      "type": "reschedule",
      "targetTitle": "会议",
      "params": {
        "targetDate": "tomorrow",
        "newDate": "friday"
      }
    }
  ],
  "explanation": "我将帮您把明天包含'会议'的日程改到周五"
}

用户: "我想在 Q2 完成一个开源项目"
输出: {
  "intent": "decompose_goal",
  "confidence": 0.9,
  "actions": [
    {
      "type": "decompose_goal",
      "params": {
        "goalDescription": "在 Q2 完成一个开源项目",
        "deadline": "2024-06-30"
      }
    }
  ],
  "explanation": "我将帮您把这个目标分解为可执行的任务"
}

用户: "帮我规划学习吉他的计划"
输出: {
  "intent": "decompose_goal",
  "confidence": 0.9,
  "actions": [
    {
      "type": "decompose_goal",
      "params": {
        "goalDescription": "学习吉他"
      }
    }
  ],
  "explanation": "我将帮您制定学习吉他的计划"
}

用户: "周五下午有空吗？"
输出: {
  "intent": "find_free_time",
  "confidence": 0.9,
  "actions": [
    {
      "type": "find_free_time",
      "params": {
        "targetDate": "friday",
        "timeRange": "afternoon"
      }
    }
  ],
  "explanation": "我来查看周五下午的空闲时间"
}

用户: "把明天的会议推迟到周五，顺便看看下午有空吗？"
输出: {
  "intent": "batch_actions",
  "confidence": 0.9,
  "actions": [
    {
      "type": "reschedule",
      "targetTitle": "会议",
      "params": {
        "targetDate": "tomorrow",
        "newDate": "friday"
      }
    },
    {
      "type": "find_free_time",
      "params": {
        "targetDate": "friday",
        "timeRange": "afternoon"
      }
    }
  ],
  "explanation": "我将帮您把明天的会议改到周五，并查看周五下午的空闲时间"
}

## 重要规则：
1. 只输出JSON，不要有其他文字
2. 日期关键词：today, tomorrow, monday-sunday, next week
3. 时间关键词：morning (9-12), afternoon (14-18), evening (18-21)
4. 如果用户请求不明确，confidence设为较低值
5. 对于涉及修改的操作，需要包含targetTitle来定位目标
6. 当用户表达一个需要多个步骤才能完成的目标时，使用 decompose_goal 意图`;

function resolveRelativeDate(keyword: string, baseDate: Date): Date {
  const result = new Date(baseDate);
  const dayOfWeek = result.getDay();
  
  const dayMap: Record<string, number> = {
    'today': 0,
    'tomorrow': 1,
    'monday': (1 - dayOfWeek + 7) % 7 || 7,
    'tuesday': (2 - dayOfWeek + 7) % 7 || 7,
    'wednesday': (3 - dayOfWeek + 7) % 7 || 7,
    'thursday': (4 - dayOfWeek + 7) % 7 || 7,
    'friday': (5 - dayOfWeek + 7) % 7 || 7,
    'saturday': (6 - dayOfWeek + 7) % 7 || 7,
    'sunday': (7 - dayOfWeek) % 7 || 7,
  };
  
  const lowerKeyword = keyword.toLowerCase();
  
  if (lowerKeyword === 'today') {
    return result;
  }
  
  if (lowerKeyword === 'tomorrow') {
    result.setDate(result.getDate() + 1);
    return result;
  }
  
  const targetDay = dayMap[lowerKeyword];
  if (targetDay !== undefined) {
    const daysToAdd = targetDay === 0 ? 7 : targetDay;
    result.setDate(result.getDate() + daysToAdd);
    return result;
  }
  
  return result;
}

function resolveTimeRange(keyword: string): { start: number; end: number } {
  const lowerKeyword = keyword.toLowerCase();
  
  if (lowerKeyword === 'morning') {
    return { start: 9, end: 12 };
  }
  if (lowerKeyword === 'afternoon') {
    return { start: 14, end: 18 };
  }
  if (lowerKeyword === 'evening') {
    return { start: 18, end: 21 };
  }
  
  return { start: 9, end: 18 };
}

export class SecretaryAIService {
  private static instance: SecretaryAIService;

  static getInstance(): SecretaryAIService {
    if (!SecretaryAIService.instance) {
      SecretaryAIService.instance = new SecretaryAIService();
    }
    return SecretaryAIService.instance;
  }

  async classifyIntent(
    userMessage: string,
    context: SecretaryContext
  ): Promise<ActionPlan> {
    const contextInfo = this.buildContextInfo(context);
    
    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `${contextInfo}\n\n用户请求: ${userMessage}` }
    ];

    try {
      const response = await aiService.chat(messages, {
        temperature: 0.3,
        max_tokens: 500,
        provider: 'glm'
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        return this.createFallbackPlan(userMessage);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        type: parsed.intent || 'unknown',
        confidence: parsed.confidence || 0.5,
        actions: this.enrichActions(parsed.actions || [], context),
        explanation: parsed.explanation || ''
      };
    } catch (error) {
      console.error('Failed to classify intent:', error);
      return this.createFallbackPlan(userMessage);
    }
  }

  private buildContextInfo(context: SecretaryContext): string {
    const today = new Date(context.currentDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const upcomingEvents = context.items
      .filter(item => item.type === 'event' && item.startTime && item.startTime > Date.now())
      .slice(0, 5)
      .map(item => {
        const date = new Date(item.startTime!);
        return `- ${item.title} (${date.toLocaleDateString('zh-CN')})`;
      });

    return `当前日期: ${today.toLocaleDateString('zh-CN', { weekday: 'long' })}
即将到来的日程:
${upcomingEvents.length > 0 ? upcomingEvents.join('\n') : '- 暂无日程'}`;
  }

  private enrichActions(
    actions: Array<{
      type: string;
      targetTitle?: string;
      params: Record<string, unknown>;
    }>,
    context: SecretaryContext
  ): ScheduledAction[] {
    return actions.map(action => {
      const enriched: ScheduledAction = {
        type: action.type as ScheduledAction['type'],
        targetTitle: action.targetTitle,
        params: { ...action.params }
      };

      if (action.params.targetDate) {
        enriched.params.resolvedTargetDate = resolveRelativeDate(
          String(action.params.targetDate),
          context.currentDate
        ).toISOString();
      }

      if (action.params.newDate) {
        enriched.params.resolvedNewDate = resolveRelativeDate(
          String(action.params.newDate),
          context.currentDate
        ).toISOString();
      }

      if (action.params.timeRange) {
        enriched.params.resolvedTimeRange = resolveTimeRange(
          String(action.params.timeRange)
        );
      }

      return enriched;
    });
  }

  private createFallbackPlan(userMessage: string): ActionPlan {
    return {
      type: 'search',
      confidence: 0.5,
      actions: [
        {
          type: 'search',
          params: { query: userMessage }
        }
      ],
      explanation: '我将为您搜索相关内容'
    };
  }

  async executeSearch(
    query: string,
    context: SecretaryContext
  ): Promise<{ results: UnifiedCalendarItem[]; summary: string }> {
    if (oramaSearchService.isInitialized) {
      const results = await oramaSearchService.hybridSearch(query, { k: 5 });
      const items = results.map(r => 
        context.items.find(i => i.id === r.id)
      ).filter(Boolean) as UnifiedCalendarItem[];
      
      return {
        results: items,
        summary: this.generateSearchSummary(items, context.locale)
      };
    }

    const lowerQuery = query.toLowerCase();
    const results = context.items.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.content?.toLowerCase().includes(lowerQuery)
    );

    return {
      results,
      summary: this.generateSearchSummary(results, context.locale)
    };
  }

  async findFreeTime(
    params: {
      resolvedTargetDate?: string;
      resolvedTimeRange?: { start: number; end: number };
    },
    context: SecretaryContext
  ): Promise<{
    slots: Array<{ start: Date; end: Date }>;
    summary: string;
  }> {
    const targetDate = params.resolvedTargetDate 
      ? new Date(params.resolvedTargetDate)
      : new Date(context.currentDate);
    
    const timeRange = params.resolvedTimeRange || { start: 9, end: 18 };
    
    const slots = smartScheduler.getAvailableTimeRanges(targetDate, context.items)
      .filter(slot => {
        const hour = slot.start.getHours();
        return hour >= timeRange.start && hour < timeRange.end;
      });

    return {
      slots,
      summary: this.generateFreeTimeSummary(slots, targetDate, context.locale)
    };
  }

  async findTargetEvent(
    targetTitle: string | undefined,
    targetDate: string | undefined,
    context: SecretaryContext
  ): Promise<UnifiedCalendarItem | null> {
    if (!targetTitle) return null;

    const resolvedDate = targetDate 
      ? resolveRelativeDate(targetDate, context.currentDate)
      : null;

    const candidates = context.items.filter(item => {
      if (item.type !== 'event' || !item.startTime) return false;
      
      const titleMatch = item.title.toLowerCase().includes(targetTitle.toLowerCase());
      
      if (resolvedDate) {
        const itemDate = new Date(item.startTime);
        const sameDay = 
          itemDate.getFullYear() === resolvedDate.getFullYear() &&
          itemDate.getMonth() === resolvedDate.getMonth() &&
          itemDate.getDate() === resolvedDate.getDate();
        return titleMatch && sameDay;
      }
      
      return titleMatch;
    });

    return candidates[0] || null;
  }

  async decomposeGoal(
    goalDescription: string,
    context: SecretaryContext
  ): Promise<DecompositionResult> {
    const idea: UnifiedCalendarItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'temp-' + Date.now(),
      type: 'idea',
      title: goalDescription,
      content: goalDescription,
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: [],
      embeddingUpdatedAt: 0,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {}
    };

    const decompositionContext: DecompositionContext = {
      existingEvents: context.items,
      userPreferences: {
        workHours: { start: 9, end: 18 },
        workDays: [1, 2, 3, 4, 5],
        defaultDuration: 60
      },
      currentDate: context.currentDate
    };

    const result = await taskDecomposerService.decompose(idea, decompositionContext);
    
    const scheduledTasks = await taskDecomposerService.suggestSchedule(
      result.tasks,
      decompositionContext
    );

    return {
      ...result,
      tasks: scheduledTasks
    };
  }

  createItemsFromDecomposition(
    result: DecompositionResult
  ): UnifiedCalendarItem[] {
    return result.tasks.map(task => ({
      id: task.id,
      type: 'event' as const,
      title: task.title,
      content: task.description || task.title,
      startTime: task.suggestedStartTime || null,
      endTime: task.suggestedEndTime || null,
      isAllDay: false,
      embedding: [],
      embeddingUpdatedAt: 0,
      status: task.status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        priority: task.priority,
        description: task.description
      }
    }));
  }

  generateResponse(
    plan: ActionPlan,
    results: ActionResult[],
    context: SecretaryContext
  ): string {
    const { locale } = context;
    const isZh = locale.startsWith('zh');

    if (plan.type === 'search') {
      const searchResult = results.find(r => r.action.type === 'search');
      if (searchResult?.result) {
        const { summary } = searchResult.result as { summary: string };
        return summary;
      }
    }

    if (plan.type === 'find_free_time') {
      const freeTimeResult = results.find(r => r.action.type === 'find_free_time');
      if (freeTimeResult?.result) {
        const { summary } = freeTimeResult.result as { summary: string };
        return summary;
      }
    }

    if (plan.type === 'reschedule') {
      const rescheduleResult = results.find(r => r.action.type === 'reschedule');
      if (rescheduleResult?.success) {
        return isZh 
          ? '✅ 已为您重新安排日程' 
          : '✅ Schedule rescheduled successfully';
      }
      if (rescheduleResult?.error) {
        return isZh
          ? `❌ ${rescheduleResult.error}`
          : `❌ ${rescheduleResult.error}`;
      }
    }

    if (plan.type === 'batch_actions') {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      let response = isZh
        ? `已完成 ${successCount} 项操作`
        : `Completed ${successCount} actions`;
      
      if (failCount > 0) {
        response += isZh
          ? `，${failCount} 项失败`
          : `, ${failCount} failed`;
      }
      
      return response;
    }

    if (plan.type === 'decompose_goal') {
      const decomposeResult = results.find(r => r.action.type === 'decompose_goal');
      if (decomposeResult?.result) {
        const { tasks, milestones, totalEstimatedMinutes, explanation } = 
          decomposeResult.result as DecompositionResult;
        
        const hours = Math.floor(totalEstimatedMinutes / 60);
        const minutes = totalEstimatedMinutes % 60;
        
        let response = isZh
          ? `📋 ${explanation}\n\n`
          : `📋 ${explanation}\n\n`;
        
        response += isZh
          ? `**任务列表** (${tasks.length} 项，预计 ${hours}小时${minutes > 0 ? minutes + '分钟' : ''})：\n`
          : `**Tasks** (${tasks.length} items, ~${hours}h${minutes > 0 ? minutes + 'm' : ''}):\n`;
        
        response += tasks.slice(0, 8).map((task, index) => {
          const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
          const timeStr = task.suggestedStartTime 
            ? new Date(task.suggestedStartTime).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
            : '';
          return `${index + 1}. ${priorityIcon} ${task.title} (${task.estimatedMinutes}分钟)${timeStr ? ' - ' + timeStr : ''}`;
        }).join('\n');
        
        if (tasks.length > 8) {
          response += isZh
            ? `\n... 还有 ${tasks.length - 8} 项任务`
            : `\n... and ${tasks.length - 8} more tasks`;
        }
        
        if (milestones.length > 0) {
          response += isZh
            ? `\n\n**里程碑**：\n`
            : `\n\n**Milestones**:\n`;
          response += milestones.slice(0, 3).map(m => {
            const date = new Date(m.targetDate);
            return `🎯 ${m.title} (${date.toLocaleDateString(locale)})`;
          }).join('\n');
        }
        
        return response;
      }
    }

    return plan.explanation || (isZh ? '好的，我来帮您处理' : 'Okay, let me help you with that');
  }

  private generateSearchSummary(
    items: UnifiedCalendarItem[],
    locale: string
  ): string {
    const isZh = locale.startsWith('zh');
    
    if (items.length === 0) {
      return isZh ? '没有找到相关内容' : 'No results found';
    }

    const summary = isZh
      ? `找到 ${items.length} 个相关项目：\n\n`
      : `Found ${items.length} items:\n\n`;

    return summary + items.slice(0, 5).map((item, index) => {
      const type = item.type === 'event' 
        ? (isZh ? '日程' : 'Event')
        : (isZh ? '想法' : 'Idea');
      
      let line = `${index + 1}. **${item.title}** (${type})`;
      
      if (item.type === 'event' && item.startTime) {
        const date = new Date(item.startTime);
        line += `\n   ${isZh ? '时间' : 'Time'}：${date.toLocaleString(locale)}`;
      }
      
      return line;
    }).join('\n');
  }

  private generateFreeTimeSummary(
    slots: Array<{ start: Date; end: Date }>,
    date: Date,
    locale: string
  ): string {
    const isZh = locale.startsWith('zh');
    const dateStr = date.toLocaleDateString(locale, { 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });

    if (slots.length === 0) {
      return isZh
        ? `${dateStr} 没有空闲时间`
        : `No free time on ${dateStr}`;
    }

    const totalMinutes = slots.reduce((sum, slot) => {
      return sum + (slot.end.getTime() - slot.start.getTime()) / 60000;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let summary = isZh
      ? `${dateStr} 有 ${slots.length} 个空闲时段，共 ${hours}小时${minutes > 0 ? minutes + '分钟' : ''}：\n\n`
      : `${slots.length} free slots on ${dateStr}, total ${hours}h${minutes > 0 ? minutes + 'm' : ''}:\n\n`;

    summary += slots.slice(0, 5).map(slot => {
      const start = slot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      const end = slot.end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      return `• ${start} - ${end}`;
    }).join('\n');

    return summary;
  }
}

export const secretaryAIService = SecretaryAIService.getInstance();
