'use client';

import { useState, useEffect } from 'react';
import BossView from './BossView';
import SecretaryView from './SecretaryView';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import { useLocale } from '@/lib/contexts/ClientProviders';
import { useAIModel } from '@/lib/contexts/ClientProviders';
import { getCacheStats, getCacheSizeFormatted, clearModelCache } from '@/lib/services/oramaSearchService';
import styles from './AppLayout.module.scss';

type ViewMode = 'boss' | 'secretary';

export default function AppLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('boss');
  const [cacheSize, setCacheSize] = useState<string>('');
  const [useMirror, setUseMirror] = useState<boolean>(true);
  
  const initialize = useUnifiedStore((state) => state.initialize);
  const { locale, setLocale, t } = useLocale();
  const { currentModel, modelConfig, isLoading, isReady, switchModel, availableModels } = useAIModel();

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

  const getLocaleFlag = (loc: string): string => {
    const flagMap: Record<string, string> = {
      'zh-CN': '🇨🇳',
      'zh-TW': '🇹🇼',
      'en-US': '🇺🇸',
      'ja-JP': '🇯🇵',
      'ko-KR': '🇰🇷',
    };
    return flagMap[loc] || '🌐';
  };

  const getLocaleName = (loc: string): string => {
    const names: Record<string, string> = {
      'zh-CN': '中文',
      'zh-TW': '繁體',
      'en-US': 'EN',
      'ja-JP': '日本語',
      'ko-KR': '한국어',
    };
    return names[loc] || loc;
  };

  const getModelIcon = (): string => {
    const iconMap: Record<string, string> = {
      'zh-specific': '🇨🇳',
      'multilingual': '🌐',
      'english': '🇺🇸',
    };
    return iconMap[currentModel] || '🤖';
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

        <div className={styles.controls}>
          <div className={styles.localeSelector}>
            <select 
              value={locale} 
              onChange={(e) => setLocale(e.target.value as any)}
              className={styles.localeSelect}
            >
              <option value="zh-CN">🇨🇳 中文</option>
              <option value="zh-TW">🇹🇼 繁體</option>
              <option value="en-US">🇺🇸 English</option>
              <option value="ja-JP">🇯🇵 日本語</option>
              <option value="ko-KR">🇰🇷 한국어</option>
            </select>
          </div>

          <div className={styles.modelSelector}>
            <select
              value={currentModel}
              onChange={(e) => switchModel(e.target.value as any)}
              disabled={isLoading}
              className={styles.modelSelect}
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id === 'zh-specific' && '🇨🇳 '}
                  {model.id === 'multilingual' && '🌐 '}
                  {model.id === 'english' && '🇺🇸 '}
                  {model.name} ({model.dimensions}D)
                </option>
              ))}
            </select>
            <span className={`${styles.modelStatus} ${isReady ? styles.ready : styles.loading}`}>
              {isReady ? t('model.ready') : t('model.loading')}
            </span>
            {cacheSize && (
              <span 
                className={styles.cacheSize} 
                onClick={handleClearCache}
                title={t('cache.clickToClear') || '点击清除缓存'}
              >
                📦 {cacheSize}
              </span>
            )}
            <button
              className={`${styles.mirrorToggle} ${useMirror ? styles.mirrorOn : styles.mirrorOff}`}
              onClick={handleToggleMirror}
              title={useMirror ? '使用 HF 镜像源 (国内加速)' : '使用 HF 官方源'}
            >
              {useMirror ? '🇨🇳 镜像' : '🌐 官方'}
            </button>
          </div>

          <div className={styles.viewToggle}>
            <span className={`${styles.toggleLabel} ${viewMode === 'boss' ? styles.activeLabel : ''}`}>
              {t('view.boss')}
            </span>
            <button
              className={styles.toggleSwitch}
              onClick={toggleViewMode}
              aria-label="切换视图模式"
            >
              <span className={`${styles.toggleSlider} ${viewMode === 'secretary' ? styles.sliderRight : ''}`} />
            </button>
            <span className={`${styles.toggleLabel} ${viewMode === 'secretary' ? styles.activeLabel : ''}`}>
              {t('view.secretary')}
            </span>
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
