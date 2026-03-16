'use client'

import { useState, useEffect, useRef } from 'react'
import { useEvents, useInspirations } from '@/lib/hooks/useUnifiedData'
import { parseNaturalLanguage } from '@/lib/services/aiParserService'
import { eventService } from '@/lib/services/eventService'
import { inspirationService } from '@/lib/services/inspirationService'
import type { CalendarEvent, Inspiration } from '@/types'
import styles from './BossView.module.scss'

interface BossViewProps {
  onOpenSecretary?: () => void
}

export default function BossView({ onOpenSecretary }: BossViewProps) {
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { events, deleteEvent, updateEvent } = useEvents()
  const { inspirations, addInspiration, deleteInspiration, updateInspiration } = useInspirations()

  const today = new Date()
  const todayEvents = events
    .filter(e => {
      const eventDate = new Date(e.startTime)
      return eventDate.toDateString() === today.toDateString()
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  const unprocessedInspirations = inspirations.filter(i => !i.processed).slice(0, 5)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      await processInput(inputValue.trim())
    }
  }

  const processInput = async (text: string) => {
    setIsProcessing(true)
    setInputValue('')
    
    try {
      const result = await parseNaturalLanguage(text)
      
      if (result.type === 'event' && result.date) {
        const startTime = result.date
        const endTime = result.duration 
          ? new Date(startTime.getTime() + result.duration * 60000)
          : new Date(startTime.getTime() + 60 * 60000)
        
        await eventService.create({
          title: result.title,
          startTime,
          endTime,
          isAllDay: false,
          reminders: [],
          viewMode: 'personal',
          eventType: 'regular',
          description: result.description,
          location: result.location,
        })
      } else if (result.type === 'todo') {
        await inspirationService.create({
          content: text,
          type: 'todo',
          processed: false,
        })
      } else {
        await inspirationService.create({
          content: text,
          type: result.type === 'note' ? 'note' : 'raw',
          processed: false,
        })
      }
    } catch (error) {
      console.error('处理输入失败:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId)
    } catch (error) {
      console.error('删除事件失败:', error)
    }
  }

  const handleDeleteInspiration = async (inspirationId: string) => {
    try {
      await deleteInspiration(inspirationId)
    } catch (error) {
      console.error('删除灵感失败:', error)
    }
  }

  const handleProcessInspiration = async (inspirationId: string) => {
    try {
      await updateInspiration(inspirationId, { processed: true, processedAt: new Date() })
    } catch (error) {
      console.error('处理灵感失败:', error)
    }
  }

  const formatEventTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <section className={styles.container}>
      <div className={styles.canvas}>
        <input
          ref={inputRef}
          type="text"
          className={styles.canvasInput}
          placeholder="在这里输入明天的会议，或是突发的灵感..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isProcessing}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className={styles.main}>
        <div className={styles.timeline}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionTitle}>Today / 执行线</p>
            <span className={styles.count}>{todayEvents.length}</span>
          </div>
          
          <div className={styles.eventList}>
            {todayEvents.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>✨</span>
                <span>今日暂无日程</span>
              </div>
            ) : (
              todayEvents.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  formatTime={formatEventTime}
                  onDelete={handleDeleteEvent}
                />
              ))
            )}
          </div>
        </div>

        <div className={styles.ideas}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionTitle}>Ideas / 灵感胶囊</p>
            <span className={styles.count}>{unprocessedInspirations.length}</span>
          </div>
          
          <div className={styles.ideaList}>
            {unprocessedInspirations.length === 0 ? (
              <div className={styles.emptyIdea}>
                按 <kbd>Cmd</kbd> + <kbd>K</kbd> 快速捕捉灵感
              </div>
            ) : (
              unprocessedInspirations.map(inspiration => (
                <div key={inspiration.id} className={styles.ideaCapsule}>
                  <span className={styles.ideaContent}>{inspiration.content}</span>
                  <div className={styles.ideaActions}>
                    <button 
                      className={styles.ideaBtn}
                      onClick={() => handleProcessInspiration(inspiration.id)}
                      title="标记为已处理"
                    >
                      ✓
                    </button>
                    <button 
                      className={styles.ideaBtn}
                      onClick={() => handleDeleteInspiration(inspiration.id)}
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.hint}>
        Press <kbd>Cmd</kbd> + <kbd>K</kbd> to capture anywhere
      </div>
    </section>
  )
}

function EventCard({ 
  event, 
  formatTime,
  onDelete 
}: { 
  event: CalendarEvent
  formatTime: (d: Date) => string
  onDelete: (id: string) => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div 
      className={styles.eventCard}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <span className={styles.eventTime}>{formatTime(new Date(event.startTime))}</span>
      <div className={styles.eventIndicator} style={{ backgroundColor: event.color || '#3B82F6' }} />
      <span className={styles.eventTitle}>{event.title}</span>
      {event.location && <span className={styles.eventLocation}>📍 {event.location}</span>}
      {showActions && (
        <button 
          className={styles.deleteBtn}
          onClick={() => onDelete(event.id)}
          title="删除"
        >
          ×
        </button>
      )}
    </div>
  )
}
