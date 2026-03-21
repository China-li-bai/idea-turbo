import * as chrono from 'chrono-node';
import { SupportedLocale } from './i18n';

export interface ParsedResult {
  title: string;
  date?: Date;
  time?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  duration?: number;
  location?: string;
  type?: 'todo' | 'event' | 'note';
  people?: string[];
  confidence: number;
  rawInput: string;
}

interface TimeKeywords {
  relativeDays: Record<string, number>;
  timeOfDay: Record<string, { start: number; end: number }>;
  duration: Record<string, number>;
  todoKeywords: string[];
  noteKeywords: string[];
  locationPrefixes: string[];
  peoplePrefixes: string[];
  actionVerbs: string[];
  morning: string[];
  afternoon: string[];
  evening: string[];
  night: string[];
}

const TIME_KEYWORDS: Record<SupportedLocale, TimeKeywords> = {
  'zh-CN': {
    relativeDays: { '今天': 0, '明天': 1, '后天': 2, '大后天': 3, '昨天': -1, '前天': -2 },
    timeOfDay: {
      '上午': { start: 9, end: 12 },
      '下午': { start: 14, end: 18 },
      '晚上': { start: 18, end: 22 },
      '傍晚': { start: 17, end: 19 },
      '中午': { start: 12, end: 14 },
      '凌晨': { start: 0, end: 6 },
      '早晨': { start: 6, end: 9 },
    },
    duration: { '小时': 60, '分钟': 1, '天': 480, '半天': 240, '半小时': 30 },
    todoKeywords: ['待办', 'todo', '任务', '要做', '需要做', '记得', '购买', '联系', '处理'],
    noteKeywords: ['笔记', 'note', '记录', '想法', '感悟', '总结'],
    locationPrefixes: ['在', '于', '地点', '位置', '地址', '去', '到'],
    peoplePrefixes: ['见', '和', '与', '同', '跟'],
    actionVerbs: ['开会', '见面', '讨论', '商量', '汇报', '沟通', '交流', '约', '谈', '聊', '吃饭', '聚餐', '活动'],
    morning: ['上午', '早上', '早晨', '早'],
    afternoon: ['下午', '午后'],
    evening: ['晚上', '傍晚', '晚间'],
    night: ['晚上', '夜里', '深夜'],
  },
  'zh-TW': {
    relativeDays: { '今天': 0, '明天': 1, '後天': 2, '大後天': 3, '昨天': -1, '前天': -2 },
    timeOfDay: {
      '上午': { start: 9, end: 12 },
      '下午': { start: 14, end: 18 },
      '晚上': { start: 18, end: 22 },
      '傍晚': { start: 17, end: 19 },
      '中午': { start: 12, end: 14 },
      '凌晨': { start: 0, end: 6 },
      '早晨': { start: 6, end: 9 },
    },
    duration: { '小時': 60, '分鐘': 1, '天': 480, '半天': 240, '半小時': 30 },
    todoKeywords: ['待辦', 'todo', '任務', '要做', '需要做', '記得', '購買', '聯繫', '處理'],
    noteKeywords: ['筆記', 'note', '記錄', '想法', '感悟', '總結'],
    locationPrefixes: ['在', '於', '地點', '位置', '地址', '去', '到'],
    peoplePrefixes: ['見', '和', '與', '同', '跟'],
    actionVerbs: ['開會', '見面', '討論', '商量', '彙報', '溝通', '交流', '約', '談', '聊', '吃飯', '聚餐', '活動'],
    morning: ['上午', '早上', '早晨', '早'],
    afternoon: ['下午', '午後'],
    evening: ['晚上', '傍晚', '晚間'],
    night: ['晚上', '夜裡', '深夜'],
  },
  'en-US': {
    relativeDays: { 'today': 0, 'tomorrow': 1, 'day after tomorrow': 2, 'yesterday': -1, 'day before yesterday': -2 },
    timeOfDay: {
      'morning': { start: 9, end: 12 },
      'afternoon': { start: 14, end: 18 },
      'evening': { start: 18, end: 22 },
      'noon': { start: 12, end: 14 },
      'night': { start: 20, end: 24 },
      'midnight': { start: 0, end: 2 },
      'dawn': { start: 5, end: 7 },
    },
    duration: { 'hour': 60, 'hours': 60, 'minute': 1, 'minutes': 1, 'day': 480, 'days': 480, 'half hour': 30, 'half day': 240 },
    todoKeywords: ['todo', 'task', 'need to', 'have to', 'remember to', 'buy', 'call', 'contact'],
    noteKeywords: ['note', 'notes', 'record', 'idea', 'thought', 'summary'],
    locationPrefixes: ['at', 'in', 'location', 'place', 'to', 'venue'],
    peoplePrefixes: ['meet', 'with', 'and', 'see'],
    actionVerbs: ['meeting', 'meet', 'discuss', 'talk', 'call', 'chat', 'lunch', 'dinner', 'activity'],
    morning: ['morning', 'am', 'a.m.'],
    afternoon: ['afternoon', 'pm', 'p.m.'],
    evening: ['evening', 'eve'],
    night: ['night', 'tonight'],
  },
  'ja-JP': {
    relativeDays: { '今日': 0, '明日': 1, '明後日': 2, '昨日': -1, '一昨日': -2 },
    timeOfDay: {
      '午前': { start: 9, end: 12 },
      '午後': { start: 14, end: 18 },
      '夜': { start: 18, end: 22 },
      '昼': { start: 12, end: 14 },
      '朝': { start: 6, end: 9 },
      '深夜': { start: 0, end: 6 },
    },
    duration: { '時間': 60, '分': 1, '日': 480, '半日': 240, '半時間': 30 },
    todoKeywords: ['やること', 'todo', 'タスク', 'やる', '覚える', '買う', '連絡'],
    noteKeywords: ['メモ', 'note', '記録', 'アイデア', '感想', 'まとめ'],
    locationPrefixes: ['で', 'に', '場所', '位置', 'へ'],
    peoplePrefixes: ['と', 'と会う', 'さんと'],
    actionVerbs: ['会議', '会う', '話す', '相談', '連絡', 'ランチ', 'ディナー'],
    morning: ['午前', '朝', 'モーニング'],
    afternoon: ['午後'],
    evening: ['夕方', '夜'],
    night: ['夜', '深夜'],
  },
  'ko-KR': {
    relativeDays: { '오늘': 0, '내일': 1, '모레': 2, '글피': 3, '어제': -1, '그제': -2 },
    timeOfDay: {
      '오전': { start: 9, end: 12 },
      '오후': { start: 14, end: 18 },
      '저녁': { start: 18, end: 22 },
      '정오': { start: 12, end: 14 },
      '새벽': { start: 0, end: 6 },
      '아침': { start: 6, end: 9 },
    },
    duration: { '시간': 60, '분': 1, '일': 480, '반나절': 240, '30분': 30 },
    todoKeywords: ['할일', 'todo', '태스크', '해야', '기억', '사기', '연락'],
    noteKeywords: ['메모', 'note', '기록', '아이디어', '생각', '정리'],
    locationPrefixes: ['에서', '에', '장소', '위치', '로'],
    peoplePrefixes: ['와', '이랑', '하고', '만나'],
    actionVerbs: ['회의', '만나', '상의', '이야기', '연락', '점심', '저녁'],
    morning: ['오전', '아침'],
    afternoon: ['오후'],
    evening: ['저녁', '해질녘'],
    night: ['밤', '심야'],
  },
};

