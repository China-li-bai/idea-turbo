export class OperationGuard {
  private static instance: OperationGuard;
  private pendingOperations = new Map<string, Promise<any>>();
  private lastOperationTime = new Map<string, number>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  static getInstance(): OperationGuard {
    if (!OperationGuard.instance) {
      OperationGuard.instance = new OperationGuard();
    }
    return OperationGuard.instance;
  }

  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    wait: number = 500,
    immediate: boolean = false
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const later = () => {
        this.debounceTimers.delete(key);
        if (!immediate) func(...args);
      };

      const callNow = immediate && !this.debounceTimers.has(key);
      
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      this.debounceTimers.set(key, setTimeout(later, wait));

      if (callNow) func(...args);
    };
  }

  throttle<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    limit: number = 1000
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  async guardOperation<T>(
    key: string,
    operation: () => Promise<T>,
    minInterval: number = 1000
  ): Promise<T> {
    const now = Date.now();
    const lastTime = this.lastOperationTime.get(key) || 0;

    if (now - lastTime < minInterval) {
      throw new Error('操作太频繁，请稍后再试');
    }

    if (this.pendingOperations.has(key)) {
      return this.pendingOperations.get(key) as Promise<T>;
    }

    const promise = operation().finally(() => {
      this.pendingOperations.delete(key);
    });

    this.pendingOperations.set(key, promise);
    this.lastOperationTime.set(key, now);

    return promise;
  }

  isOperationPending(key: string): boolean {
    return this.pendingOperations.has(key);
  }

  cancelDebounce(key: string): void {
    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }
  }

  clearAll(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingOperations.clear();
    this.lastOperationTime.clear();
  }
}

export const operationGuard = OperationGuard.getInstance();

export const withDebounce = <T extends (...args: any[]) => any>(
  key: string,
  func: T,
  wait: number = 500
) => operationGuard.debounce(key, func, wait);

export const withThrottle = <T extends (...args: any[]) => any>(
  key: string,
  func: T,
  limit: number = 1000
) => operationGuard.throttle(key, func, limit);
