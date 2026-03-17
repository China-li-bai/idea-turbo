'use client';

import { useState, useRef, useEffect } from 'react';
import { useUnifiedItems } from '@/lib/hooks/useUnifiedItems';
import { oramaSearchService } from '@/lib/services/oramaSearchService';
import styles from './SecretaryView.module.scss';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function SecretaryView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { items: allItems } = useUnifiedItems();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isProcessing) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    
    try {
      const searchResults = await oramaSearchService.hybridSearch(userMessage.content, {
        k: 5,
        useHybrid: true
      });
      
      const relevantItems = searchResults.map(result => {
        return allItems.find(item => item.id === result.id);
      }).filter(Boolean);
      
      let assistantResponse = `我找到了 ${relevantItems.length} 个相关项目：\n\n`;
      
      relevantItems.forEach((item, index) => {
        if (item) {
          assistantResponse += `${index + 1}. **${item.title}** (${item.type === 'idea' ? '灵感' : '日程'})\n`;
          if (item.type === 'event' && item.startTime) {
            const date = new Date(item.startTime);
            assistantResponse += `   时间：${date.toLocaleString('zh-CN')}\n`;
          }
          assistantResponse += `   内容：${item.content}\n\n`;
        }
      });
      
      if (relevantItems.length === 0) {
        assistantResponse = '抱歉，我没有找到相关的信息。您可以尝试用不同的关键词搜索。';
      }
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now()
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('搜索失败:', error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '抱歉，搜索时出现了错误。请稍后再试。',
        timestamp: Date.now()
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI 秘书</h1>
        <p className={styles.subtitle}>我可以帮您查找和管理日程</p>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>🤖</div>
            <h2 className={styles.welcomeTitle}>欢迎使用 AI 秘书</h2>
            <p className={styles.welcomeText}>
              您可以问我关于日程的任何问题，例如：
            </p>
            <ul className={styles.examples}>
              <li>"我明天有什么安排？"</li>
              <li>"帮我找一下关于项目的想法"</li>
              <li>"我之前是不是有个关于读书的想法？"</li>
            </ul>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${
                  message.role === 'user' ? styles.userMessage : styles.assistantMessage
                }`}
              >
                <div className={styles.messageContent}>{message.content}</div>
                <div className={styles.messageTime}>
                  {new Date(message.timestamp).toLocaleTimeString('zh-CN')}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={styles.inputSection}>
        <form onSubmit={handleSendMessage} className={styles.inputForm}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入您的问题..."
            className={styles.input}
            disabled={isProcessing}
          />
          <button type="submit" className={styles.submitBtn} disabled={isProcessing || !inputValue.trim()}>
            {isProcessing ? '搜索中...' : '发送'}
          </button>
        </form>
      </div>
    </div>
  );
}
