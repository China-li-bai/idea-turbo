'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTodayEvents, usePendingIdeas, useAIStatus } from '@/lib/hooks/useUnifiedItems';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import { useLocale } from '@/lib/contexts/ClientProviders';
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
  const { t, locale } = useLocale();

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
      console.error('Failed to create idea:', err);
      setError(t('boss.createFailed'));
    } finally {
      setIsCreating(false);
    }
  }, [inputValue, isCreating, createIdea, t]);

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
      console.error('Failed to convert idea:', err);
    }
  }, [toEvent]);

  const handleDeleteIdea = useCallback(async (ideaId: string) => {
    try {
      await deleteIdea(ideaId);
    } catch (err) {
      console.error('Failed to delete idea:', err);
    }
  }, [deleteIdea]);

  const handleCompleteEvent = useCallback(async (eventId: string) => {
    try {
      await updateEvent(eventId, { status: 'completed' });
    } catch (err) {
      console.error('Failed to complete event:', err);
    }
  }, [updateEvent]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await deleteEvent(eventId);
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  }, [deleteEvent]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.container}>
      {!aiStatus.isReady && (
        <div className={styles.aiStatusBar}>
          {aiStatus.isLoading ? (
            <span className={styles.aiLoading}>🔄 {t('boss.aiLoading')}</span>
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
          placeholder={t('boss.inputPlaceholder')}
          className={styles.canvasInput}
          autoComplete="off"
          spellCheck={false}
          disabled={isCreating}
        />
        {error && <div className={styles.error}>{error}</div>}
      </div>

      <div className={styles.main}>
        <div className={styles.timeline}>
          <p className={styles.sectionTitle}>{t('boss.todayTitle')}</p>
          
          <div className={styles.eventList}>
            {todayEvents.length === 0 ? (
              <div className={styles.emptyState}>{t('boss.noEvents')}</div>
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
                    aria-label={t('boss.deleteEvent')}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.ideas}>
          <p className={styles.sectionTitle}>{t('boss.ideasTitle')}</p>
          
          <div className={styles.ideaList}>
            {pendingIdeas.length === 0 ? (
              <div className={styles.emptyIdea}>
                {t('boss.quickCapture')}
              </div>
            ) : (
              pendingIdeas.map((idea) => (
                <div key={idea.id} className={styles.ideaCapsule}>
                  <div className={styles.ideaContent}>{idea.title}</div>
                  <div className={styles.ideaActions}>
                    <button
                      className={styles.ideaBtn}
                      onClick={() => handleProcessIdea(idea.id)}
                      aria-label={t('boss.convertToEvent')}
                      title={t('boss.convertToEvent')}
                    >
                      ✓
                    </button>
                    <button
                      className={styles.ideaBtn}
                      onClick={() => handleDeleteIdea(idea.id)}
                      aria-label={t('boss.deleteIdea')}
                      title={t('boss.deleteIdea')}
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