function getKeywords(locale: SupportedLocale): TimeKeywords {
  return TIME_KEYWORDS[locale] || TIME_KEYWORDS['en-US'];
}

function hasAnyKeyword(input: string, keywords: string[]): boolean {
  const lowerInput = input.toLowerCase();
  return keywords.some((keyword) => lowerInput.includes(keyword.toLowerCase()));
}

function extractByPrefix(input: string, prefixes: string[], actionVerbs: string[], maxLength: number = 20): string | null {
  for (const prefix of prefixes) {
    const actionPattern = actionVerbs.join('|');
    const regex = new RegExp(`${prefix}([\\u4e00-\\u9fa5a-zA-Z0-9\\s]{2,${maxLength}}?)(?=(?:${actionPattern}|[和与同跟，,。！？\\s]|$))`, 'i');
    const match = input.match(regex);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function parseRelativeDay(input: string, keywords: TimeKeywords): number | null {
  const lowerInput = input.toLowerCase();
  for (const [keyword, days] of Object.entries(keywords.relativeDays)) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      return days;
    }
  }
  return null;
}

function parseTimeOfDay(input: string, keywords: TimeKeywords): { hour: number; minute: number } | null {
  for (const [keyword, range] of Object.entries(keywords.timeOfDay)) {
    const keywordIndex = input.indexOf(keyword);
    if (keywordIndex !== -1) {
      const afterKeyword = input.slice(keywordIndex + keyword.length);
      const hourMatch = afterKeyword.match(/(\d{1,2})[:：时時]?(\d{0,2})/);
      if (hourMatch) {
        let hour = parseInt(hourMatch[1]);
        const minute = hourMatch[2] ? parseInt(hourMatch[2]) : 0;
        
        if (keywords.night.some(k => input.includes(k)) && hour === 12) {
          hour = 0;
        } else if (keywords.afternoon.some(k => input.includes(k)) && hour < 12 && hour !== 12) {
          hour += 12;
        } else if (keywords.night.some(k => input.includes(k)) && hour < 12 && hour !== 12) {
          hour += 12;
        } else if (keywords.morning.some(k => input.includes(k)) && hour === 12) {
          hour = 0;
        }
        
        return { hour, minute };
      }
      return { hour: range.start, minute: 0 };
    }
  }
  return null;
}

