'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUnifiedItems, useAIStatus } from '@/lib/hooks/useUnifiedItems';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import { smartScheduler } from '@/lib/services/smartScheduler';
import { useLocale } from '@/lib/contexts/ClientProviders';
import styles from './SecretaryView.module.scss';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposal?: {
    title: string;
    time: string;
    location: string;
    itemId: string;
  };
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function SecretaryView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { items: allItems, toEvent } = useUnifiedItems();
  const aiStatus = useAIStatus();
  const { t, locale } = useLocale();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing) return;
    
    const userMessage: Message = {
      id: generateUUID(),
      role: 'user',
      content: inputValue.trim(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    try {
      let assistantResponse = '';
      let proposal: Message['proposal'] | undefined;
      
      if (oramaSearchService.isInitialized) {
        const searchResults = await oramaSearchService.hybridSearch(userMessage.content, {
          k: 5,
          useHybrid: true
        });
        
        console.log('Orama search results:', searchResults);
        
        if (searchResults.length === 0) {
          assistantResponse = t('secretary.noResults');
        } else {
          assistantResponse = t('secretary.foundItems').replace('{count}', String(searchResults.length)) + '\n\n';
          
          searchResults.slice(0, 3).forEach((result, index) => {
            const title = result.title || t('secretary.unknownTitle');
            const type = result.type || 'idea';
            assistantResponse += `${index + 1}. **${title}** (${type === 'idea' ? t('secretary.idea') : t('secretary.event')})\n`;
            if (type === 'event') {
              const item = allItems.find(i => i.id === result.id);
              if (item?.startTime) {
                const date = new Date(item.startTime);
                assistantResponse += `   ${t('secretary.time')}：${date.toLocaleString(locale)}\n`;
              }
            }
            if (result.metadata?.location) {
              assistantResponse += `   ${t('secretary.location')}：${result.metadata.location}\n`;
            }
          });
          
          const firstResult = searchResults[0];
          if (firstResult.type === 'event') {
            const item = allItems.find(i => i.id === firstResult.id);
            if (item?.startTime) {
              proposal = {
                title: firstResult.title || item.title,
                time: new Date(item.startTime).toLocaleString(locale, { 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                location: firstResult.metadata?.location || '',
                itemId: firstResult.id
              };
            }
          } else if (firstResult.type === 'idea') {
            const item = allItems.find(i => i.id === firstResult.id);
            if (item) {
              const suggestion = smartScheduler.findBestTimeSlot(
                60,
                {
                  preferredDate: item.metadata.extractedDate,
                  preferredTime: item.metadata.extractedTime,
                  avoidWeekends: true
                },
                allItems
              );
              
              proposal = {
                title: firstResult.title || item.title,
                time: suggestion.suggestedStart.toLocaleString(locale, { 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                location: item.metadata.extractedLocation || '',
                itemId: firstResult.id
              };
              
              if (suggestion.conflicts.length > 0) {
                assistantResponse += `\n\n⚠️ ${locale.startsWith('zh') ? '注意：检测到时间冲突，已为您调整到最近的空闲时间。' : 'Note: Time conflict detected, adjusted to nearest available slot.'}`;
              }
              
              if (suggestion.alternatives.length > 0) {
                assistantResponse += `\n\n${t('secretary.proposalTime')}：`;
                suggestion.alternatives.slice(0, 2).forEach((alt, i) => {
                  assistantResponse += `\n${i + 1}. ${alt.start.toLocaleString(locale, { 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}`;
                });
              }
            }
          }
        }
      } else {
        const lowerQuery = userMessage.content.toLowerCase();
        const relevantItems = allItems.filter(item => {
          const titleMatch = item.title.toLowerCase().includes(lowerQuery);
          const contentMatch = item.content.toLowerCase().includes(lowerQuery);
          const tagMatch = item.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
          return titleMatch || contentMatch || tagMatch;
        });
        
        if (relevantItems.length === 0) {
          assistantResponse = t('secretary.noResults');
        } else {
          assistantResponse = t('secretary.foundItems').replace('{count}', String(relevantItems.length)) + ` (${locale.startsWith('zh') ? '本地搜索' : 'local search'})\n\n`;
          
          relevantItems.slice(0, 3).forEach((item, index) => {
            assistantResponse += `${index + 1}. **${item.title}** (${item.type === 'idea' ? t('secretary.idea') : t('secretary.event')})\n`;
            if (item.type === 'event' && item.startTime) {
              const date = new Date(item.startTime);
              assistantResponse += `   ${t('secretary.time')}：${date.toLocaleString(locale)}\n`;
            }
          });
        }
      }
      
      const assistantMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        content: assistantResponse,
        proposal
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Search failed:', error);
      
      const errorMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        content: locale.startsWith('zh') ? '抱歉，搜索时出现了错误。请稍后再试。' : 'Sorry, an error occurred during search. Please try again later.',
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, allItems, t, locale]);

  const handleApprove = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.proposal) return;
    
    const item = allItems.find(i => i.id === message.proposal?.itemId);
    if (!item) return;
    
    if (item.type === 'idea') {
      const suggestion = smartScheduler.findBestTimeSlot(
        60,
        {
          preferredDate: item.metadata.extractedDate,
          preferredTime: item.metadata.extractedTime,
          avoidWeekends: true
        },
        allItems
      );
      
      await toEvent(
        item.id, 
        suggestion.suggestedStart.getTime(), 
        suggestion.suggestedEnd.getTime()
      );
    }
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.proposal) {
        return {
          ...msg,
          content: msg.content + `\n\n✅ ${locale.startsWith('zh') ? '已批准此安排' : 'Approved'}`,
          proposal: undefined
        };
      }
      return msg;
    }));
  }, [messages, allItems, toEvent, locale]);

  return (
    <div className={styles.container}>
      {!aiStatus.isReady && (
        <div className={styles.statusBar}>
          {aiStatus.isLoading ? (
            <span className={styles.loading}>🔄 {t('boss.aiLoading')}</span>
          ) : aiStatus.error ? (
            <span className={styles.error}>⚠️ {aiStatus.error}</span>
          ) : null}
        </div>
      )}
      
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>🤖</div>
            <h2 className={styles.welcomeTitle}>
              {locale.startsWith('zh') ? '欢迎使用 AI 秘书' : locale === 'ja-JP' ? 'AI 秘書へようこそ' : 'Welcome to AI Secretary'}
            </h2>
            <p className={styles.welcomeText}>
              {locale.startsWith('zh') ? '您可以问我关于日程的任何问题，例如：' : locale === 'ja-JP' ? 'スケジュールについて何でも聞いてください：' : 'Ask me anything about your schedule, for example:'}
            </p>
            <ul className={styles.examples}>
              <li>{locale.startsWith('zh') ? '"我明天有什么安排？"' : locale === 'ja-JP' ? '"明日の予定は？"' : '"What\'s my schedule tomorrow?"'}</li>
              <li>{locale.startsWith('zh') ? '"帮我找一下关于项目的想法"' : locale === 'ja-JP' ? '"プロジェクトについてのアイデアを探して"' : '"Find my project ideas"'}</li>
              <li>{locale.startsWith('zh') ? '"我之前是不是有个关于读书的想法？"' : locale === 'ja-JP' ? '"読書についてのアイデアがあったっけ？"' : '"Did I have an idea about reading?"'}</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageWrapper} ${
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              {message.role === 'user' ? (
                <div className={styles.userBubble}>
                  <p>{message.content}</p>
                </div>
              ) : (
                <div className={styles.assistantBubble}>
                  {message.proposal ? (
                    <div className={styles.proposalCard}>
                      <div className={styles.proposalHeader}>
                        <div className={styles.statusDot} />
                        <span>{t('secretary.proposalTitle')}</span>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                      <div className={styles.proposalDetails}>
                        <p className={styles.detailLabel}>{t('secretary.time')}</p>
                        <p className={styles.detailValue}>{message.proposal.time}</p>
                        <p>📍 {message.proposal.location || (locale.startsWith('zh') ? '待定' : 'TBD')}</p>
                      </div>
                      <div className={styles.proposalActions}>
                        <button 
                          className={styles.approveBtn}
                          onClick={() => handleApprove(message.id)}
                        >
                          {t('secretary.confirmSchedule')}
                        </button>
                        <button className={styles.editBtn}>{t('secretary.cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSendMessage} className={styles.inputWrapper}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('secretary.inputPlaceholder')}
            className={styles.input}
            disabled={isProcessing}
          />
          <button type="submit" className={styles.sendBtn} disabled={isProcessing || !inputValue.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
