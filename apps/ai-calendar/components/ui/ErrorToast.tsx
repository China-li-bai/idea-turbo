'use client';

import { useEffect, useState } from 'react';
import { ErrorHandler, AppError } from '@/lib/utils/errorHandler';
import styles from './ErrorToast.module.scss';

export function ErrorToast() {
  const [errors, setErrors] = useState<AppError[]>([]);

  useEffect(() => {
    const unsubscribe = ErrorHandler.subscribe((error) => {
      setErrors((prev) => [...prev, error]);
      
      setTimeout(() => {
        setErrors((prev) => prev.filter((e) => e.id !== error.id));
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (errorId: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId));
  };

  if (errors.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {errors.map((error) => (
        <div
          key={error.id}
          className={`${styles.toast} ${styles[error.severity]}`}
          onClick={() => handleDismiss(error.id)}
        >
          <div className={styles.toastIcon}>
            {error.severity === 'critical' && '🚨'}
            {error.severity === 'high' && '⚠️'}
            {error.severity === 'medium' && 'ℹ️'}
            {error.severity === 'low' && '💬'}
          </div>
          <div className={styles.toastContent}>
            <div className={styles.toastMessage}>{error.userMessage}</div>
            {error.context && (
              <div className={styles.toastContext}>{error.context}</div>
            )}
          </div>
          <button
            className={styles.toastClose}
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss(error.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
