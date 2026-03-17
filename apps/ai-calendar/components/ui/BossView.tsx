'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTodayEvents, usePendingIdeas, useAIStatus } from '@/lib/hooks/useUnifiedItems';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import styles from './BossView.module.scss';

interface BossViewProps {
  onOpenSecretary?: () => void;
}

export default function BossView({ onOpenSecretary }: BossViewProps) {
  const [inputValue, setInputValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { items: todayEvents, update: updateEvent, remove: deleteEvent } = useTodayEvents();
  const { items: pendingIdeas, createIdea, remove: deleteIdea, toEvent } = usePendingIdeas();
  const convertToEvent = useUnifiedStore((state) => state.convertToEvent);
  const aiStatus = useAIStatus();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (error) setError(null);
  }, [error]);

  const handleCreateIdea = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isCreating) return;

    setIsCreating(true);
    setError(null);
    
    try {
      await createIdea(content);
      setInputValue('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('创建灵感失败:', err);
      setError('创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  }, [inputValue, isCreating, createIdea]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateIdea();
    }
  }, [handleCreateIdea]);

  const handleProcessIdea = useCallback(async (ideaId: string) => {
    try {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      await toEvent(ideaId, now, now + oneHour);
    } catch (err) {
      console.error('转换灵感失败:', err);
    }
  }, [toEvent]);

  const handleDeleteIdea = useCallback(async (ideaId: string) => {
    try {
      await deleteIdea(ideaId);
    } catch (err) {
      console.error('删除灵感失败:', err);
    }
  }, [deleteIdea]);

  const handleCompleteEvent = useCallback(async (eventId: string) => {
    try {
      await updateEvent(eventId, { status: 'completed' });
    } catch (err) {
      console.error('完成事件失败:', err);
    }
  }, [updateEvent]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await deleteEvent(eventId);
    } catch (err) {
      console.error('删除事件失败:', err);
    }
  }, [deleteEvent]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      {!aiStatus.isReady && (
        <div className={styles.aiStatusBar}>
          {aiStatus.isLoading ? (
            <span className={styles.aiLoading}>🔄 AI 引擎加载中...</span>
          ) : aiStatus.error ? (
            <span className={styles.aiError}>⚠️ {aiStatus.error}</span>
          ) : null}
        </div>
      )}
      
      <div className={styles.canvas}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder="在这里输入明天的会议，或是突发的灵感..."
          className={styles.canvasInput}
          autoComplete="off"
          spellCheck={false}
          disabled={isCreating}
        />
        {error && <div className={styles.error}>{error}</div>}
      </div>

      <div className={styles.main}>
        <div className={styles.timeline}>
          <p className={styles.sectionTitle}>Today / 执行线</p>
          
          <div className={styles.eventList}>
            {todayEvents.length === 0 ? (
              <div className={styles.emptyState}>暂无日程</div>
            ) : (
              todayEvents.map((event) => (
                <div 
                  key={event.id} 
                  className={styles.eventCard}
                  onClick={() => handleCompleteEvent(event.id)}
                >
                  <span className={styles.eventTime}>
                    {formatTime(event.startTime || 0)}
                  </span>
                  <div className={styles.eventIndicator} />
                  <span className={styles.eventTitle}>{event.title}</span>
                  <div className={styles.eventCheckbox}>
                    <div className={styles.checkboxInner} />
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event.id);
                    }}
                    aria-label="删除事件"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.ideas}>
          <p className={styles.sectionTitle}>Ideas / 灵感胶囊</p>
          
          <div className={styles.ideaList}>
            {pendingIdeas.length === 0 ? (
              <div className={styles.emptyIdea}>
                按 <kbd>Cmd</kbd> + <kbd>K</kbd> 快速捕捉
              </div>
            ) : (
              pendingIdeas.map((idea) => (
                <div key={idea.id} className={styles.ideaCapsule}>
                  <div className={styles.ideaContent}>{idea.title}</div>
                  <div className={styles.ideaActions}>
                    <button
                      className={styles.ideaBtn}
                      onClick={() => handleProcessIdea(idea.id)}
                      aria-label="转换为日程"
                      title="转换为日程"
                    >
                      ✓
                    </button>
                    <button
                      className={styles.ideaBtn}
                      onClick={() => handleDeleteIdea(idea.id)}
                      aria-label="删除灵感"
                      title="删除灵感"
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
    </div>
  );
}