function parseExplicitTime(input: string): { hour: number; minute: number } | null {
  const patterns = [
    /(\d{1,2})[:：时時](\d{1,2})/,
    /(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i,
    /(\d{1,2})\s*(点|時)/,
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2] && !isNaN(parseInt(match[2])) ? parseInt(match[2]) : 0;
      
      const period = match[2]?.toString().toLowerCase();
      if ((period === 'pm' || period === 'p.m.') && hour < 12) {
        hour += 12;
      } else if ((period === 'am' || period === 'a.m.') && hour === 12) {
        hour = 0;
      }
      
      return { hour, minute };
    }
  }
  return null;
}

function parseAbsoluteDate(input: string): { month: number; day: number; year?: number } | null {
  const patterns = [
    /(\d{1,2})[月\/\-](\d{1,2})[日号]?/,
    /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})/i,
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
  ];
  
  const monthMap: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
  };
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      if (match[0].match(/\d{4}/)) {
        return { year: parseInt(match[1]), month: parseInt(match[2]) - 1, day: parseInt(match[3]) };
      }
      if (match[1].toLowerCase() in monthMap) {
        return { month: monthMap[match[1].toLowerCase()], day: parseInt(match[2]) };
      }
      if (match[2]?.toLowerCase() in monthMap) {
        return { month: monthMap[match[2].toLowerCase()], day: parseInt(match[1]) };
      }
      return { month: parseInt(match[1]) - 1, day: parseInt(match[2]) };
    }
  }
  return null;
}

function parseWeekday(input: string, locale: SupportedLocale): number | null {
  const weekdayPatterns: Record<SupportedLocale, Record<string, number>> = {
    'zh-CN': { '周日': 0, '周天': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6 },
    'zh-TW': { '週日': 0, '週天': 0, '週一': 1, '週二': 2, '週三': 3, '週四': 4, '週五': 5, '週六': 6, '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6 },
    'en-US': { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 },
    'ja-JP': { '日曜日': 0, '月曜日': 1, '火曜日': 2, '水曜日': 3, '木曜日': 4, '金曜日': 5, '土曜日': 6 },
    'ko-KR': { '일요일': 0, '월요일': 1, '화요일': 2, '수요일': 3, '목요일': 4, '금요일': 5, '토요일': 6 },
  };
  
  const patterns = weekdayPatterns[locale] || weekdayPatterns['en-US'];
  const lowerInput = input.toLowerCase();
  
  for (const [keyword, day] of Object.entries(patterns)) {
    if (lowerInput.includes(keyword.toLowerCase())) {
      const isNext = lowerInput.includes('下') || lowerInput.includes('next');
      return isNext ? day + 7 : day;
    }
  }
  return null;
}

function parseDuration(input: string, keywords: TimeKeywords): number | null {
  const durationMatch = input.match(/(\d+)\s*(?:小时|小時|時間|시간|hour|hours|分钟|分鐘|分|minute|minutes|天|日|day|days)/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    for (const [keyword, minutes] of Object.entries(keywords.duration)) {
      if (input.includes(keyword)) {
        return value * minutes;
      }
    }
  }
  
  const sortedKeywords = Object.entries(keywords.duration).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, minutes] of sortedKeywords) {
    if (input.includes(keyword) && !input.match(/\d+/)) {
      return minutes;
    }
  }
  
  return null;
}

function determineType(input: string, hasDate: boolean, keywords: TimeKeywords): 'todo' | 'event' | 'note' {
  if (hasAnyKeyword(input, keywords.todoKeywords)) return 'todo';
  if (hasAnyKeyword(input, keywords.noteKeywords)) return 'note';
  if (hasDate) return 'event';
  return 'event';
}

function calculateConfidence(hasDate: boolean, hasTime: boolean, hasLocation: boolean, hasPeople: boolean): number {
  let confidence = 0.5;
  if (hasDate) confidence += 0.15;
  if (hasTime) confidence += 0.15;
  if (hasLocation) confidence += 0.1;
  if (hasPeople) confidence += 0.1;
  return Math.min(confidence, 1.0);
}

