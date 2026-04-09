import { create } from 'zustand';

export interface SelfHealingNotification {
  id: string;
  type: 'rescheduled' | 'conflict_detected' | 'schedule_failed' | 'undo_available';
  title: string;
  message: string;
  itemId?: string;
  oldSlot?: { start: number; end: number };
  newSlot?: { start: number; end: number };
  undoItemId?: string;
  timestamp: number;
}

interface NotificationState {
  notifications: SelfHealingNotification[];
  addNotification: (notification: Omit<SelfHealingNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  undoReschedule: (itemId: string) => boolean;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'notif-' + Math.random().toString(36).substring(2, 11);
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const newNotification: SelfHealingNotification = {
      ...notification,
      id: generateId(),
      timestamp: Date.now()
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== newNotification.id)
      }));
    }, 5000);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  undoReschedule: (itemId: string): boolean => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.undoItemId !== itemId)
    }));

    return true;
  }
}));

export function notifyRescheduled(
  itemTitle: string,
  itemId: string,
  oldSlot: { start: number; end: number } | null,
  newSlot: { start: number; end: number }
): void {
  const dateFormat = (ts: number) => new Date(ts).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const message = oldSlot
    ? `已从 ${dateFormat(oldSlot.start)} 调整到 ${dateFormat(newSlot.start)}`
    : `已安排到 ${dateFormat(newSlot.start)}`;

  useNotificationStore.getState().addNotification({
    type: 'rescheduled',
    title: `📅 ${itemTitle}`,
    message,
    itemId,
    oldSlot: oldSlot || undefined,
    newSlot,
    undoItemId: itemId
  });
}

export function notifyConflictDetected(itemTitle: string, itemId: string): void {
  useNotificationStore.getState().addNotification({
    type: 'conflict_detected',
    title: `⚠️ 时间冲突`,
    message: `${itemTitle} 与新日程冲突，需要调整`,
    itemId
  });
}

export function notifyScheduleFailed(itemTitle: string, itemId: string, reason: string): void {
  useNotificationStore.getState().addNotification({
    type: 'schedule_failed',
    title: `❌ 安排失败`,
    message: `${itemTitle}: ${reason}`,
    itemId
  });
}
