'use client'

import { useState, useEffect, useRef } from 'react'
import { useCalendarStore } from '@/lib/stores/calendarStore'
import { v4 as uuidv4 } from 'uuid'
import { parseNaturalLanguage } from '@/lib/utils/nlpParser'
import styles from './inspirationCapture.module.scss'

type InspirationType = 'todo' | 'event' | 'note' | 'raw'

export default function InspirationCapture() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedType, setSelectedType] = useState<InspirationType>('raw')
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { addInspiration } = useCalendarStore()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsProcessing(true)
    
    let extractedDate: Date | undefined
    let finalType = selectedType
    
    if (selectedType === 'raw') {
      const parsed = await parseNaturalLanguage(content)
      if (parsed.date) {
        extractedDate = parsed.date
        finalType = parsed.type || 'event'
      }
    }

    addInspiration({
      id: uuidv4(),
      content: content.trim(),
      captureTime: new Date(),
      type: finalType,
      processed: false,
      extractedDate,
    })

    setContent('')
    setSelectedType('raw')
    setIsOpen(false)
    setIsProcessing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const quickTypes: { value: InspirationType; label: string; icon: string }[] = [
    { value: 'todo', label: '待办', icon: '☑️' },
    { value: 'event', label: '日程', icon: '📅' },
    { value: 'note', label: '笔记', icon: '📝' },
    { value: 'raw', label: '灵感', icon: '💡' },
  ]

  return (
    <>
      <button 
        className={styles.fab}
        onClick={() => setIsOpen(true)}
        title="快速捕获灵光时刻"
      >
        <span className={styles.fabIcon}>+</span>
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3>快速捕获</h3>
              <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>

            <div className={styles.typeSelector}>
              {quickTypes.map((type) => (
                <button
                  key={type.value}
                  className={`${styles.typeBtn} ${selectedType === type.value ? styles.active : ''}`}
                  onClick={() => setSelectedType(type.value)}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>

            <textarea
              ref={inputRef}
              className={styles.input}
              placeholder={
                selectedType === 'todo' 
                  ? '添加待办事项... (如: 购买办公用品)' 
                  : selectedType === 'event'
                  ? '添加日程... (如: 下周二下午3点见王总)'
                  : selectedType === 'note'
                  ? '记录笔记...'
                  : '记录灵感... (支持自然语言解析)'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
            />

            <div className={styles.hint}>
              <span className={styles.hintIcon}>💡</span>
              <span>支持自然语言输入，如"下周二下午3点见王总"</span>
            </div>

            <div className={styles.actions}>
              <button 
                className={styles.cancelBtn}
                onClick={() => setIsOpen(false)}
              >
                取消
              </button>
              <button 
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={!content.trim() || isProcessing}
              >
                {isProcessing ? '处理中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
