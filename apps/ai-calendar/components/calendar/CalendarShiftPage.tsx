'use client';

import { useState, useEffect } from 'react';
import { useEvents } from '@/lib/stores';
import { shiftService } from '@/lib/services/shiftService';
import Navbar from '@/components/ui/Navbar';
import CalendarView from '@/components/calendar/CalendarView';
import ShiftManager from '@/components/shift/ShiftManager';
import ShiftNlpPanel from '@/components/shift/ShiftNlpPanel';
import type { CalendarEvent } from '@/types';
import styles from './calendar-shift.module.scss';

export default function CalendarShiftPage() {
  const [view, setView] = useState<'calendar' | 'shift-manager' | 'both'>('both');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { events } = useEvents();

  const shiftEvents = events.filter(e => e.eventType === 'shift');
  const regularEvents = events.filter(e => e.eventType !== 'shift');

  useEffect(() => {
    const syncData = async () => {
      setSyncing(true);
      try {
        await shiftService.syncAllShiftsToCalendar();
      } catch (error) {
        console.error('同步数据失败:', error);
      } finally {
        setSyncing(false);
      }
    };
    syncData();
  }, []);

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      const result = await shiftService.syncAllShiftsToCalendar();
      alert(`同步完成：${result.syncedShifts} 个排班，删除 ${result.deletedEvents} 个过期事件`);
    } catch (error) {
      console.error('同步数据失败:', error);
      alert('同步失败，请重试');
    } finally {
      setSyncing(false);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    console.log('Event clicked:', event);
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>📅 智能日历 + 排班管理</h1>
          
          <div className={styles.viewControls}>
            <button
              className={`${styles.viewBtn} ${view === 'calendar' ? styles.active : ''}`}
              onClick={() => setView('calendar')}
            >
              📆 日历
            </button>
            <button
              className={`${styles.viewBtn} ${view === 'shift-manager' ? styles.active : ''}`}
              onClick={() => setView('shift-manager')}
            >
              🗓️ 排班
            </button>
            <button
              className={`${styles.viewBtn} ${view === 'both' ? styles.active : ''}`}
              onClick={() => setView('both')}
            >
              🔗 双视图
            </button>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.syncBtn}
              onClick={handleSyncData}
              disabled={syncing}
            >
              {syncing ? '🔄 同步中...' : '🔄 同步数据'}
            </button>
            <button
              className={styles.sidebarToggle}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? '☰ 收起' : '☰ 展开'}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {view !== 'shift-manager' && (
          <div className={`${styles.calendarSection} ${view === 'calendar' ? styles.fullWidth : ''}`}>
            <CalendarView onEventClick={handleEventClick} />
          </div>
        )}

        {view !== 'calendar' && sidebarOpen && (
          <div className={`${styles.shiftSection} ${view === 'shift-manager' ? styles.fullWidth : ''}`}>
            <div className={styles.shiftContent}>
              <div className={styles.nlpPanel}>
                <ShiftNlpPanel />
              </div>
              <div className={styles.statsPanel}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📋</div>
                  <div className={styles.statInfo}>
                    <div className={styles.statNumber}>{shiftEvents.length}</div>
                    <div className={styles.statLabel}>排班事件</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📝</div>
                  <div className={styles.statInfo}>
                    <div className={styles.statNumber}>{regularEvents.length}</div>
                    <div className={styles.statLabel}>普通日程</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>📊</div>
                  <div className={styles.statInfo}>
                    <div className={styles.statNumber}>{events.length}</div>
                    <div className={styles.statLabel}>总计</div>
                  </div>
                </div>
              </div>
              <div className={styles.shiftManagerContainer}>
                <ShiftManager />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