function getChronoLocale(locale: SupportedLocale) {
  switch (locale) {
    case 'zh-CN':
    case 'zh-TW':
      return chrono.zh;
    case 'ja-JP':
      return chrono.ja;
    case 'en-US':
    default:
      return chrono.en;
  }
}

function parseWithChrono(input: string, locale: SupportedLocale, baseDate: Date): {
  start?: Date;
  end?: Date;
  text?: string;
} {
  try {
    const chronoLocale = getChronoLocale(locale);
    const results = chronoLocale.parse(input, baseDate, { forwardDate: true });
    
    if (results.length > 0) {
      const result = results[0];
      return {
        start: result.start.date(),
        end: result.end?.date(),
        text: result.text,
      };
    }
  } catch (error) {
    console.warn('Chrono parse error:', error);
  }
  
  return {};
}

function parseWithCustomEngine(input: string, locale: SupportedLocale, baseDate: Date): {
  start?: Date;
  end?: Date;
  hasTime?: boolean;
} {
  const keywords = getKeywords(locale);
  let parsedDate = new Date(baseDate);
  let hasDate = false;
  let hasTime = false;

  const relativeDays = parseRelativeDay(input, keywords);
  if (relativeDays !== null) {
    parsedDate.setDate(parsedDate.getDate() + relativeDays);
    hasDate = true;
  }

  const absoluteDate = parseAbsoluteDate(input);
  if (absoluteDate) {
    parsedDate.setMonth(absoluteDate.month);
    parsedDate.setDate(absoluteDate.day);
    if (absoluteDate.year) {
      parsedDate.setFullYear(absoluteDate.year);
    }
    hasDate = true;
  }

  const weekday = parseWeekday(input, locale);
  if (weekday !== null) {
    const currentDay = parsedDate.getDay();
    let daysUntil = weekday - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    parsedDate.setDate(parsedDate.getDate() + daysUntil);
    hasDate = true;
  }

  const timeOfDay = parseTimeOfDay(input, keywords);
  if (timeOfDay) {
    parsedDate.setHours(timeOfDay.hour, timeOfDay.minute, 0, 0);
    hasTime = true;
    hasDate = true;
  }

  const explicitTime = parseExplicitTime(input);
  if (explicitTime && !hasTime) {
    parsedDate.setHours(explicitTime.hour, explicitTime.minute, 0, 0);
    hasTime = true;
    hasDate = true;
  }

  if (hasDate) {
    return { start: parsedDate, hasTime };
  }

  return {};
}

export function resolveRelativeDate(keyword: string, baseDate: Date = new Date(), locale: SupportedLocale = 'zh-CN'): Date {
  const keywords = getKeywords(locale);
  const lowerKeyword = keyword.toLowerCase();
  
  for (const [kw, days] of Object.entries(keywords.relativeDays)) {
    if (lowerKeyword.includes(kw.toLowerCase())) {
      const result = new Date(baseDate);
      result.setDate(result.getDate() + days);
      return result;
    }
  }
  
  const chronoResult = parseWithChrono(keyword, locale, baseDate);
  if (chronoResult.start) {
    return chronoResult.start;
  }
  
  const customResult = parseWithCustomEngine(keyword, locale, baseDate);
  if (customResult.start) {
    return customResult.start;
  }
  
  const dayOfWeek = baseDate.getDay();
  const weekdayPatterns: Record<SupportedLocale, Record<string, number>> = {
    'zh-CN': { '周日': 0, '周天': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6 },
    'zh-TW': { '週日': 0, '週天': 0, '週一': 1, '週二': 2, '週三': 3, '週四': 4, '週五': 5, '週六': 6, '星期日': 0, '星期一': 1, '星期二': 2, '星期三': 3, '星期四': 4, '星期五': 5, '星期六': 6 },
    'en-US': { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 },
    'ja-JP': { '日曜日': 0, '月曜日': 1, '火曜日': 2, '水曜日': 3, '木曜日': 4, '金曜日': 5, '土曜日': 6 },
    'ko-KR': { '일요일': 0, '월요일': 1, '화요일': 2, '수요일': 3, '목요일': 4, '금요일': 5, '토요일': 6 },
  };
  
  const patterns = weekdayPatterns[locale] || weekdayPatterns['en-US'];
  
  for (const [kw, targetDay] of Object.entries(patterns)) {
    if (lowerKeyword.includes(kw.toLowerCase())) {
      const result = new Date(baseDate);
      const isNext = lowerKeyword.includes('下') || lowerKeyword.includes('next');
      let daysUntil = targetDay - dayOfWeek;
      
      if (isNext) {
        daysUntil += 7;
      } else if (daysUntil <= 0) {
        daysUntil += 7;
      }
      
      result.setDate(result.getDate() + daysUntil);
      return result;
    }
  }
  
  return baseDate;
}

