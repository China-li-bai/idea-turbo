export interface ParsedResult {
  title: string
  date?: Date
  time?: string
  duration?: number
  location?: string
  type?: 'todo' | 'event' | 'note'
  people?: string[]
}

const TODO_KEYWORDS = ['待办', 'todo', '任务', '要做', '需要做', '记得', '购买', '联系', '处理']
const NOTE_KEYWORDS = ['笔记', 'note', '记录', '想法', '感悟', '总结']

const WEEK_DAYS: Record<string, number> = {
  '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6
}

const TIME_PERIODS = ['上午', '下午', '早上', '晚上', '中午', '凌晨']
const LOCATION_PREFIXES = ['在', '于', '地点', '位置', '地址', '去', '到']
const PEOPLE_PREFIXES = ['见', '和', '与', '同', '跟']
const PEOPLE_SUFFIXES = ['总', '老师', '先生', '女士', '博士', '经理', '总监', 'CEO', 'CTO', 'CFO']

function createDate(year: number, month: number, day: number, hour?: number, minute?: number): Date {
  return new Date(year, month, day, hour || 0, minute || 0)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function hasAnyKeyword(input: string, keywords: string[]): boolean {
  const lowerInput = input.toLowerCase()
  return keywords.some(keyword => lowerInput.includes(keyword))
}

function extractByPrefix(input: string, prefixes: string[], maxLength: number = 20): string | null {
  for (const prefix of prefixes) {
    const regex = new RegExp(`${prefix}\\s*([^，,\\s]{2,${maxLength}})`)
    const match = input.match(regex)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

function parseTime(input: string): { hour: number; minute: number } | null {
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(?:点|时)/)
  if (!timeMatch) return null

  let hour = parseInt(timeMatch[1])
  const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0

  if (hasAnyKeyword(input, ['下午', '晚上'])) {
    if (hour < 12) hour += 12
  } else if (hasAnyKeyword(input, ['上午', '早上'])) {
    if (hour === 12) hour = 0
  }

  return { hour, minute }
}

function parseRelativeDate(input: string, now: Date): Date | null {
  if (input.includes('今天')) {
    return createDate(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (input.includes('明天')) {
    const tomorrow = addDays(now, 1)
    return createDate(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  }
  if (input.includes('后天')) {
    const dayAfter = addDays(now, 2)
    return createDate(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate())
  }
  if (input.includes('下周')) {
    const daysUntilNextWeek = 7 - now.getDay() + 1
    const nextWeek = addDays(now, daysUntilNextWeek)
    return createDate(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate())
  }

  for (const [day, dayNum] of Object.entries(WEEK_DAYS)) {
    if (input.includes(day)) {
      let daysUntil = dayNum - now.getDay()
      if (daysUntil <= 0) daysUntil += 7
      const targetDate = addDays(now, daysUntil)
      return createDate(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    }
  }

  return null
}

function parseDuration(input: string): number | null {
  const durationMatch = input.match(/(\d+)\s*(?:小时|分钟|天)/)
  if (durationMatch) {
    const value = parseInt(durationMatch[1])
    if (input.includes('小时')) return value * 60
    if (input.includes('分钟')) return value
    if (input.includes('天')) return value * 24 * 60
  }
  if (input.includes('半天')) return 4 * 60
  if (input.includes('半小时')) return 30
  return null
}

export async function parseNaturalLanguage(input: string): Promise<ParsedResult> {
  const result: ParsedResult = {
    title: input.trim(),
  }

  if (hasAnyKeyword(input, TODO_KEYWORDS)) {
    result.type = 'todo'
  } else if (hasAnyKeyword(input, NOTE_KEYWORDS)) {
    result.type = 'note'
  } else {
    result.type = 'event'
  }

  const now = new Date()

  const relativeDate = parseRelativeDate(input, now)
  if (relativeDate) {
    result.date = relativeDate
  }

  const time = parseTime(input)
  if (time) {
    result.time = `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`
    if (result.date) {
      result.date = createDate(
        result.date.getFullYear(),
        result.date.getMonth(),
        result.date.getDate(),
        time.hour,
        time.minute
      )
    }
  }

  const duration = parseDuration(input)
  if (duration) {
    result.duration = duration
  }

  const location = extractByPrefix(input, LOCATION_PREFIXES)
  if (location) {
    result.location = location
  }

  const people = extractByPrefix(input, PEOPLE_PREFIXES, 10)
  if (people) {
    result.people = [people]
  }

  return result
}

export function formatTimeRange(start: Date, end: Date): string {
  const startHour = start.getHours()
  const startMinute = start.getMinutes()
  const endHour = end.getHours()
  const endMinute = end.getMinutes()
  
  const formatHour = (h: number) => {
    if (h >= 12) {
      return `下午${h === 12 ? 12 : h - 12}`
    }
    return `上午${h === 0 ? 12 : h}`
  }
  
  return `${formatHour(startHour)}:${startMinute.toString().padStart(2, '0')} - ${formatHour(endHour)}:${endMinute.toString().padStart(2, '0')}`
}

export function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === 2) return '后天'
  if (diffDays > 0 && diffDays < 7) return `${diffDays}天后`
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
