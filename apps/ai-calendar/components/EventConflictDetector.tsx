'use client'

import { useMemo } from 'react'
import type { CalendarEvent } from '@/types'
import styles from './eventConflictDetector.module.scss'

export interface ConflictInfo {
  eventIds: string[]
  timeRange: {
    start: Date
    end: Date
  }
  severity: 'high' | 'medium' | 'low'
}

interface EventConflictDetectorProps {
  events: CalendarEvent[]
  selectedDate?: Date
}

export default function EventConflictDetector({ events, selectedDate }: EventConflictDetectorProps) {
  const conflicts = useMemo(() => {
    if (!selectedDate) return []
    
    const dayStart = new Date(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDate)
    dayEnd.setHours(23, 59, 59, 999)

    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.startTime)
      const eventEnd = new Date(event.endTime)
      return (eventStart >= dayStart && eventStart <= dayEnd) ||
             (eventEnd >= dayStart && eventEnd <= dayEnd) ||
             (eventStart <= dayStart && eventEnd >= dayEnd)
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    const foundConflicts: ConflictInfo[] = []

    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const eventA = dayEvents[i]
        const eventB = dayEvents[j]
        
        const startA = new Date(eventA.startTime)
        const endA = new Date(eventA.endTime)
        const startB = new Date(eventB.startTime)
        const endB = new Date(eventB.endTime)

        if (startB < endA) {
          const overlapStart = startB
          const overlapEnd = endA < endB ? endA : endB
          const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
          
          let severity: 'high' | 'medium' | 'low' = 'low'
          if (overlapMinutes >= 60) {
            severity = 'high'
          } else if (overlapMinutes >= 30) {
            severity = 'medium'
          }

          const existingConflict = foundConflicts.find(
            c => c.eventIds.includes(eventA.id) && c.eventIds.includes(eventB.id)
          )

          if (!existingConflict) {
            foundConflicts.push({
              eventIds: [eventA.id, eventB.id],
              timeRange: {
                start: overlapStart,
                end: overlapEnd
              },
              severity
            })
          }
        }
      }
    }

    return foundConflicts
  }, [events, selectedDate])

  if (conflicts.length === 0) {
    return null
  }

  const getEventById = (id: string) => events.find(e => e.id === id)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>⚠️</span>
        <span className={styles.title}>时间冲突提醒</span>
        <span className={styles.badge}>{conflicts.length}</span>
      </div>
      
      <div className={styles.conflictList}>
        {conflicts.map((conflict, index) => {
          const eventA = getEventById(conflict.eventIds[0])
          const eventB = getEventById(conflict.eventIds[1])
          
          if (!eventA || !eventB) return null

          const formatTime = (date: Date) => {
            return date.toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })
          }

          return (
            <div 
              key={index} 
              className={`${styles.conflictItem} ${styles[conflict.severity]}`}
            >
              <div className={styles.conflictTime}>
                {formatTime(conflict.timeRange.start)} - {formatTime(conflict.timeRange.end)}
              </div>
              <div className={styles.conflictEvents}>
                <span className={styles.eventName}>{eventA.title}</span>
                <span className={styles.separator}>与</span>
                <span className={styles.eventName}>{eventB.title}</span>
              </div>
              {conflict.severity === 'high' && (
                <div className={styles.severityLabel}>严重冲突</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function checkConflicts(events: CalendarEvent[], newEvent: CalendarEvent): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []
  
  const newStart = new Date(newEvent.startTime)
  const newEnd = new Date(newEvent.endTime)

  for (const existingEvent of events) {
    if (existingEvent.id === newEvent.id) continue
    
    const existingStart = new Date(existingEvent.startTime)
    const existingEnd = new Date(existingEvent.endTime)

    if (newStart < existingEnd && newEnd > existingStart) {
      const overlapStart = newStart > existingStart ? newStart : existingStart
      const overlapEnd = newEnd < existingEnd ? newEnd : existingEnd
      const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)
      
      let severity: 'high' | 'medium' | 'low' = 'low'
      if (overlapMinutes >= 60) {
        severity = 'high'
      } else if (overlapMinutes >= 30) {
        severity = 'medium'
      }

      conflicts.push({
        eventIds: [existingEvent.id, newEvent.id],
        timeRange: {
          start: overlapStart,
          end: overlapEnd
        },
        severity
      })
    }
  }

  return conflicts
}
