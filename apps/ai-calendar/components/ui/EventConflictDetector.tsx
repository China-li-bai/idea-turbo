'use client'

import { useMemo } from 'react'
import type { UnifiedCalendarItem } from '@/types/unified'
import styles from './eventConflictDetector.module.scss'

export interface ConflictInfo {
  itemIds: string[]
  timeRange: {
    start: number
    end: number
  }
  severity: 'high' | 'medium' | 'low'
}

interface EventConflictDetectorProps {
  events: UnifiedCalendarItem[]
  selectedDate?: Date
}

export default function EventConflictDetector({ events, selectedDate }: EventConflictDetectorProps) {
  const conflicts = useMemo(() => {
    if (!selectedDate) return []
    
    const dayStart = new Date(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(selectedDate)
    dayEnd.setHours(23, 59, 59, 999)
    const dayStartMs = dayStart.getTime()
    const dayEndMs = dayEnd.getTime()

    const dayEvents = events.filter(event => {
      const eventStart = event.startTime || 0
      const eventEnd = event.endTime || 0
      return (eventStart >= dayStartMs && eventStart <= dayEndMs) ||
             (eventEnd >= dayStartMs && eventEnd <= dayEndMs) ||
             (eventStart <= dayStartMs && eventEnd >= dayEndMs)
    }).sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

    const foundConflicts: ConflictInfo[] = []

    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const eventA = dayEvents[i]
        const eventB = dayEvents[j]
        
        const startA = eventA.startTime || 0
        const endA = eventA.endTime || 0
        const startB = eventB.startTime || 0
        const endB = eventB.endTime || 0

        if (startB < endA) {
          const overlapStart = startB
          const overlapEnd = endA < endB ? endA : endB
          const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60)
          
          let severity: 'high' | 'medium' | 'low' = 'low'
          if (overlapMinutes >= 60) {
            severity = 'high'
          } else if (overlapMinutes >= 30) {
            severity = 'medium'
          }

          const existingConflict = foundConflicts.find(
            c => c.itemIds.includes(eventA.id) && c.itemIds.includes(eventB.id)
          )

          if (!existingConflict) {
            foundConflicts.push({
              itemIds: [eventA.id, eventB.id],
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

  const getItemById = (id: string) => events.find(e => e.id === id)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>⚠️</span>
        <span className={styles.title}>时间冲突提醒</span>
        <span className={styles.badge}>{conflicts.length}</span>
      </div>
      
      <div className={styles.conflictList}>
        {conflicts.map((conflict, index) => {
          const eventA = getItemById(conflict.itemIds[0])
          const eventB = getItemById(conflict.itemIds[1])
          
          if (!eventA || !eventB) return null

          const formatTime = (ts: number) => {
            return new Date(ts).toLocaleTimeString('zh-CN', { 
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

export function checkConflicts(events: UnifiedCalendarItem[], newEvent: UnifiedCalendarItem): ConflictInfo[] {
  const conflicts: ConflictInfo[] = []
  
  const newStart = newEvent.startTime || 0
  const newEnd = newEvent.endTime || 0

  for (const existingEvent of events) {
    if (existingEvent.id === newEvent.id) continue
    
    const existingStart = existingEvent.startTime || 0
    const existingEnd = existingEvent.endTime || 0

    if (newStart < existingEnd && newEnd > existingStart) {
      const overlapStart = newStart > existingStart ? newStart : existingStart
      const overlapEnd = newEnd < existingEnd ? newEnd : existingEnd
      const overlapMinutes = (overlapEnd - overlapStart) / (1000 * 60)
      
      let severity: 'high' | 'medium' | 'low' = 'low'
      if (overlapMinutes >= 60) {
        severity = 'high'
      } else if (overlapMinutes >= 30) {
        severity = 'medium'
      }

      conflicts.push({
        itemIds: [existingEvent.id, newEvent.id],
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
