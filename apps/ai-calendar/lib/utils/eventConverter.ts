import type { CalendarEvent } from '@/types'

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

export function convertToScheduleXEvent(event: CalendarEvent): ScheduleXEvent {
  const startDate = new Date(event.startTime)
  const endDate = new Date(event.endTime)
  
  const start = event.isAllDay
    ? Temporal.PlainDate.from(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`)
    : Temporal.ZonedDateTime.from(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}T${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}:00[Asia/Shanghai]`)
  
  const end = event.isAllDay
    ? Temporal.PlainDate.from(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`)
    : Temporal.ZonedDateTime.from(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00[Asia/Shanghai]`)

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    start,
    end,
    calendarId: event.color || 'leisure',
    people: [],
  }
}

export function convertFromScheduleXEvent(sxEvent: any): CalendarEvent {
  let startTime: Date
  let endTime: Date
  let isAllDay = false

  if (sxEvent.start instanceof Temporal.PlainDate) {
    isAllDay = true
    startTime = new Date(sxEvent.start.toString() + 'T00:00:00')
    endTime = new Date(sxEvent.end.toString() + 'T23:59:59')
  } else if (sxEvent.start instanceof Temporal.ZonedDateTime) {
    startTime = sxEvent.start.toDate()
    endTime = sxEvent.end.toDate()
  } else {
    startTime = new Date(sxEvent.start)
    endTime = new Date(sxEvent.end)
  }

  return {
    id: String(sxEvent.id),
    title: sxEvent.title,
    description: sxEvent.description,
    location: sxEvent.location,
    startTime,
    endTime,
    isAllDay,
    viewMode: 'personal',
    reminders: [],
  }
}
