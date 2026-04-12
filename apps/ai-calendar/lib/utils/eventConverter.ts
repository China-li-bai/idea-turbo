import type { UnifiedCalendarItem } from '@/types/unified'

interface ScheduleXEvent {
  id: string | number
  title: string
  description?: string
  location?: string
  start: Temporal.PlainDate | Temporal.ZonedDateTime
  end: Temporal.PlainDate | Temporal.ZonedDateTime
  calendarId?: string
  people?: string[]
}

export function convertToScheduleXEvent(item: UnifiedCalendarItem): ScheduleXEvent {
  const startDate = new Date(item.startTime!)
  const endDate = new Date(item.endTime!)
  
  const start = item.isAllDay
    ? Temporal.PlainDate.from(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`)
    : Temporal.ZonedDateTime.from(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}T${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}:00[Asia/Shanghai]`)
  
  const end = item.isAllDay
    ? Temporal.PlainDate.from(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`)
    : Temporal.ZonedDateTime.from(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00[Asia/Shanghai]`)

  let displayTitle = item.title
  if (item.metadata.eventType === 'shift' && item.metadata.shiftMetadata) {
    displayTitle = `[排班] ${displayTitle}`
  }

  return {
    id: item.id,
    title: displayTitle,
    description: item.metadata.description,
    location: item.metadata.location,
    start,
    end,
    calendarId: item.metadata.color || 'leisure',
    people: [],
  }
}

export function convertFromScheduleXEvent(sxEvent: any): Omit<UnifiedCalendarItem, 'embedding' | 'embeddingUpdatedAt'> {
  let startTime: number
  let endTime: number
  let isAllDay = false

  if (sxEvent.start instanceof Temporal.PlainDate) {
    isAllDay = true
    startTime = new Date(sxEvent.start.toString() + 'T00:00:00').getTime()
    endTime = new Date(sxEvent.end.toString() + 'T23:59:59').getTime()
  } else if (sxEvent.start instanceof Temporal.ZonedDateTime) {
    startTime = new Date(sxEvent.start.toString()).getTime()
    endTime = new Date(sxEvent.end.toString()).getTime()
  } else {
    startTime = Date.now()
    endTime = Date.now()
  }

  const now = Date.now()

  return {
    id: String(sxEvent.id),
    type: 'event',
    title: sxEvent.title,
    content: sxEvent.description || sxEvent.title,
    startTime,
    endTime,
    isAllDay,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
    metadata: {
      description: sxEvent.description,
      location: sxEvent.location,
      eventType: 'regular',
    },
  }
}
