'use client'

import { useState, useEffect } from 'react'
import {
  viewDay,
  viewMonthAgenda,
  viewMonthGrid,
  viewWeek,
} from '@schedule-x/calendar'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createEventModalPlugin } from '@schedule-x/event-modal'
import { ScheduleXCalendar, useNextCalendarApp } from '@schedule-x/react'
import '@schedule-x/theme-default/dist/index.css'
import 'temporal-polyfill/global'
import { useCalendarStore } from '@/lib/stores/calendarStore'
import { useTheme } from 'nextra-theme-docs'
import { convertToScheduleXEvent, convertFromScheduleXEvent } from '@/lib/utils/eventConverter'
import { detectUserLocale, loadScheduleXTranslations, type SupportedLocale } from '@/lib/utils/i18n'
import type { CalendarEvent } from '@/types'

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void
}

export default function CalendarView({ onEventClick }: CalendarViewProps) {
  const { resolvedTheme } = useTheme()
  const { events, settings, updateEvent } = useCalendarStore()
  const [isMobile, setIsMobile] = useState(false)
  const [locale, setLocale] = useState<SupportedLocale>('zh-CN')
  const [translations, setTranslations] = useState<any>(null)

  useEffect(() => {
    const detectedLocale = detectUserLocale()
    setLocale(detectedLocale)
    
    loadScheduleXTranslations(detectedLocale).then(t => {
      setTranslations(t)
    })
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const sxEvents = events.length > 0 
    ? events.map(event => convertToScheduleXEvent(event))
    : getDefaultEvents(locale)

  const calendarApp = useNextCalendarApp({
    views: [viewMonthGrid, viewMonthAgenda, viewWeek, viewDay],
    selectedDate: Temporal.PlainDate.from(new Date().toISOString().split('T')[0]),
    isDark: resolvedTheme === 'dark',
    defaultView: isMobile ? viewMonthAgenda.name : viewWeek.name,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    events: sxEvents,
    translations: translations,
    calendars: {
      leisure: {
        colorName: 'leisure',
        lightColors: {
          main: '#1c7df9',
          container: '#d2e7ff',
          onContainer: '#002859',
        },
        darkColors: {
          main: '#c0dfff',
          onContainer: '#dee6ff',
          container: '#426aa2',
        },
      },
      work: {
        colorName: 'work',
        lightColors: {
          main: '#f91c45',
          container: '#ffd2dc',
          onContainer: '#59000d',
        },
        darkColors: {
          main: '#ffc0cc',
          onContainer: '#ffdee6',
          container: '#a24258',
        },
      },
      personal: {
        colorName: 'personal',
        lightColors: {
          main: '#1cf9b0',
          container: '#dafff0',
          onContainer: '#004d3d',
        },
        darkColors: {
          main: '#c0fff5',
          onContainer: '#e6fff5',
          container: '#42a297',
        },
      },
    },
    plugins: [createDragAndDropPlugin(), createEventModalPlugin()],
    callbacks: {
      onEventClick: (event: any) => {
        if (onEventClick) {
          onEventClick(convertFromScheduleXEvent(event))
        }
      },
      onEventUpdate: (event: any) => {
        const updatedEvent = convertFromScheduleXEvent(event)
        updateEvent(updatedEvent.id, updatedEvent)
      },
    },
  })

  return <ScheduleXCalendar calendarApp={calendarApp} />
}

function getDefaultEvents(locale: SupportedLocale) {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`

  const eventTitles = {
    'zh-CN': {
      meeting: '团队周会',
      meetingWith: '与王总会面',
      gym: '健身',
    },
    'zh-TW': {
      meeting: '團隊週會',
      meetingWith: '與王總會面',
      gym: '健身',
    },
    'en-US': {
      meeting: 'Team Weekly Meeting',
      meetingWith: 'Meeting with CEO Wang',
      gym: 'Gym',
    },
    'ja-JP': {
      meeting: 'チーム週次ミーティング',
      meetingWith: '王社長と面会',
      gym: 'ジム',
    },
    'ko-KR': {
      meeting: '팀 주간 회의',
      meetingWith: '왕 대표 미팅',
      gym: '헬스장',
    },
  }

  const titles = eventTitles[locale] || eventTitles['zh-CN']

  return [
    {
      id: '1',
      title: titles.meeting,
      start: Temporal.PlainDate.from(todayStr),
      end: Temporal.PlainDate.from(todayStr),
      calendarId: 'work',
    },
    {
      id: '2',
      title: titles.meetingWith,
      start: Temporal.ZonedDateTime.from(`${todayStr}T10:00:00[Asia/Shanghai]`),
      end: Temporal.ZonedDateTime.from(`${todayStr}T11:30:00[Asia/Shanghai]`),
      calendarId: 'work',
    },
    {
      id: '3',
      title: titles.gym,
      start: Temporal.ZonedDateTime.from(`${todayStr}T18:00:00[Asia/Shanghai]`),
      end: Temporal.ZonedDateTime.from(`${todayStr}T19:00:00[Asia/Shanghai]`),
      calendarId: 'leisure',
    },
  ]
}
