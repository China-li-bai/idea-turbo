'use client'

import { useState, useEffect } from 'react'
import BossView from './BossView'
import SecretaryView from './SecretaryView'
import { useDataStore } from '@/lib/stores/dataStore'
import { initializeTestData } from '@/lib/utils/testData'
import styles from './AppLayout.module.scss'

type ViewMode = 'boss' | 'secretary'

export default function AppLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('boss')
  const [dataInitialized, setDataInitialized] = useState(false)
  
  const events = useDataStore(state => state.events)
  const inspirations = useDataStore(state => state.inspirations)
  const tasks = useDataStore(state => state.tasks)
  const addEvent = useDataStore(state => state.addEvent)
  const addInspiration = useDataStore(state => state.addInspiration)
  const addTask = useDataStore(state => state.addTask)
  const initialize = useDataStore(state => state.initialize)
  const _initialized = useDataStore(state => state._initialized)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (_initialized && !dataInitialized) {
      initializeTestData(addEvent, addInspiration, addTask, events, inspirations, tasks)
        .then(() => setDataInitialized(true))
        .catch(console.error)
    }
  }, [_initialized, dataInitialized, addEvent, addInspiration, addTask, events, inspirations, tasks])

  useEffect(() => {
    document.body.style.backgroundColor = viewMode === 'boss' ? '#fafafa' : '#111'
    document.body.style.color = viewMode === 'boss' ? '#111' : '#fafafa'
    return () => {
      document.body.style.backgroundColor = ''
      document.body.style.color = ''
    }
  }, [viewMode])

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'boss' ? 'secretary' : 'boss')
  }

  return (
    <div className={`${styles.container} ${viewMode === 'secretary' ? styles.darkContainer : ''}`}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1 className={styles.logoText}>SmartJourney</h1>
          <div className={styles.localBadge}>
            <div className={styles.localDot} />
            <span className={styles.localLabel}>100% Local</span>
          </div>
        </div>

        <div className={styles.viewToggle}>
          <span className={`${styles.toggleLabel} ${viewMode === 'boss' ? styles.activeLabel : ''}`}>
            Boss
          </span>
          <button 
            className={styles.toggleSwitch}
            onClick={toggleViewMode}
            aria-label="切换视图模式"
          >
            <span className={`${styles.toggleSlider} ${viewMode === 'secretary' ? styles.sliderRight : ''}`} />
          </button>
          <span className={`${styles.toggleLabel} ${viewMode === 'secretary' ? styles.activeLabel : ''}`}>
            Secretary
          </span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={`${styles.viewContainer} ${viewMode === 'boss' ? styles.visible : styles.hidden}`}>
          <BossView onOpenSecretary={() => setViewMode('secretary')} />
        </div>
        <div className={`${styles.viewContainer} ${viewMode === 'secretary' ? styles.visible : styles.hidden}`}>
          <SecretaryView />
        </div>
      </main>
    </div>
  )
}
