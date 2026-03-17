'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUnifiedItems, useAIStatus } from '@/lib/hooks/useUnifiedItems';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import { smartScheduler } from '@/lib/services/smartScheduler';
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
          assistantResponse = '抱歉，我没有找到相关的信息。您可以尝试用不同的关键词搜索。';
        } else {
          assistantResponse = `我找到了 ${searchResults.length} 个相关项目：\n\n`;
          
          searchResults.slice(0, 3).forEach((result, index) => {
            const title = result.title || '未知标题';
            const type = result.type || 'idea';
            assistantResponse += `${index + 1}. **${title}** (${type === 'idea' ? '灵感' : '日程'})\n`;
            if (type === 'event') {
              const item = allItems.find(i => i.id === result.id);
              if (item?.startTime) {
                const date = new Date(item.startTime);
                assistantResponse += `   时间：${date.toLocaleString('zh-CN')}\n`;
              }
            }
            if (result.metadata?.location) {
              assistantResponse += `   地点：${result.metadata.location}\n`;
            }
          });
          
          const firstResult = searchResults[0];
          if (firstResult.type === 'event') {
            const item = allItems.find(i => i.id === firstResult.id);
            if (item?.startTime) {
              proposal = {
                title: firstResult.title || item.title,
                time: new Date(item.startTime).toLocaleString('zh-CN', { 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                location: firstResult.metadata?.location || '原定会议室',
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
                time: suggestion.suggestedStart.toLocaleString('zh-CN', { 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                location: item.metadata.extractedLocation || '待定',
                itemId: firstResult.id
              };
              
              if (suggestion.conflicts.length > 0) {
                assistantResponse += `\n\n⚠️ 注意：检测到时间冲突，已为您调整到最近的空闲时间。`;
              }
              
              if (suggestion.alternatives.length > 0) {
                assistantResponse += `\n\n备选时间：`;
                suggestion.alternatives.slice(0, 2).forEach((alt, i) => {
                  assistantResponse += `\n${i + 1}. ${alt.start.toLocaleString('zh-CN', { 
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
          assistantResponse = '抱歉，我没有找到相关的信息。您可以尝试用不同的关键词搜索。';
        } else {
          assistantResponse = `我找到了 ${relevantItems.length} 个相关项目（本地搜索）：\n\n`;
          
          relevantItems.slice(0, 3).forEach((item, index) => {
            assistantResponse += `${index + 1}. **${item.title}** (${item.type === 'idea' ? '灵感' : '日程'})\n`;
            if (item.type === 'event' && item.startTime) {
              const date = new Date(item.startTime);
              assistantResponse += `   时间：${date.toLocaleString('zh-CN')}\n`;
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
      console.error('搜索失败:', error);
      
      const errorMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        content: '抱歉，搜索时出现了错误。请稍后再试。',
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [inputValue, isProcessing, allItems]);

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
          content: msg.content + '\n\n✅ 已批准此安排',
          proposal: undefined
        };
      }
      return msg;
    }));
  }, [messages, allItems, toEvent]);

  return (
    <div className={styles.container}>
      {!aiStatus.isReady && (
        <div className={styles.statusBar}>
          {aiStatus.isLoading ? (
            <span className={styles.loading}>🔄 AI 引擎加载中...</span>
          ) : aiStatus.error ? (
            <span className={styles.error}>⚠️ {aiStatus.error}</span>
          ) : null}
        </div>
      )}
      
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>🤖</div>
            <h2 className={styles.welcomeTitle}>欢迎使用 AI 秘书</h2>
            <p className={styles.welcomeText}>您可以问我关于日程的任何问题，例如：</p>
            <ul className={styles.examples}>
              <li>"我明天有什么安排？"</li>
              <li>"帮我找一下关于项目的想法"</li>
              <li>"我之前是不是有个关于读书的想法？"</li>
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
                        <span>Schedule Proposal</span>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                      <div className={styles.proposalDetails}>
                        <p className={styles.detailLabel}>时间</p>
                        <p className={styles.detailValue}>{message.proposal.time}</p>
                        <p>📍 {message.proposal.location}</p>
                      </div>
                      <div className={styles.proposalActions}>
                        <button 
                          className={styles.approveBtn}
                          onClick={() => handleApprove(message.id)}
                        >
                          批准 (Approve)
                        </button>
                        <button className={styles.editBtn}>修改 (Edit)</button>
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
            placeholder="告诉秘书你想怎么调整日程..."
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
