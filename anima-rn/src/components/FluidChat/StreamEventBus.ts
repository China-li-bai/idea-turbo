type EventListener = (...args: any[]) => void

class StreamEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map()

  addListener(event: string, fn: EventListener): { remove: () => void } {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(fn)
    return {
      remove: () => {
        this.listeners.get(event)?.delete(fn)
      },
    }
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args))
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}

export const streamEventBus = new StreamEventBus()
