'use client';

import { useState, useRef } from 'react';
import { useTodayEvents, usePendingIdeas } from '@/lib/hooks/useUnifiedItems';
import styles from './BossView.module.scss';

interface BossViewProps {
  onOpenSecretary?: () => void;
}

export default function BossView({ onOpenSecretary }: BossViewProps) {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { items: todayEvents, remove: deleteEvent, update: updateEvent } = useTodayEvents();
  const { items: pendingIdeas, createIdea, remove: deleteIdea, toEvent } = usePendingIdeas();

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    setIsProcessing(true);
    
    try {
      await createIdea(inputValue.trim());
      setInputValue('');
    } catch (error) {
      console.error('创建灵感失败:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
    } catch (error) {
      console.error('删除事件失败:', error);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    try {
      await deleteIdea(ideaId);
    } catch (error) {
      console.error('删除灵感失败:', error);
    }
  };

  const handleProcessIdea = async (ideaId: string) => {
    try {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      await toEvent(ideaId, now, now + oneHour);
    } catch (error) {
      console.error('转换灵感失败:', error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <form onSubmit={handleInputSubmit} className={styles.inputForm}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="捕捉灵感..."
            className={styles.input}
            disabled={isProcessing}
          />
          <button type="submit" className={styles.submitBtn} disabled={isProcessing || !inputValue.trim()}>
            {isProcessing ? '处理中...' : '捕捉'}
          </button>
        </form>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.timelineSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>今日日程</h2>
            <span className={styles.count}>{todayEvents.length}</span>
          </div>
          
          <div className={styles.timeline}>
            {todayEvents.length === 0 ? (
              <div className={styles.emptyState}>暂无日程</div>
            ) : (
              todayEvents.map((event) => (
                <div key={event.id} className={styles.eventCard}>
                  <div className={styles.eventTime}>
                    {formatTime(event.startTime || 0)}
                  </div>
                  <div className={styles.eventContent}>
                    <div className={styles.eventTitle}>{event.title}</div>
                    {event.metadata.location && (
                      <div className={styles.eventLocation}>{event.metadata.location}</div>
                    )}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteEvent(event.id)}
                    aria-label="删除事件"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.ideasSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>灵感胶囊</h2>
            <span className={styles.count}>{pendingIdeas.length}</span>
          </div>
          
          <div className={styles.ideasList}>
            {pendingIdeas.length === 0 ? (
              <div className={styles.emptyState}>暂无灵感</div>
            ) : (
              pendingIdeas.map((idea) => (
                <div key={idea.id} className={styles.ideaCapsule}>
                  <div className={styles.ideaContent}>{idea.title}</div>
                  <div className={styles.ideaActions}>
                    <button
                      className={styles.ideaBtn}
                      onClick={() => handleProcessIdea(idea.id)}
                      aria-label="转换为日程"
                    >
                      ✓
                    </button>
                    <button
                      className={styles.ideaBtn}
                      onClick={() => handleDeleteIdea(idea.id)}
                      aria-label="删除灵感"
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

      {onOpenSecretary && (
        <button className={styles.switchBtn} onClick={onOpenSecretary}>
          切换到秘书视图
        </button>
      )}
    </div>
  );
}
