export interface ParsedResult {
  title: string
  date?: Date
  time?: string
  duration?: number
  location?: string
  type?: 'todo' | 'event' | 'note'
  people?: string[]
}

const TIME_PATTERN = /((?:上午|下午|早上|晚上|中午|凌晨)?\s*(?:早上|上午|下午|晚上|中午|凌晨)?\s*(\d{1,2})(?::(\d{2}))?\s*(?:点|时)?(?:\s*(\d{1,2})(?::(\d{2}))?\s*分?)?)/gi

const DATE_PATTERN = /((?:下周|这周|本周|下周|下周|今天|明天|后天|大后天|下周一|下周二|下周三|下周四|下周五|下周六|下周日|周一|周二|周三|周四|周五|周六|周日|本月|下月|今年|明年)?(?:年)?(\d+)?(?:月)?(\d+)?(?:日|号)?)/gi

const LOCATION_PATTERN = /(?:在|于|地点|位置|地址|去|到)\s*([^，,，\s]{2,20})/gi

const PEOPLE_PATTERN = /(?:见|和|与|同|跟)\s*([^\s，,，]{2,10})(?:总|总|老师|先生|女士|博士|经理|总监|CEO|CTO|CFO)/gi

const DURATION_PATTERN = /(\d+)\s*(?:小时|小时|分钟|半|天|周)/gi

const TODO_KEYWORDS = ['待办', 'todo', '任务', '要做', '需要做', '记得', '购买', '联系', '处理']
const NOTE_KEYWORDS = ['笔记', 'note', '记录', '想法', '感悟', '总结']

export async function parseNaturalLanguage(input: string): Promise<ParsedResult> {
  const result: ParsedResult = {
    title: input.trim(),
  }

  const lowerInput = input.toLowerCase()

  for (const keyword of TODO_KEYWORDS) {
    if (lowerInput.includes(keyword)) {
      result.type = 'todo'
      break
    }
  }

  for (const keyword of NOTE_KEYWORDS) {
    if (lowerInput.includes(keyword)) {
      result.type = 'note'
      break
    }
  }

  if (!result.type) {
    result.type = 'event'
  }

  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()

  if (input.includes('今天')) {
    result.date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  } else if (input.includes('明天')) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    result.date = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  } else if (input.includes('后天')) {
    const dayAfter = new Date(now)
    dayAfter.setDate(dayAfter.getDate() + 2)
    result.date = new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate())
  } else if (input.includes('下周')) {
    const daysUntilNextWeek = 7 - currentDay + 1
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + daysUntilNextWeek)
    result.date = new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate())
  } else if (input.includes('周一') || input.includes('周二') || input.includes('周三') ||
             input.includes('周四') || input.includes('周五') || input.includes('周六') || input.includes('周日')) {
    const weekDays: Record<string, number> = {
      '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6
    }
    for (const [day, dayNum] of Object.entries(weekDays)) {
      if (input.includes(day)) {
        let daysUntil = dayNum - currentDay
        if (daysUntil <= 0) daysUntil += 7
        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + daysUntil)
        result.date = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
        break
      }
    }
  }

  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(?:点|时)/)
  if (timeMatch) {
    let hour = parseInt(timeMatch[1])
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    
    if (input.includes('下午') || input.includes('晚上')) {
      if (hour < 12) hour += 12
    } else if (input.includes('上午') || input.includes('早上')) {
      if (hour === 12) hour = 0
    }
    
    result.time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    
    if (result.date) {
      result.date = new Date(
        result.date.getFullYear(),
        result.date.getMonth(),
        result.date.getDate(),
        hour,
        minute
      )
    }
  }

  const durationMatch = input.match(/(\d+)\s*(?:小时|小时|分钟)/)
  if (durationMatch) {
    const value = parseInt(durationMatch[1])
    if (input.includes('小时')) {
      result.duration = value * 60
    } else if (input.includes('分钟')) {
      result.duration = value
    } else if (input.includes('天')) {
      result.duration = value * 24 * 60
    }
  } else if (input.includes('半天')) {
    result.duration = 4 * 60
  } else if (input.includes('半小时')) {
    result.duration = 30
  }

  const locationMatch = input.match(/(?:在|于|地点|位置|地址|去|到)\s*([^，,，\s]{2,20})/)
  if (locationMatch) {
    result.location = locationMatch[1].trim()
  }

  const peopleMatch = input.match(/(?:见|和|与|同|跟)\s*([^\s，,，]{2,10})/)
  if (peopleMatch) {
    result.people = [peopleMatch[1].trim()]
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
