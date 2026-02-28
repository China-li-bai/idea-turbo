export interface PreloadRequest {
  id: string;
  text: string;
  priority: number;
}

export interface PreloadTask {
  request: PreloadRequest;
  abortController: AbortController;
  promise: Promise<Blob>;
}

export interface AudioPreloaderOptions {
  concurrentLimit?: number;
  preloadAhead?: number;
}

export type PreloadCallback = (id: string, blob: Blob) => void;

export class AudioPreloader {
  private queue: PreloadTask[] = [];
  private activeTasks: Map<string, PreloadTask> = new Map();
  private concurrentLimit: number;
  private preloadAhead: number;
  private fetchFn: (text: string, signal: AbortSignal) => Promise<Blob>;
  private onPreloadSuccess: PreloadCallback;

  constructor(
    fetchFn: (text: string, signal: AbortSignal) => Promise<Blob>,
    options: AudioPreloaderOptions = {},
    onPreloadSuccess: PreloadCallback = () => {}
  ) {
    this.fetchFn = fetchFn;
    this.concurrentLimit = options.concurrentLimit ?? 2;
    this.preloadAhead = options.preloadAhead ?? 3;
    this.onPreloadSuccess = onPreloadSuccess;
  }

  setPreloadCallback(callback: PreloadCallback): void {
    this.onPreloadSuccess = callback;
  }

  preload(requests: PreloadRequest[]): void {
    for (const request of requests) {
      this.enqueue(request);
    }
    this.processQueue();
  }

  cancel(id: string): void {
    const activeTask = this.activeTasks.get(id);
    if (activeTask) {
      activeTask.abortController.abort();
      this.activeTasks.delete(id);
    }

    const queueIndex = this.queue.findIndex(t => t.request.id === id);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
    }
  }

  cancelAll(): void {
    for (const [, task] of this.activeTasks) {
      task.abortController.abort();
    }
    this.activeTasks.clear();
    this.queue = [];
  }

  getActiveCount(): number {
    return this.activeTasks.size;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  private enqueue(request: PreloadRequest): void {
    if (this.activeTasks.has(request.id) || this.queue.some(t => t.request.id === request.id)) {
      return;
    }

    const abortController = new AbortController();
    const promise = this.fetchFn(request.text, abortController.signal);

    const task: PreloadTask = {
      request,
      abortController,
      promise
    };

    this.queue.push(task);
    this.queue.sort((a, b) => b.request.priority - a.request.priority);
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeTasks.size < this.concurrentLimit) {
      const task = this.queue.shift()!;
      this.activeTasks.set(task.request.id, task);

      task.promise
        .then((blob) => {
          this.onPreloadSuccess(task.request.id, blob);
          this.activeTasks.delete(task.request.id);
          this.processQueue();
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            console.error(`Preload failed for ${task.request.id}:`, error);
          }
          this.activeTasks.delete(task.request.id);
          this.processQueue();
        });
    }
  }
}
