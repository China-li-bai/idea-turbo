import { zh } from 'chrono-node';

export interface ParsedResult {
  title: string;
  date?: Date;
  time?: string;
  duration?: number;
  location?: string;
  type?: 'todo' | 'event' | 'note';
  people?: string[];
  confidence: number;
  rawInput: string;
}

const TODO_KEYWORDS = ['待办', 'todo', '任务', '要做', '需要做', '记得', '购买', '联系', '处理'];
const NOTE_KEYWORDS = ['笔记', 'note', '记录', '想法', '感悟', '总结'];
const LOCATION_PREFIXES = ['在', '于', '地点', '位置', '地址', '去', '到'];
const PEOPLE_PREFIXES = ['见', '和', '与', '同', '跟'];
const ACTION_VERBS = ['开会', '见面', '讨论', '商量', '汇报', '沟通', '交流', '约', '谈', '聊', '吃饭', '聚餐', '活动'];

function hasAnyKeyword(input: string, keywords: string[]): boolean {
  const lowerInput = input.toLowerCase();
  return keywords.some((keyword) => lowerInput.includes(keyword));
}

function extractByPrefix(input: string, prefixes: string[], maxLength: number = 20): string | null {
  for (const prefix of prefixes) {
    const actionPattern = ACTION_VERBS.join('|');
    const regex = new RegExp(`${prefix}([\\u4e00-\\u9fa5a-zA-Z0-9]{2,${maxLength}}?)(?=(?:${actionPattern}|[和与同跟，,。！？\\s])|$)`);
    const match = input.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function parseDuration(input: string): number | null {
  const durationMatch = input.match(/(\d+)\s*(?:小时|分钟|天)/);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    if (input.includes('小时')) return value * 60;
    if (input.includes('分钟')) return value;
    if (input.includes('天')) return value * 24 * 60;
  }
  if (input.includes('半天')) return 4 * 60;
  if (input.includes('半小时')) return 30;
  return null;
}

function determineType(input: string, hasDate: boolean): 'todo' | 'event' | 'note' {
  if (hasAnyKeyword(input, TODO_KEYWORDS)) {
    return 'todo';
  }
  if (hasAnyKeyword(input, NOTE_KEYWORDS)) {
    return 'note';
  }
  if (hasDate) {
    return 'event';
  }
  return 'event';
}

function calculateConfidence(
  hasDate: boolean,
  hasTime: boolean,
  hasLocation: boolean,
  hasPeople: boolean
): number {
  let confidence = 0.5;
  if (hasDate) confidence += 0.15;
  if (hasTime) confidence += 0.15;
  if (hasLocation) confidence += 0.1;
  if (hasPeople) confidence += 0.1;
  return Math.min(confidence, 1.0);
}

export async function parseNaturalLanguage(input: string): Promise<ParsedResult> {
  const result: ParsedResult = {
    title: input.trim(),
    confidence: 0.5,
    rawInput: input,
  };

  const chronoResults = zh.parse(input, new Date());

  let hasDate = false;
  let hasTime = false;

  if (chronoResults.length > 0) {
    const firstResult = chronoResults[0];
    const start = firstResult.start;

    hasDate = start.isCertain('day') || start.isCertain('month') || start.isCertain('year');
    hasTime = start.isCertain('hour');

    if (hasDate || hasTime) {
      result.date = start.date();

      if (hasTime) {
        let hour = start.get('hour') ?? 0;
        const minute = start.get('minute') ?? 0;
        
        if (input.includes('晚上') && hour === 12) {
          hour = 0;
          if (result.date) {
            const nextDay = new Date(result.date);
            nextDay.setDate(nextDay.getDate() + 1);
            result.date = nextDay;
          }
        } else if (input.includes('晚上') && hour < 12) {
          hour += 12;
        } else if (input.includes('凌晨') && hour === 12) {
          hour = 0;
        }
        
        result.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }

      if (firstResult.end) {
        const durationMs = firstResult.end.date().getTime() - firstResult.start.date().getTime();
        result.duration = Math.round(durationMs / (1000 * 60));
      }
    }
  }

  result.type = determineType(input, hasDate);

  const duration = parseDuration(input);
  if (duration && !result.duration) {
    result.duration = duration;
  }

  const location = extractByPrefix(input, LOCATION_PREFIXES);
  if (location) {
    result.location = location;
  }

  const people = extractByPrefix(input, PEOPLE_PREFIXES, 10);
  if (people) {
    result.people = [people];
  }

  result.confidence = calculateConfidence(hasDate, hasTime, !!result.location, !!result.people);

  return result;
}

export function formatTimeRange(start: Date, end: Date): string {
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const endHour = end.getHours();
  const endMinute = end.getMinutes();

  const formatHour = (h: number) => {
    if (h >= 12) {
      return `下午${h === 12 ? 12 : h - 12}`;
    }
    return `上午${h === 0 ? 12 : h}`;
  };

  return `${formatHour(startHour)}:${startMinute.toString().padStart(2, '0')} - ${formatHour(endHour)}:${endMinute.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '明天';
  if (diffDays === 2) return '后天';
  if (diffDays > 0 && diffDays < 7) return `${diffDays}天后`;

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
