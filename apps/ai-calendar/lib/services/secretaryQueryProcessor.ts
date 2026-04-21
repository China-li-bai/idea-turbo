import { secretaryAIService } from '@/lib/services/secretaryAIService';
import { taskDecomposerService, type DecompositionContext } from '@/lib/services/taskDecomposerService';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import { smartScheduler } from '@/lib/services/smartScheduler';
import { parseTimeQuery, formatRelativeDate } from '@/lib/utils/nlpParserLegacy';
import type { UnifiedCalendarItem } from '@/types/unified';

export interface ProposalData {
  title: string;
  time: string;
  location: string;
  itemId: string;
}

export interface ProposalAction {
  type: 'reschedule' | 'create' | 'cancel';
  targetId: string;
  targetTitle: string;
  params: Record<string, unknown>;
  beforePreview?: string;
  afterPreview?: string;
}

export interface TimeSlot {
  startTime: number;
  endTime: number;
  label: string;
  isRecommended?: boolean;
}

export interface QueryResult {
  content: string;
  proposal?: ProposalData;
  actions?: ProposalAction[];
  timeSlots?: TimeSlot[];
}

export interface QueryContext {
  items: UnifiedCalendarItem[];
  locale: string;
  isAIConfigured: boolean;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isComplexQuery(query: string): boolean {
  const complexPatterns = [
    /推迟|改到|移动|调整|取消|删除/,
    /有空吗|空闲|时间/,
    /顺便|同时|然后/,
    /周五|周[一二三四五六日]|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
    /明天|后天|下周|tomorrow|next week/i,
    /想|计划|规划|完成|学习|实现|开发|制作|建立|创建.*项目|目标/i,
    /帮我|帮我规划|帮我制定|分解|拆分/,
  ];

  const simpleSearchPatterns = [
    /有什么|有哪些|查找|搜索|显示|列出/,
    /什么事|什么安排/,
  ];

  if (simpleSearchPatterns.some(pattern => pattern.test(query))) {
    return false;
  }

  return complexPatterns.some(pattern => pattern.test(query));
}

export async function processQuery(
  userMessage: string,
  context: QueryContext
): Promise<QueryResult> {
  const shouldUseAI = isComplexQuery(userMessage);

  if (shouldUseAI && context.isAIConfigured) {
    return processWithAI(userMessage, context);
  }

  const simpleResult = await processSimpleQuery(userMessage, context);
  
  const isZh = context.locale.startsWith('zh');
  const isEmptyResponse = 
    simpleResult.content === (isZh ? '未找到相关内容' : 'No results found') ||
    simpleResult.content.includes(isZh ? '没有找到' : 'No results') ||
    simpleResult.content.includes(isZh ? '未找到' : 'not found');

  if (isEmptyResponse && context.isAIConfigured) {
    const secretaryContext = { items: context.items, locale: context.locale, currentDate: new Date() };
    const chatContent = await secretaryAIService.generateChatResponse(userMessage, secretaryContext);
    return { content: chatContent };
  }

  return simpleResult;
}

async function processWithAI(
  userMessage: string,
  context: QueryContext
): Promise<QueryResult> {
  const { items, locale } = context;
  const secretaryContext = { items, locale, currentDate: new Date() };

  const plan = await secretaryAIService.classifyIntent(userMessage, secretaryContext);

  if (plan.type === 'search' || plan.confidence < 0.7) {
    return handleSearchIntent(userMessage, secretaryContext, items, locale);
  }

  if (plan.type === 'find_free_time') {
    return handleFindFreeTime(plan, secretaryContext);
  }

  if (plan.type === 'create_event') {
    return handleCreateEvent(plan, userMessage, items, locale);
  }

  if (plan.type === 'reschedule' || plan.type === 'batch_actions') {
    return handleReschedule(plan, secretaryContext, locale);
  }

  if (plan.type === 'decompose_goal') {
    return handleDecomposeGoal(plan, userMessage, items, locale);
  }

  return { content: plan.explanation };
}

async function handleSearchIntent(
  userMessage: string,
  secretaryContext: { items: UnifiedCalendarItem[]; locale: string; currentDate: Date },
  items: UnifiedCalendarItem[],
  locale: string
): Promise<QueryResult> {
  const { results, summary } = await secretaryAIService.executeSearch(userMessage, secretaryContext);

  let proposal: ProposalData | undefined;
  if (results.length > 0 && results[0].type === 'idea') {
    const item = results[0];
    const suggestion = smartScheduler.findBestTimeSlot(
      60,
      {
        preferredDate: item.metadata.extractedDate,
        preferredTime: item.metadata.extractedTime,
        avoidWeekends: true,
      },
      items
    );

    proposal = {
      title: item.title,
      time: suggestion.suggestedStart.toLocaleString(locale, {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      location: item.metadata.extractedLocation || '',
      itemId: item.id,
    };
  }

  return { content: summary, proposal };
}

async function handleFindFreeTime(
  plan: { actions: Array<{ type: string; params: Record<string, unknown> }> },
  secretaryContext: { items: UnifiedCalendarItem[]; locale: string; currentDate: Date }
): Promise<QueryResult> {
  const freeTimeAction = plan.actions.find(a => a.type === 'find_free_time');
  if (freeTimeAction) {
    const { summary } = await secretaryAIService.findFreeTime(
      freeTimeAction.params as { resolvedTargetDate?: string; resolvedTimeRange?: { start: number; end: number } },
      secretaryContext
    );
    return { content: summary };
  }
  return { content: '' };
}

async function handleCreateEvent(
  plan: { actions: Array<{ type: string; targetTitle?: string; params: Record<string, unknown> }>; explanation: string },
  userMessage: string,
  items: UnifiedCalendarItem[],
  locale: string
): Promise<QueryResult> {
  const createAction = plan.actions.find(a => a.type === 'create_event');
  if (!createAction) return { content: plan.explanation };

  const { newDate, newTime, duration, goalDescription } = createAction.params;
  const title = createAction.targetTitle || (goalDescription as string) || userMessage;
  const eventDuration = (duration as number) || 60;
  const isZh = locale.startsWith('zh');

  const targetDate = newDate ? new Date(newDate as string) : (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  })();

  if (newTime) {
    const [hours, minutes] = (newTime as string).split(':').map(Number);
    targetDate.setHours(hours || 9, minutes || 0, 0, 0);
    const endDate = new Date(targetDate.getTime() + eventDuration * 60000);

    const actions: ProposalAction[] = [{
      type: 'create',
      targetId: generateUUID(),
      targetTitle: title as string,
      params: {
        startTime: targetDate.getTime(),
        endTime: endDate.getTime(),
        duration: eventDuration,
      },
      afterPreview: targetDate.toLocaleString(locale, {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }];

    let content = plan.explanation + '\n\n';
    content += `📅 **${title}**\n`;
    content += `${isZh ? '时间' : 'Time'}: ${actions[0].afterPreview}\n`;
    content += `${isZh ? '时长' : 'Duration'}: ${eventDuration} ${isZh ? '分钟' : ' min'}\n\n`;
    content += isZh ? '请点击下方按钮确认创建' : 'Click the button below to confirm';

    return { content, actions };
  }

  const suggestion = smartScheduler.findBestTimeSlot(
    eventDuration,
    {
      preferredDate: targetDate,
      avoidWeekends: true,
    },
    items
  );

  const slots = smartScheduler.getAvailableTimeRanges(targetDate, items)
    .filter(slot => {
      const slotMinutes = (slot.end.getTime() - slot.start.getTime()) / 60000;
      return slotMinutes >= eventDuration && slot.start.getHours() >= 9 && slot.start.getHours() < 18;
    })
    .slice(0, 4);

  const timeSlots: TimeSlot[] = slots.length > 0
    ? slots.map((slot, i) => {
        const slotEnd = new Date(slot.start.getTime() + eventDuration * 60000);
        return {
          startTime: slot.start.getTime(),
          endTime: slotEnd.getTime(),
          label: `${slot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`,
          isRecommended: i === 0,
        };
      })
    : [{
        startTime: suggestion.suggestedStart.getTime(),
        endTime: suggestion.suggestedEnd.getTime(),
        label: `${suggestion.suggestedStart.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${suggestion.suggestedEnd.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`,
        isRecommended: true,
      }];

  const actions: ProposalAction[] = [
    {
      type: 'create',
      targetId: generateUUID(),
      targetTitle: title as string,
      params: {
        startTime: timeSlots[0].startTime,
        endTime: timeSlots[0].endTime,
        duration: eventDuration,
      },
      afterPreview: new Date(timeSlots[0].startTime).toLocaleString(locale, {
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ];

  let content = plan.explanation + '\n\n';
  content += `📅 **${title}**\n`;
  content += `${isZh ? '推荐时间' : 'Suggested'}: ${actions[0].afterPreview}\n`;
  content += `${isZh ? '时长' : 'Duration'}: ${eventDuration} ${isZh ? '分钟' : ' min'}\n`;

  if (slots.length > 1) {
    content += `\n${isZh ? '📋 可选时间段（基于您的日程）' : '📋 Available slots (from your schedule)'}:\n`;
    slots.slice(1, 4).forEach((slot, i) => {
      content += `  ${i + 2}. ${slot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} - ${slot.end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}\n`;
    });
  }

  content += `\n${isZh ? '请选择时间段后确认创建' : 'Select a time slot to confirm'}`;

  return { content, actions, timeSlots };
}

async function handleReschedule(
  plan: { actions: Array<{ type: string; targetTitle?: string; params: Record<string, unknown> }>; explanation: string },
  secretaryContext: { items: UnifiedCalendarItem[]; locale: string; currentDate: Date },
  locale: string
): Promise<QueryResult> {
  const rescheduleAction = plan.actions.find(a => a.type === 'reschedule');
  const freeTimeAction = plan.actions.find(a => a.type === 'find_free_time');

  const isZh = locale.startsWith('zh');
  let content = plan.explanation + '\n\n';
  const actions: ProposalAction[] = [];

  if (rescheduleAction) {
    const targetEvent = await secretaryAIService.findTargetEvent(
      rescheduleAction.targetTitle || '',
      rescheduleAction.params.targetDate as string,
      secretaryContext
    );

    if (targetEvent) {
      const newDate = rescheduleAction.params.resolvedNewDate
        ? new Date(rescheduleAction.params.resolvedNewDate as string)
        : new Date();
      const currentStart = targetEvent.startTime
        ? new Date(targetEvent.startTime)
        : new Date();

      actions.push({
        type: 'reschedule',
        targetId: targetEvent.id,
        targetTitle: targetEvent.title,
        params: rescheduleAction.params,
        beforePreview: currentStart.toLocaleDateString(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        afterPreview: newDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });

      content += `📅 **${targetEvent.title}**\n`;
      content += `${isZh ? '从' : 'From'}: ${actions[0].beforePreview}\n`;
      content += `${isZh ? '到' : 'To'}: ${actions[0].afterPreview}\n\n`;
    } else {
      content += `⚠️ ${isZh ? '未找到匹配的日程' : 'No matching event found'}\n\n`;
    }
  }

  if (freeTimeAction) {
    const { summary } = await secretaryAIService.findFreeTime(
      freeTimeAction.params as { resolvedTargetDate?: string; resolvedTimeRange?: { start: number; end: number } },
      secretaryContext
    );
    content += summary;
  }

  return actions.length > 0 ? { content, actions } : { content };
}

async function handleDecomposeGoal(
  plan: { actions: Array<{ type: string; params: Record<string, unknown> }> },
  userMessage: string,
  items: UnifiedCalendarItem[],
  locale: string
): Promise<QueryResult> {
  const decomposeAction = plan.actions.find(a => a.type === 'decompose_goal');
  if (!decomposeAction) return { content: '' };

  const goalDescription = (decomposeAction.params.goalDescription as string) || userMessage;
  const isZh = locale.startsWith('zh');

  const decompositionContext: DecompositionContext = {
    existingEvents: items,
    userPreferences: {
      workHours: { start: 9, end: 18 },
      workDays: [1, 2, 3, 4, 5],
      defaultDuration: 60,
    },
    currentDate: new Date(),
  };

  const result = await taskDecomposerService.decompose(
    {
      id: generateUUID(),
      type: 'idea' as const,
      title: goalDescription,
      content: goalDescription,
      startTime: null,
      endTime: null,
      isAllDay: false,
      embedding: [],
      embeddingUpdatedAt: 0,
      status: 'pending' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    },
    decompositionContext
  );

  const hours = Math.floor(result.totalEstimatedMinutes / 60);
  const minutes = result.totalEstimatedMinutes % 60;

  let content = `📋 ${result.explanation}\n\n`;
  content += isZh
    ? `**任务列表** (${result.items.length} 项，预计 ${hours}小时${minutes > 0 ? minutes + '分钟' : ''})：\n`
    : `**Tasks** (${result.items.length} items, ~${hours}h${minutes > 0 ? minutes + 'm' : ''}):\n`;

  const actions: ProposalAction[] = [];

  result.items.slice(0, 8).forEach((item, index) => {
    const priorityIcon = item.metadata.priority === 'high' ? '🔴' : item.metadata.priority === 'medium' ? '🟡' : '🟢';
    const timeStr = item.startTime
      ? new Date(item.startTime).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
      : '';
    content += `${index + 1}. ${priorityIcon} ${item.title} (${item.metadata.estimatedMinutes}${isZh ? '分钟' : 'min'})${timeStr ? ' - ' + timeStr : ''}\n`;

    actions.push({
      type: 'create',
      targetId: item.id,
      targetTitle: item.title,
      params: {
        startTime: item.startTime,
        endTime: item.endTime,
        priority: item.metadata.priority,
        description: item.content,
      },
    });
  });

  if (result.items.length > 8) {
    content += isZh
      ? `\n... 还有 ${result.items.length - 8} 项任务`
      : `\n... and ${result.items.length - 8} more tasks`;
  }

  if (result.milestones.length > 0) {
    content += isZh ? '\n\n**里程碑**：\n' : '\n\n**Milestones**:\n';
    result.milestones.slice(0, 3).forEach(m => {
      const date = new Date(m.targetDate);
      content += `🎯 ${m.title} (${date.toLocaleDateString(locale)})\n`;
    });
  }

  content += isZh
    ? '\n\n💡 确认后将自动创建这些任务'
    : '\n\n💡 Confirm to create these tasks';

  return { content, actions };
}

async function processSimpleQuery(
  query: string,
  context: QueryContext
): Promise<QueryResult> {
  const { items, locale } = context;
  const isZh = locale.startsWith('zh');

  const timeQuery = parseTimeQuery(query, locale);
  const scheduledEvents = items.filter(
    item => item.type === 'event' && item.status === 'scheduled' && item.startTime !== null
  );

  if (timeQuery?.type === 'availability') {
    return findAvailability(timeQuery.targetDate, scheduledEvents, locale);
  }

  let searchResults: Array<{
    id: string;
    title: string;
    type: 'idea' | 'event';
    score?: number;
    metadata: Record<string, unknown>;
  }> = [];
  let timeFiltered = false;
  let timeQueryDescription = '';

  if (timeQuery?.type === 'short_relative') {
    timeQueryDescription = `${timeQuery.windowMinutes}${isZh ? '分钟' : ' min'}`;
    searchResults = scheduledEvents.filter(item => {
      if (!item.startTime) return false;
      return item.startTime >= timeQuery.windowStart.getTime() && item.startTime <= timeQuery.windowEnd.getTime();
    });
    timeFiltered = true;
  } else if (timeQuery?.type === 'time_range') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    searchResults = scheduledEvents.filter(item => {
      if (!item.startTime) return false;
      const eventDate = new Date(item.startTime);
      if (eventDate < today || eventDate >= tomorrow) return false;
      const eventHour = eventDate.getHours();
      return eventHour >= timeQuery.hourStart && eventHour < timeQuery.hourEnd;
    });
    timeFiltered = true;
    timeQueryDescription = timeQuery.matchedKeyword;
  }

  if (timeFiltered && searchResults.length === 0) {
    const timeDesc = timeQueryDescription || (timeQuery?.type === 'time_range' ? timeQuery.matchedKeyword : '');
    return {
      content: isZh
        ? `${timeDesc}没有已安排的日程`
        : `No events scheduled for ${timeDesc}`,
    };
  }

  if (oramaSearchService.isInitialized) {
    return searchWithOrama(query, searchResults, timeFiltered, timeQueryDescription, items, locale);
  }

  return searchWithKeyword(query, items, locale);
}

function findAvailability(
  targetDate: Date,
  scheduledEvents: UnifiedCalendarItem[],
  locale: string
): QueryResult {
  const isZh = locale.startsWith('zh');
  const dayStart = new Date(targetDate);
  const dayEnd = new Date(targetDate);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const dayEvents = scheduledEvents.filter(item => {
    if (!item.startTime || !item.endTime) return false;
    return item.startTime >= dayStart.getTime() && item.endTime <= dayEnd.getTime();
  });

  const freeSlots: Array<{ start: Date; end: Date; duration: number }> = [];
  const workingHoursStart = 9;
  const workingHoursEnd = 18;

  let currentTime = new Date(dayStart);
  currentTime.setHours(workingHoursStart, 0, 0, 0);

  const endTime = new Date(dayStart);
  endTime.setHours(workingHoursEnd, 0, 0, 0);

  const sortedEvents = [...dayEvents].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

  for (const event of sortedEvents) {
    if (!event.startTime || !event.endTime) continue;
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    if (currentTime < eventStart) {
      const slotDuration = Math.floor((eventStart.getTime() - currentTime.getTime()) / (1000 * 60));
      if (slotDuration >= 30) {
        freeSlots.push({ start: new Date(currentTime), end: new Date(eventStart), duration: slotDuration });
      }
    }
    if (eventEnd > currentTime) {
      currentTime = new Date(eventEnd);
    }
  }

  if (currentTime < endTime) {
    const slotDuration = Math.floor((endTime.getTime() - currentTime.getTime()) / (1000 * 60));
    if (slotDuration >= 30) {
      freeSlots.push({ start: new Date(currentTime), end: new Date(endTime), duration: slotDuration });
    }
  }

  const relativeDate = formatRelativeDate(targetDate, locale);

  if (dayEvents.length === 0) {
    return {
      content: isZh
        ? `${relativeDate}全天有空！推荐时间：上午9-12点、下午14-18点是最佳时间段。`
        : `${relativeDate} is completely free! Recommended times: 9 AM - 12 PM, 2 PM - 6 PM.`,
    };
  }

  if (freeSlots.length === 0) {
    return {
      content: isZh
        ? `${relativeDate}日程已满，没有空闲时间。`
        : `${relativeDate} is fully booked, no free time available.`,
    };
  }

  let content = isZh ? `${relativeDate}的空闲时间：\n\n` : `Free time on ${relativeDate}:\n\n`;
  freeSlots.slice(0, 3).forEach((slot, index) => {
    const startStr = slot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const endStr = slot.end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    content += `${index + 1}. ${startStr} - ${endStr} (${slot.duration}${isZh ? '分钟' : ' min'})\n`;
  });

  if (freeSlots.length > 0) {
    const bestSlot = freeSlots[0];
    const bestStart = bestSlot.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    content += isZh
      ? `\n💡 推荐：${bestStart} 开始是最佳时间段。`
      : `\n💡 Recommendation: ${bestStart} is the best time slot.`;
  }

  return { content };
}

async function searchWithOrama(
  query: string,
  timeFilteredResults: Array<{ id: string; title: string; type: 'idea' | 'event'; score?: number; metadata: Record<string, unknown> }>,
  timeFiltered: boolean,
  timeQueryDescription: string,
  items: UnifiedCalendarItem[],
  locale: string
): Promise<QueryResult> {
  const isZh = locale.startsWith('zh');

  const rawResults = timeFiltered
    ? timeFilteredResults.map(item => ({ id: item.id, title: item.title, type: item.type, score: 1, metadata: item.metadata }))
    : await oramaSearchService.hybridSearch(query, { k: 5, similarity: 0.6 });

  if (rawResults.length === 0) {
    return { content: isZh ? '未找到相关内容' : 'No results found' };
  }

  let content = timeFiltered
    ? `${timeQueryDescription}${isZh ? '的日程' : ' events'} (${rawResults.length})\n\n`
    : `${isZh ? `找到 ${rawResults.length} 项相关内容` : `Found ${rawResults.length} items`}\n\n`;

  rawResults.slice(0, 3).forEach((result, index) => {
    const title = result.title || (isZh ? '未知标题' : 'Unknown');
    const type = result.type || 'idea';
    content += `${index + 1}. **${title}** (${type === 'idea' ? (isZh ? '想法' : 'Idea') : (isZh ? '日程' : 'Event')})\n`;

    if (type === 'event') {
      const item = items.find(i => i.id === result.id);
      if (item?.startTime) {
        const date = new Date(item.startTime);
        content += `   ${isZh ? '时间' : 'Time'}：${date.toLocaleString(locale)}\n`;
      }
    }
    if (result.metadata?.location) {
      content += `   ${isZh ? '地点' : 'Location'}：${result.metadata.location}\n`;
    }
  });

  const firstResult = rawResults[0];
  if (firstResult.type === 'idea') {
    const item = items.find(i => i.id === firstResult.id);
    if (item) {
      const suggestion = smartScheduler.findBestTimeSlot(
        60,
        {
          preferredDate: item.metadata.extractedDate,
          preferredTime: item.metadata.extractedTime,
          avoidWeekends: true,
        },
        items
      );

      return {
        content,
        proposal: {
          title: firstResult.title || item.title,
          time: suggestion.suggestedStart.toLocaleString(locale, {
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          location: item.metadata.extractedLocation || '',
          itemId: firstResult.id,
        },
      };
    }
  }

  return { content };
}

function searchWithKeyword(
  query: string,
  items: UnifiedCalendarItem[],
  locale: string
): QueryResult {
  const isZh = locale.startsWith('zh');
  const lowerQuery = query.toLowerCase();
  const relevantItems = items.filter(item => {
    const titleMatch = item.title.toLowerCase().includes(lowerQuery);
    const contentMatch = item.content?.toLowerCase().includes(lowerQuery);
    const tagMatch = item.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    return titleMatch || contentMatch || tagMatch;
  });

  if (relevantItems.length === 0) {
    return { content: isZh ? '未找到相关内容' : 'No results found' };
  }

  let content = `${isZh ? `找到 ${relevantItems.length} 项相关内容` : `Found ${relevantItems.length} items`} (${isZh ? '本地搜索' : 'local search'})\n\n`;

  relevantItems.slice(0, 3).forEach((item, index) => {
    content += `${index + 1}. **${item.title}** (${item.type === 'idea' ? (isZh ? '想法' : 'Idea') : (isZh ? '日程' : 'Event')})\n`;
    if (item.type === 'event' && item.startTime) {
      const date = new Date(item.startTime);
      content += `   ${isZh ? '时间' : 'Time'}：${date.toLocaleString(locale)}\n`;
    }
  });

  return { content };
}
