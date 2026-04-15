'use client';

import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useUnifiedStore } from '@/lib/stores/unifiedStore';
import { useI18nStore } from '@/lib/stores/i18nStore';
import styles from './ErrorToast.module.scss';

interface I18nText {
  'zh-CN': string;
  'en-US': string;
  [key: string]: string;
}

const txt = (obj: I18nText, locale: string) => obj[locale] || obj['zh-CN'];

export function SelfHealingToast() {
  const { notifications, removeNotification } = useNotificationStore();
  const undoReschedule = useUnifiedStore((state) => state.undoReschedule);
  const { locale } = useI18nStore();

  const i18n = {
    undo: txt({ 'zh-CN': '撤销', 'en-US': 'Undo' }, locale),
    close: txt({ 'zh-CN': '关闭', 'en-US': 'Close' }, locale),
    ariaLabel: txt({ 'zh-CN': '通知提示', 'en-US': 'Notifications' }, locale)
  };

  if (notifications.length === 0) return null;

  return (
    <div 
      className={styles.toastContainer}
      role="region"
      aria-label={i18n.ariaLabel}
      aria-live="polite"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${styles.toast} ${styles[getSeverity(notification.type)]}`}
          role="alert"
          aria-atomic="true"
        >
          <div className={styles.toastIcon} aria-hidden="true">
            {getIcon(notification.type)}
          </div>
          <div className={styles.toastContent}>
            <div className={styles.toastMessage}>{notification.title}</div>
            {notification.message && (
              <div className={styles.toastContext}>{notification.message}</div>
            )}
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
              aria-label={i18n.undo}
            >
              ↩ {i18n.undo}
            </button>
          )}
          <button
            className={styles.toastClose}
            onClick={() => removeNotification(notification.id)}
            aria-label={i18n.close}
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
