'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import CalendarView from '@/components/calendar/CalendarView'
import VoiceEventCreator from '@/components/voice/VoiceEventCreator'
import InspirationCapture from '@/components/ui/InspirationCapture'
import { useEvents } from '@/lib/hooks/useUnifiedData'
import type { CalendarEvent } from '@/types'
import styles from './AppLayout.module.scss'

type ViewMode = 'calendar' | 'creator' | 'inspiration'

export default function AppLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const { events, loading } = useEvents()

  const today = new Date()
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.startTime)
    return eventDate.toDateString() === today.toDateString()
  })

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.startTime)
    return eventDate > today
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 5)

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const handleEventCreated = (event: any) => {
    setViewMode('calendar')
  }

  return (
    <div className={styles.container}>
      <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.closed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>📅</span>
            <span className={styles.logoText}>智程日历</span>
          </div>
          <button 
            className={styles.toggleBtn}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className={styles.nav}>
          <Link 
            href="/" 
            className={styles.navLink}
          >
            <span className={styles.navIcon}>🏠</span>
            {isSidebarOpen && <span className={styles.navLabel}>首页</span>}
          </Link>
          
          <button 
            className={`${styles.navBtn} ${viewMode === 'calendar' ? styles.active : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <span className={styles.navIcon}>📅</span>
            {isSidebarOpen && <span className={styles.navLabel}>日历视图</span>}
          </button>
          
          <button 
            className={`${styles.navBtn} ${viewMode === 'creator' ? styles.active : ''}`}
            onClick={() => setViewMode('creator')}
          >
            <span className={styles.navIcon}>🎤</span>
            {isSidebarOpen && <span className={styles.navLabel}>语音创建</span>}
          </button>
          
          <button 
            className={`${styles.navBtn} ${viewMode === 'inspiration' ? styles.active : ''}`}
            onClick={() => setViewMode('inspiration')}
          >
            <span className={styles.navIcon}>💡</span>
            {isSidebarOpen && <span className={styles.navLabel}>灵光捕捉</span>}
          </button>
          
          <Link 
            href="/settings" 
            className={styles.navLink}
          >
            <span className={styles.navIcon}>⚙️</span>
            {isSidebarOpen && <span className={styles.navLabel}>设置</span>}
          </Link>
        </nav>

        {isSidebarOpen && (
          <div className={styles.sidebarContent}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>今日日程</div>
              <div className={styles.eventList}>
                {todayEvents.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>✨</span>
                    <span>今日暂无日程</span>
                  </div>
                ) : (
                  todayEvents.map(event => (
                    <div key={event.id} className={styles.eventItem}>
                      <div className={styles.eventTime}>
                        {new Date(event.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={styles.eventTitle}>{event.title}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionTitle}>即将到来</div>
              <div className={styles.eventList}>
                {upcomingEvents.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>📅</span>
                    <span>暂无即将到来的日程</span>
                  </div>
                ) : (
                  upcomingEvents.map(event => (
                    <div key={event.id} className={styles.eventItem}>
                      <div className={styles.eventTime}>
                        {new Date(event.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className={styles.eventTitle}>{event.title}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.privacyBadge}>
                <span className={styles.privacyIcon}>🔒</span>
                <span className={styles.privacyText}>数据本地存储</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>
              {viewMode === 'calendar' && '日历视图'}
              {viewMode === 'creator' && '语音创建日程'}
              {viewMode === 'inspiration' && '灵光捕捉'}
            </h1>
            <p className={styles.subtitle}>
              {viewMode === 'calendar' && '查看和管理您的日程安排'}
              {viewMode === 'creator' && '用自然语言描述您的日程'}
              {viewMode === 'inspiration' && '快速记录您的灵感'}
            </p>
          </div>
          
          <div className={styles.headerRight}>
            <button 
              className={`${styles.quickBtn} ${viewMode !== 'creator' ? styles.highlight : ''}`}
              onClick={() => setViewMode('creator')}
            >
              <span className={styles.btnIcon}>🎤</span>
              语音创建
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {viewMode === 'calendar' && (
            <div className={styles.calendarWrapper}>
              <CalendarView onEventClick={handleEventClick} />
            </div>
          )}
          
          {viewMode === 'creator' && (
            <div className={styles.creatorWrapper}>
              <VoiceEventCreator 
                onEventCreated={handleEventCreated}
                onCancel={() => setViewMode('calendar')}
              />
            </div>
          )}
          
          {viewMode === 'inspiration' && (
            <div className={styles.inspirationWrapper}>
              <InspirationCapture />
            </div>
          )}
        </div>
      </main>

      {selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{selectedEvent.title}</h3>
              <button className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <span className={styles.fieldLabel}>时间</span>
                <span className={styles.fieldValue}>
                  {new Date(selectedEvent.startTime).toLocaleString('zh-CN')} - {new Date(selectedEvent.endTime).toLocaleTimeString('zh-CN')}
                </span>
              </div>
              {selectedEvent.location && (
                <div className={styles.modalField}>
                  <span className={styles.fieldLabel}>地点</span>
                  <span className={styles.fieldValue}>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className={styles.modalField}>
                  <span className={styles.fieldLabel}>描述</span>
                  <span className={styles.fieldValue}>{selectedEvent.description}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
