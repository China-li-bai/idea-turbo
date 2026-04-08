'use client';

import { useEffect, useState } from 'react';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import styles from './ErrorToast.module.scss';

export function SelfHealingToast() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${styles.toast} ${styles[getSeverity(notification.type)]}`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className={styles.toastIcon}>
            {getIcon(notification.type)}
          </div>
          <div className={styles.toastContent}>
            <div className={styles.toastMessage}>{notification.title}</div>
            <div className={styles.toastContext}>{notification.message}</div>
          </div>
          <button
            className={styles.toastClose}
            onClick={(e) => {
              e.stopPropagation();
              removeNotification(notification.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function getIcon(type: string): string {
  switch (type) {
    case 'rescheduled':
      return '🔄';
    case 'conflict_detected':
      return '⚠️';
    case 'schedule_failed':
      return '❌';
    default:
      return 'ℹ️';
  }
}

function getSeverity(type: string): string {
  switch (type) {
    case 'rescheduled':
      return 'medium';
    case 'conflict_detected':
      return 'high';
    case 'schedule_failed':
      return 'critical';
    default:
      return 'low';
  }
}
