'use client';

import { useState, useEffect } from 'react';
import styles from './ModelLoadingProgress.module.scss';

interface LoadingProgress {
  current: number;
  total: number;
  message?: string;
}

export function ModelLoadingProgress() {
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);

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
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.icon}>🤖</div>
        <h3 className={styles.title}>AI 模型加载中</h3>
        <p className={styles.message}>{progress.message || '正在初始化...'}</p>
        
        <div className={styles.progressContainer}>
          <div 
            className={styles.progressBar}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className={styles.stats}>
          <span className={styles.percentage}>{percentage}%</span>
          <span className={styles.steps}>
            {progress.current} / {progress.total}
          </span>
        </div>
        
        <p className={styles.hint}>
          首次加载需要下载模型，请耐心等待...
        </p>
      </div>
    </div>
  );
}
