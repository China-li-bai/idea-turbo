'use client'

import { useState, useRef, useEffect } from 'react'
import { useEvents } from '@/lib/hooks/useUnifiedData'
import { aiService } from '@/lib/ai'
import { aiPrivacyMiddleware } from '@/lib/utils/aiPrivacy'
import type { CalendarEvent } from '@/types'
import styles from './SecretaryView.module.scss'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  proposal?: { title: string; newTime: string; location?: string }
}

export default function SecretaryView() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: '您好！我是您的智能日程助手。告诉我您想如何调整日程。' },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { events } = useEvents()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleApprove = (proposal: NonNullable<Message['proposal']>) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `已确认：${proposal.title} - ${proposal.newTime}`,
    }])
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return
    const userInput = inputValue.trim()
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userInput }])
    setInputValue('')
    setIsProcessing(true)

    try {
      const sanitizedInput = aiPrivacyMiddleware.sanitizeInput(userInput, 'chat')
      const todayStr = new Date().toISOString().split('T')[0]
      const upcoming = events.filter(e => new Date(e.startTime) >= new Date()).slice(0, 5)
      
      const response = await aiService.chat([
        { role: 'system', content: `你是智能日程助手。今天是${todayStr}。用户日程：${upcoming.map(e => e.title).join(', ')}` },
        { role: 'user', content: sanitizedInput },
      ])

      const content = response.choices[0]?.message?.content || '我理解您的需求。'
      const proposal = userInput.includes('推迟') || userInput.includes('调整') 
        ? { title: '调整后的日程', newTime: '周五 15:00-16:30', location: '会议室' }
        : undefined

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content, proposal }])
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: '处理中出现问题，请重试。' }])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <section className={styles.container}>
      <div className={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
            {msg.role === 'user' ? (
              <div className={styles.userBubble}><p>{msg.content}</p></div>
            ) : (
              <div className={styles.assistantBubble}>
                {msg.proposal ? (
                  <div className={styles.proposalCard}>
                    <div className={styles.proposalHeader}>
                      <div className={styles.statusDot} />
                      <span>Schedule Proposal</span>
                    </div>
                    <p>{msg.content}</p>
                    <div className={styles.proposalDetails}>
                      <p className={styles.detailLabel}>新时间</p>
                      <p className={styles.detailValue}>{msg.proposal.newTime}</p>
                      {msg.proposal.location && <p>📍 {msg.proposal.location}</p>}
                    </div>
                    <div className={styles.proposalActions}>
                      <button className={styles.approveBtn} onClick={() => handleApprove(msg.proposal!)}>批准</button>
                      <button className={styles.editBtn}>修改</button>
                    </div>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <input
            className={styles.input}
            placeholder="告诉秘书你想怎么调整日程..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            disabled={isProcessing}
          />
          <button className={styles.sendBtn} onClick={handleSend} disabled={isProcessing || !inputValue.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
