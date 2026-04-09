'use client';

import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import styles from './ErrorToast.module.scss';

export function SelfHealingToast() {
  const { notifications, removeNotification } = useNotificationStore();
  const undoReschedule = useUnifiedStore((state) => state.undoReschedule);

  if (notifications.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${styles.toast} ${styles[getSeverity(notification.type)]}`}
        >
          <div className={styles.toastIcon}>
            {getIcon(notification.type)}
          </div>
          <div className={styles.toastContent}>
            <div className={styles.toastMessage}>{notification.title}</div>
            <div className={styles.toastContext}>{notification.message}</div>
          </div>
          {notification.type === 'rescheduled' && notification.undoItemId && (
            <button
              className={styles.undoButton}
              onClick={() => {
                const success = undoReschedule(notification.undoItemId!);
                if (success) {
                  removeNotification(notification.id);
                }
              }}
            >
              ↩ 撤销
            </button>
          )}
          <button
            className={styles.toastClose}
            onClick={() => removeNotification(notification.id)}
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
    case 'undo_available':
      return '↩️';
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
    case 'undo_available':
      return 'low';
    default:
      return 'low';
  }
}
