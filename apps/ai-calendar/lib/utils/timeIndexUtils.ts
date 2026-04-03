import type { UnifiedCalendarItem } from '@/types/unified';

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface TimeBloomFilter {
  hourMask: number;
  dayMask: number;
  monthMask: number;
  hasTimeData: boolean;
  itemCount: number;
  lastUpdated: number;
}

export interface TimeBlock {
  id: string;
  timeKey: string;
  itemIds: string[];
  bloomFilter: TimeBloomFilter;
  timeRange: {
    earliest: number;
    latest: number;
  };
}

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

export interface TimeIndexOptions {
  granularity: TimeGranularity;
  enableBloomFilter: boolean;
  autoCleanup: boolean;
  maxItemsPerBlock: number;
}

export const DEFAULT_TIME_INDEX_OPTIONS: TimeIndexOptions = {
  granularity: 'hour',
  enableBloomFilter: true,
  autoCleanup: false,
  maxItemsPerBlock: 100,
};

export function createHourKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
}

export function createDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getTimeKey(date: Date, granularity: TimeGranularity): string {
  switch (granularity) {
    case 'hour':
      return createHourKey(date);
    case 'day':
      return createDayKey(date);
    case 'week':
      return createWeekKey(date);
    case 'month':
      return createMonthKey(date);
  }
}

export function buildBloomFilter(items: UnifiedCalendarItem[]): TimeBloomFilter {
  let hourMask = 0;
  let dayMask = 0;
  let monthMask = 0;
  let hasTimeData = false;

  for (const item of items) {
    if (item.startTime) {
      hasTimeData = true;
      const d = new Date(item.startTime);

      hourMask |= 1 << d.getHours();

      dayMask |= 1 << (d.getDate() - 1);

      monthMask |= 1 << (Math.floor(d.getMonth() / 3));
    }
  }

  return {
    hourMask,
    dayMask,
    monthMask,
    hasTimeData,
    itemCount: items.length,
    lastUpdated: Date.now(),
  };
}

export function checkBloomFilter(
  filter: TimeBloomFilter,
  query: TimeWindow | { hour?: number; day?: number; month?: number }
): boolean {
  if (!filter.hasTimeData) {
    return false;
  }

  if ('hour' in query && query.hour !== undefined) {
    if ((filter.hourMask & (1 << query.hour)) === 0) {
      return false;
    }
  }

  if ('day' in query && query.day !== undefined) {
    if ((filter.dayMask & (1 << (query.day - 1))) === 0) {
      return false;
    }
  }

  if ('month' in query && query.month !== undefined) {
    const season = Math.floor((query.month - 1) / 3);
    if ((filter.monthMask & (1 << season)) === 0) {
      return false;
    }
  }

  return true;
}

export function checkTimeRangeInBloom(
  filter: TimeBloomFilter,
  windowStart: Date,
  windowEnd: Date
): boolean {
  const startHour = windowStart.getHours();
  const endHour = windowEnd.getHours();
  const startDay = windowStart.getDate();
  const endDay = windowEnd.getDate();
  const startMonth = windowStart.getMonth() + 1;
  const endMonth = windowEnd.getMonth() + 1;

  const hourRange = endHour >= startHour
    ? ((filter.hourMask << (24 - endHour - 1)) >>> startHour) !== 0
    : (((filter.hourMask >>> startHour) | (filter.hourMask << (24 - startHour))) & 0xFFFFFF) !== 0;

  if (!hourRange) {
    return false;
  }

  if (startMonth === endMonth) {
    const season = Math.floor((startMonth - 1) / 3);
    if ((filter.monthMask & (1 << season)) === 0) {
      return false;
    }
  } else {
    const seasonStart = Math.floor((startMonth - 1) / 3);
    const seasonEnd = Math.floor((endMonth - 1) / 3);
    let found = false;
    for (let s = seasonStart; s <= seasonEnd; s++) {
      if ((filter.monthMask & (1 << s)) !== 0) {
        found = true;
        break;
      }
    }
    if (!found) {
      return false;
    }
  }

  return true;
}

export function parseTimeWindowFromQuery(
  query: string,
  locale: string = 'zh-CN'
): TimeWindow | null {
  const shortRelativeKeywords: Record<string, { hour: number; windowMinutes: number }> = {
    '中午': { hour: 12, windowMinutes: 120 },
    '下午': { hour: 14, windowMinutes: 240 },
    '早上': { hour: 9, windowMinutes: 180 },
    '上午': { hour: 10, windowMinutes: 180 },
    '晚上': { hour: 19, windowMinutes: 240 },
    '凌晨': { hour: 3, windowMinutes: 240 },
    '傍晚': { hour: 18, windowMinutes: 120 },
  };

  const now = new Date();

  for (const [keyword, config] of Object.entries(shortRelativeKeywords)) {
    if (query.includes(keyword)) {
      const windowStart = new Date(now);
      windowStart.setHours(config.hour, 0, 0, 0);

      const windowEnd = new Date(windowStart);
      windowEnd.setMinutes(windowEnd.getMinutes() + config.windowMinutes);

      return { start: windowStart, end: windowEnd };
    }
  }

  if (query.includes('现在') || query.includes('此刻')) {
    const windowStart = new Date(now);
    windowStart.setMinutes(windowStart.getMinutes() - 30);
    const windowEnd = new Date(now);
    windowEnd.setHours(windowEnd.getHours() + 2);
    return { start: windowStart, end: windowEnd };
  }

  if (query.includes('今天')) {
    const windowStart = new Date(now);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(now);
    windowEnd.setHours(23, 59, 59, 999);
    return { start: windowStart, end: windowEnd };
  }

  if (query.includes('明天')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);
    return { start: tomorrow, end: nextDay };
  }

  if (query.includes('后天')) {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(0, 0, 0, 0);
    const thirdDay = new Date(dayAfter);
    thirdDay.setDate(thirdDay.getDate() + 1);
    return { start: dayAfter, end: thirdDay };
  }

  if (query.includes('本周')) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return { start: weekStart, end: weekEnd };
  }

  if (query.includes('本月')) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: monthStart, end: monthEnd };
  }

  return null;
}
