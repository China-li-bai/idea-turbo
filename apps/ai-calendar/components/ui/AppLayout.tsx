'use client';

import { useState, useEffect, useRef } from 'react';
import BossView from './BossView';
import SecretaryView from './SecretaryView';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import { useLocale } from '@/lib/contexts/ClientProviders';
import { useAIModel } from '@/lib/contexts/ClientProviders';
import { getCacheSizeFormatted, clearModelCache } from '@/lib/services/oramaSearchService';
import type { AIModelType } from '@/lib/utils/aiModels';
import styles from './AppLayout.module.scss';

type ViewMode = 'boss' | 'secretary';

export default function AppLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('boss');
  const [cacheSize, setCacheSize] = useState<string>('');
  const [useMirror, setUseMirror] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const initialize = useUnifiedStore((state) => state.initialize);
  const items = useUnifiedStore((state) => state.items);
  const { locale, setLocale, t } = useLocale();
  const { currentModel, modelConfig, isLoading, isReady, switchModelWithReindex, availableModels } = useAIModel();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const savedMirror = localStorage.getItem('use-hf-mirror');
    setUseMirror(savedMirror !== 'false');
  }, []);

  useEffect(() => {
    const updateCacheSize = async () => {
      const size = await getCacheSizeFormatted();
      setCacheSize(size);
    };
    
    updateCacheSize();
    const interval = setInterval(updateCacheSize, 5000);
    return () => clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    document.body.style.backgroundColor = viewMode === 'boss' ? '#fafafa' : '#111';
    document.body.style.color = viewMode === 'boss' ? '#111' : '#fafafa';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, [viewMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsOpen]);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'boss' ? 'secretary' : 'boss'));
  };

  const handleClearCache = async () => {
    if (confirm(t('cache.clearConfirm') || '确定要清除模型缓存吗？下次加载需要重新下载模型。')) {
      await clearModelCache();
      setCacheSize('0 KB');
    }
  };

  const handleToggleMirror = () => {
    const newValue = !useMirror;
    setUseMirror(newValue);
    localStorage.setItem('use-hf-mirror', String(newValue));
    if (confirm(t('cache.reloadConfirm') || '镜像源设置已更改，需要刷新页面才能生效。是否立即刷新？')) {
      window.location.reload();
    }
  };

  const handleModelChange = (newModel: AIModelType) => {
    if (newModel !== currentModel) {
      const dimensions = availableModels.find(m => m.id === newModel)?.dimensions;
      const currentDimensions = modelConfig?.dimensions;
      if (dimensions && currentDimensions && dimensions !== currentDimensions) {
        if (confirm(t('cache.reindexConfirm') || `切换模型将需要重新生成所有 ${items.length} 个项目的向量索引，可能需要几分钟时间。是否继续？`)) {
          switchModelWithReindex(newModel, items);
        }
      } else {
        switchModelWithReindex(newModel, items);
      }
    }
  };

  return (
    <div className={`${styles.container} ${viewMode === 'secretary' ? styles.darkContainer : ''}`}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1 className={styles.logoText}>{t('app.title')}</h1>
          <div className={styles.localBadge}>
            <div className={styles.localDot} />
            <span className={styles.localLabel}>{t('app.local')}</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'boss' ? styles.activeView : ''}`}
              onClick={() => setViewMode('boss')}
            >
              {t('view.boss')}
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'secretary' ? styles.activeView : ''}`}
              onClick={() => setViewMode('secretary')}
            >
              {t('view.secretary')}
            </button>
          </div>

          <div className={styles.settingsWrapper} ref={settingsRef}>
            <button 
              className={styles.settingsBtn}
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-label="设置"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>

            {settingsOpen && (
              <div className={styles.settingsPanel}>
                <div className={styles.settingsSection}>
                  <label className={styles.settingsLabel}>{t('model.title')}</label>
                  <div className={styles.modelRow}>
                    <select
                      value={currentModel}
                      onChange={(e) => handleModelChange(e.target.value as AIModelType)}
                      disabled={isLoading}
                      className={styles.modelSelect}
                    >
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({model.dimensions}D)
                        </option>
                      ))}
                    </select>
                    <span className={`${styles.modelStatus} ${isReady ? styles.ready : styles.loading}`}>
                      {isReady ? t('model.ready') : t('model.loading')}
                    </span>
                  </div>
                </div>

                <div className={styles.settingsSection}>
                  <label className={styles.settingsLabel}>
                    {locale.startsWith('zh') ? '语言 / Language' : 'Language / 语言'}
                  </label>
                  <div className={styles.localeGrid}>
                    {[
                      { code: 'zh-CN', flag: '🇨🇳', name: '中文' },
                      { code: 'zh-TW', flag: '🇹🇼', name: '繁體' },
                      { code: 'en-US', flag: '🇺🇸', name: 'English' },
                      { code: 'ja-JP', flag: '🇯🇵', name: '日本語' },
                      { code: 'ko-KR', flag: '🇰🇷', name: '한국어' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        className={`${styles.localeBtn} ${locale === lang.code ? styles.activeLocale : ''}`}
                        onClick={() => {
                          setLocale(lang.code as any);
                          setSettingsOpen(false);
                        }}
                      >
                        <span className={styles.localeFlag}>{lang.flag}</span>
                        <span className={styles.localeName}>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.settingsSection}>
                  <div className={styles.toggleRow}>
                    <span className={styles.toggleLabel}>
                      {useMirror ? '🇨🇳 HF 镜像源' : '🌐 HF 官方源'}
                    </span>
                    <button
                      className={`${styles.toggleSwitch} ${useMirror ? styles.toggleOn : ''}`}
                      onClick={handleToggleMirror}
                    />
                  </div>
                </div>

                <div className={styles.settingsSection}>
                  <button 
                    className={styles.cacheBtn}
                    onClick={handleClearCache}
                  >
                    <span>📦 {cacheSize}</span>
                    <span className={styles.cacheHint}>{t('cache.clickToClear')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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

      <div className={styles.shortcutHint}>
        <span className={styles.shortcutText}>
          {t('shortcut.hint')}
        </span>
      </div>
    </div>
  );
}
