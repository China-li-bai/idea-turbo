'use client'

import { useCalendarStore } from '@/lib/stores/calendarStore'
import { useSettings } from '@/lib/hooks/useUnifiedData'
import styles from './viewModeSelector.module.scss'

export type ViewMode = 'boss' | 'assistant' | 'personal'

export default function ViewModeSelector() {
  const { settings } = useSettings()
  const { setViewMode } = useCalendarStore()
  const currentMode = settings?.viewMode || 'personal'

  const modes: { value: ViewMode; label: string; icon: string; description: string }[] = [
    { 
      value: 'boss', 
      label: 'Boss视图', 
      icon: '👔',
      description: '关注时间节点与关键结论'
    },
    { 
      value: 'assistant', 
      label: '秘书视图', 
      icon: '📋',
      description: '管理准备事项与执行细节'
    },
    { 
      value: 'personal', 
      label: '个人视图', 
      icon: '👤',
      description: '个人日程管理'
    },
  ]

  return (
    <div className={styles.selector}>
      <div className={styles.label}>视图模式</div>
      <div className={styles.tabs}>
        {modes.map((mode) => (
          <button
            key={mode.value}
            className={`${styles.tab} ${currentMode === mode.value ? styles.active : ''}`}
            onClick={() => setViewMode(mode.value)}
            title={mode.description}
          >
            <span className={styles.icon}>{mode.icon}</span>
            <span className={styles.text}>{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
