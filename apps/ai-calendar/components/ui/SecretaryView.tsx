'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUnifiedItems, useAIStatus } from '@/lib/hooks/useUnifiedItems';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import { smartScheduler } from '@/lib/services/smartScheduler';
import { secretaryAIService, type ActionPlan, type ScheduledAction } from '@/lib/services/secretaryAIService';
import { useLocale } from '@/lib/contexts/ClientProviders';
import styles from './SecretaryView.module.scss';

interface ProposalAction {
  type: 'reschedule' | 'create' | 'cancel';
  targetId: string;
  targetTitle: string;
  params: Record<string, unknown>;
  beforePreview?: string;
  afterPreview?: string;
}

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
  actions?: ProposalAction[];
  isStreaming?: boolean;
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

function isComplexQuery(query: string): boolean {
  const complexPatterns = [
    /推迟|改到|移动|调整|取消|删除/,
    /有空吗|空闲|时间/,
    /顺便|同时|然后/,
    /周五|周[一二三四五六日]|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
    /明天|后天|下周|tomorrow|next week/i,
  ];
  
  return complexPatterns.some(pattern => pattern.test(query));
}

export default function SecretaryView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { items: allItems, toEvent } = useUnifiedItems();
  const updateItem = useUnifiedStore((state) => state.updateItem);
  const deleteItem = useUnifiedStore((state) => state.deleteItem);
  const aiStatus = useAIStatus();
  const { t, locale } = useLocale();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeAction = useCallback(async (
    action: ProposalAction
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const item = allItems.find(i => i.id === action.targetId);
      
      if (!item) {
        return { success: false, error: locale.startsWith('zh') ? '找不到目标日程' : 'Target event not found' };
      }

      switch (action.type) {
        case 'reschedule': {
          const newDate = action.params.resolvedNewDate 
            ? new Date(action.params.resolvedNewDate as string)
            : new Date();
          
          const currentStart = item.startTime ? new Date(item.startTime) : new Date();
          const duration = item.endTime && item.startTime 
            ? item.endTime - item.startTime 
            : 60 * 60 * 1000;
          
          const newStartTime = new Date(newDate);
          newStartTime.setHours(currentStart.getHours(), currentStart.getMinutes(), 0, 0);
          const newEndTime = new Date(newStartTime.getTime() + duration);
          
          await updateItem(item.id, {
            startTime: newStartTime.getTime(),
            endTime: newEndTime.getTime()
          });
          
          return { success: true };
        }
        
        case 'cancel': {
          await updateItem(item.id, { status: 'cancelled' });
          return { success: true };
        }
        
        default:
          return { success: false, error: locale.startsWith('zh') ? '未知操作类型' : 'Unknown action type' };
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }, [allItems, updateItem, locale]);

  const processWithAI = useCallback(async (
    userMessage: string
  ): Promise<{ content: string; proposal?: Message['proposal']; actions?: ProposalAction[] }> => {
    const context = {
      items: allItems,
      locale,
      currentDate: new Date()
    };

    const plan = await secretaryAIService.classifyIntent(userMessage, context);
    
    console.log('AI Action Plan:', plan);

    if (plan.type === 'search' || plan.confidence < 0.7) {
      const { results, summary } = await secretaryAIService.executeSearch(userMessage, context);
      
      let proposal: Message['proposal'] | undefined;
      if (results.length > 0 && results[0].type === 'idea') {
        const item = results[0];
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
          title: item.title,
          time: suggestion.suggestedStart.toLocaleString(locale, { 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          location: item.metadata.extractedLocation || '',
          itemId: item.id
        };
      }
      
      return { content: summary, proposal };
    }

    if (plan.type === 'find_free_time') {
      const freeTimeAction = plan.actions.find(a => a.type === 'find_free_time');
      if (freeTimeAction) {
        const { slots, summary } = await secretaryAIService.findFreeTime(
          freeTimeAction.params as { resolvedTargetDate?: string; resolvedTimeRange?: { start: number; end: number } },
          context
        );
        return { content: summary };
      }
    }

    if (plan.type === 'reschedule' || plan.type === 'batch_actions') {
      const rescheduleAction = plan.actions.find(a => a.type === 'reschedule');
      const freeTimeAction = plan.actions.find(a => a.type === 'find_free_time');
      
      let content = plan.explanation + '\n\n';
      const actions: ProposalAction[] = [];
      
      if (rescheduleAction) {
        const targetEvent = await secretaryAIService.findTargetEvent(
          rescheduleAction.targetTitle,
          rescheduleAction.params.targetDate as string,
          context
        );
        
        if (targetEvent) {
          const newDate = rescheduleAction.params.resolvedNewDate 
            ? new Date(rescheduleAction.params.resolvedNewDate as string)
            : new Date();
          
          const currentStart = targetEvent.startTime 
            ? new Date(targetEvent.startTime) 
            : new Date();
          
          actions.push({
            type: 'reschedule',
            targetId: targetEvent.id,
            targetTitle: targetEvent.title,
            params: rescheduleAction.params,
            beforePreview: `${currentStart.toLocaleDateString(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            afterPreview: `${newDate.toLocaleDateString(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
          });
          
          content += `📅 **${targetEvent.title}**\n`;
          content += `从: ${actions[0].beforePreview}\n`;
          content += `到: ${actions[0].afterPreview}\n\n`;
        } else {
          content += `⚠️ ${locale.startsWith('zh') ? '未找到匹配的日程' : 'No matching event found'}\n\n`;
        }
      }
      
      if (freeTimeAction) {
        const { slots, summary } = await secretaryAIService.findFreeTime(
          freeTimeAction.params as { resolvedTargetDate?: string; resolvedTimeRange?: { start: number; end: number } },
          context
        );
        content += summary;
      }
      
      if (actions.length > 0) {
        return { content, actions };
      }
      
      return { content };
    }

    return { content: plan.explanation };
  }, [allItems, locale]);

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
    
    const streamingMessage: Message = {
      id: generateUUID(),
      role: 'assistant',
      content: '',
      isStreaming: true
    };
    
    setMessages((prev) => [...prev, streamingMessage]);
    
    try {
      let result: { content: string; proposal?: Message['proposal']; actions?: ProposalAction[] };
      
      const shouldUseAI = isComplexQuery(userMessage.content);
      
      if (shouldUseAI) {
        result = await processWithAI(userMessage.content);
      } else {
        result = await processSimpleQuery(userMessage.content);
      }
      
      setMessages((prev) => prev.map(msg => 
        msg.id === streamingMessage.id 
          ? { ...msg, content: result.content, proposal: result.proposal, actions: result.actions, isStreaming: false }
          : msg
      ));
    } catch (error) {
      console.error('Failed to process message:', error);
      
      setMessages((prev) => prev.map(msg => 
        msg.id === streamingMessage.id 
          ? { 
              ...msg, 
              content: locale.startsWith('zh') 
                ? '抱歉，处理时出现了错误。请稍后再试。' 
                : 'Sorry, an error occurred. Please try again.',
              isStreaming: false 
            }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, processWithAI, locale]);

  const processSimpleQuery = useCallback(async (
    query: string
  ): Promise<{ content: string; proposal?: Message['proposal'] }> => {
    const context = {
      items: allItems,
      locale,
      currentDate: new Date()
    };

    if (oramaSearchService.isInitialized) {
      const searchResults = await oramaSearchService.hybridSearch(query, { k: 5 });
      
      if (searchResults.length === 0) {
        return { content: t('secretary.noResults') };
      }
      
      let content = t('secretary.foundItems').replace('{count}', String(searchResults.length)) + '\n\n';
      
      searchResults.slice(0, 3).forEach((result, index) => {
        const title = result.title || t('secretary.unknownTitle');
        const type = result.type || 'idea';
        content += `${index + 1}. **${title}** (${type === 'idea' ? t('secretary.idea') : t('secretary.event')})\n`;
        
        if (type === 'event') {
          const item = allItems.find(i => i.id === result.id);
          if (item?.startTime) {
            const date = new Date(item.startTime);
            content += `   ${t('secretary.time')}：${date.toLocaleString(locale)}\n`;
          }
        }
        if (result.metadata?.location) {
          content += `   ${t('secretary.location')}：${result.metadata.location}\n`;
        }
      });
      
      const firstResult = searchResults[0];
      if (firstResult.type === 'idea') {
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
          
          return {
            content,
            proposal: {
              title: firstResult.title || item.title,
              time: suggestion.suggestedStart.toLocaleString(locale, { 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              location: item.metadata.extractedLocation || '',
              itemId: firstResult.id
            }
          };
        }
      }
      
      return { content };
    }
    
    const lowerQuery = query.toLowerCase();
    const relevantItems = allItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);
      const contentMatch = item.content?.toLowerCase().includes(lowerQuery);
      const tagMatch = item.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      return titleMatch || contentMatch || tagMatch;
    });
    
    if (relevantItems.length === 0) {
      return { content: t('secretary.noResults') };
    }
    
    let content = t('secretary.foundItems').replace('{count}', String(relevantItems.length)) + ` (${locale.startsWith('zh') ? '本地搜索' : 'local search'})\n\n`;
    
    relevantItems.slice(0, 3).forEach((item, index) => {
      content += `${index + 1}. **${item.title}** (${item.type === 'idea' ? t('secretary.idea') : t('secretary.event')})\n`;
      if (item.type === 'event' && item.startTime) {
        const date = new Date(item.startTime);
        content += `   ${t('secretary.time')}：${date.toLocaleString(locale)}\n`;
      }
    });
    
    return { content };
  }, [allItems, locale, t]);

  const handleApprove = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    if (message.actions && message.actions.length > 0) {
      const results = await Promise.all(
        message.actions.map(action => executeAction(action))
      );
      
      const allSuccess = results.every(r => r.success);
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            content: msg.content + `\n\n${allSuccess ? '✅' : '❌'} ${locale.startsWith('zh') ? '操作已完成' : 'Action completed'}`,
            actions: undefined
          };
        }
        return msg;
      }));
      return;
    }
    
    if (!message.proposal) return;
    
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
  }, [messages, allItems, toEvent, executeAction, locale]);

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
              <li>{locale.startsWith('zh') ? '"把明天的会议推迟到周五"' : '"Move tomorrow\'s meeting to Friday"'}</li>
              <li>{locale.startsWith('zh') ? '"周五下午有空吗？"' : '"Am I free on Friday afternoon?"'}</li>
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
                  ) : message.actions && message.actions.length > 0 ? (
                    <div className={styles.proposalCard}>
                      <div className={styles.proposalHeader}>
                        <div className={styles.statusDot} />
                        <span>{locale.startsWith('zh') ? '操作确认' : 'Action Confirmation'}</span>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                      <div className={styles.proposalActions}>
                        <button 
                          className={styles.approveBtn}
                          onClick={() => handleApprove(message.id)}
                        >
                          {locale.startsWith('zh') ? '确认执行' : 'Confirm'}
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
