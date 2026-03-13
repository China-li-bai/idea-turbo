export type DataChangeEvent = {
  type: 'created' | 'updated' | 'deleted';
  entityType: 'event' | 'task' | 'inspiration' | 'shiftSchedule' | 'settings';
  entityId?: string;
  metadata?: Record<string, any>;
};

type EventCallback = (event: DataChangeEvent) => void;

class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  subscribe(entityType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(entityType)) {
      this.listeners.set(entityType, new Set());
    }
    this.listeners.get(entityType)!.add(callback);

    return () => {
      this.listeners.get(entityType)?.delete(callback);
    };
  }

  subscribeAll(callback: EventCallback): () => void {
    return this.subscribe('*', callback);
  }

  publish(event: DataChangeEvent): void {
    const listeners = this.listeners.get(event.entityType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in listener for ${event.entityType}:`, error);
        }
      });
    }

    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in global listener:', error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