export async function parseNaturalLanguage(input: string, locale: SupportedLocale = 'zh-CN'): Promise<ParsedResult> {
  const result: ParsedResult = {
    title: input.trim(),
    confidence: 0.5,
    rawInput: input,
  };

  const keywords = getKeywords(locale);
  const now = new Date();
  
  let startTimestamp: number | undefined;
  let endTimestamp: number | undefined;
  let parsedDate: Date | undefined;
  let hasDate = false;
  let hasTime = false;

  if (locale.startsWith('en') || locale === 'ja-JP') {
    const chronoResult = parseWithChrono(input, locale, now);
    if (chronoResult.start) {
      parsedDate = chronoResult.start;
      startTimestamp = chronoResult.start.getTime();
      hasDate = true;
      hasTime = chronoResult.start.getHours() !== 0 || chronoResult.start.getMinutes() !== 0;
      
      if (chronoResult.end) {
        endTimestamp = chronoResult.end.getTime();
      }
    }
  }

  if (!parsedDate) {
    const customResult = parseWithCustomEngine(input, locale, now);
    if (customResult.start) {
      parsedDate = customResult.start;
      startTimestamp = customResult.start.getTime();
      hasDate = true;
      hasTime = customResult.hasTime || false;
      
      if (customResult.end) {
        endTimestamp = customResult.end.getTime();
      }
    }
  }

  if (parsedDate) {
    result.date = parsedDate;
    result.startTimestamp = startTimestamp;
    result.endTimestamp = endTimestamp;
  }

  if (hasTime && parsedDate) {
    const hour = parsedDate.getHours();
    const minute = parsedDate.getMinutes();
    result.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  result.type = determineType(input, hasDate, keywords);

  const duration = parseDuration(input, keywords);
  if (duration) {
    result.duration = duration;
    
    if (startTimestamp && !endTimestamp) {
      result.endTimestamp = startTimestamp + duration * 60 * 1000;
    }
  }

  const location = extractByPrefix(input, keywords.locationPrefixes, keywords.actionVerbs);
  if (location) {
    result.location = location;
  }

  const people = extractByPrefix(input, keywords.peoplePrefixes, keywords.actionVerbs, 10);
  if (people) {
    result.people = [people];
  }

  result.confidence = calculateConfidence(hasDate, hasTime, !!result.location, !!result.people);

  return result;
}

export function formatTimeRange(start: Date, end: Date, locale: SupportedLocale = 'zh-CN'): string {
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const endHour = end.getHours();
  const endMinute = end.getMinutes();

  const keywords = getKeywords(locale);
  
  const formatHour = (h: number) => {
    if (locale.startsWith('zh') || locale === 'ja-JP' || locale === 'ko-KR') {
      if (h >= 12) {
        return `${keywords.afternoon[0]}${h === 12 ? 12 : h - 12}`;
      }
      return `${keywords.morning[0]}${h === 0 ? 12 : h}`;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour} ${period}`;
  };

  return `${formatHour(startHour)}:${startMinute.toString().padStart(2, '0')} - ${formatHour(endHour)}:${endMinute.toString().padStart(2, '0')}`;
}

export function formatRelativeDate(date: Date, locale: SupportedLocale = 'zh-CN'): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((dateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  const keywords = getKeywords(locale);
  
  for (const [keyword, days] of Object.entries(keywords.relativeDays)) {
    if (diffDays === days) {
      return keyword;
    }
  }

  if (diffDays > 0 && diffDays < 7) {
    if (locale.startsWith('en')) return `${diffDays} days from now`;
    if (locale === 'ja-JP') return `${diffDays}日後`;
    if (locale === 'ko-KR') return `${diffDays}일 후`;
    return `${diffDays}天后`;
  }
  
  if (diffDays < 0 && diffDays > -7) {
    if (locale.startsWith('en')) return `${Math.abs(diffDays)} days ago`;
    if (locale === 'ja-JP') return `${Math.abs(diffDays)}日前`;
    if (locale === 'ko-KR') return `${Math.abs(diffDays)}일 전`;
    return `${Math.abs(diffDays)}天前`;
  }

  return date.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
}

export function toTimestamp(date: Date): number {
  return date.getTime();
}

export function fromTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}
