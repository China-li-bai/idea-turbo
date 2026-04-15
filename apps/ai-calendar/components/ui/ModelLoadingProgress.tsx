'use client';

import { useState, useEffect } from 'react';
import { useI18nStore } from '@/lib/stores/i18nStore';
import styles from './ModelLoadingProgress.module.scss';

interface LoadingProgress {
  current: number;
  total: number;
  message?: string;
}

interface I18nText {
  'zh-CN': string;
  'en-US': string;
  [key: string]: string;
}

const txt = (obj: I18nText, locale: string) => obj[locale] || obj['zh-CN'];

export function ModelLoadingProgress() {
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { locale } = useI18nStore();

  const i18n = {
    title: txt({ 'zh-CN': 'AI 模型加载中', 'en-US': 'AI Model Loading' }, locale),
    initializing: txt({ 'zh-CN': '正在初始化...', 'en-US': 'Initializing...' }, locale),
    hint: txt({
      'zh-CN': '首次加载需要下载模型，请耐心等待...',
      'en-US': 'First time loading requires downloading the model. Please wait...'
    }, locale),
    ariaLabel: txt({ 'zh-CN': '模型加载进度', 'en-US': 'Model Loading Progress' }, locale)
  };

  useEffect(() => {
    const handleProgress = (data: LoadingProgress) => {
      setProgress(data);
      setIsVisible(true);
      
      if (data.current === data.total) {
        setTimeout(() => {
          setIsVisible(false);
        }, 1000);
      }
    };

    if (typeof window !== 'undefined') {
      (window as any).__modelLoadingProgress = handleProgress;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__modelLoadingProgress;
      }
    };
  }, []);

  if (!isVisible || !progress) return null;

  const percentage = Math.round((progress.current / progress.total) * 100);

  return (
    <div 
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={i18n.ariaLabel}
    >
      <div className={styles.container}>
        <div className={styles.icon} aria-hidden="true">🤖</div>
        <h3 className={styles.title}>{i18n.title}</h3>
        <p className={styles.message}>{progress.message || i18n.initializing}</p>
        
        <div 
          className={styles.progressContainer}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentage}%`}
        >
          <div 
            className={styles.progressBar}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className={styles.stats}>
          <span className={styles.percentage} aria-live="polite">{percentage}%</span>
          <span className={styles.steps}>
            {progress.current} / {progress.total}
          </span>
        </div>
        
        <p className={styles.hint}>{i18n.hint}</p>
      </div>
    </div>
  );
}
