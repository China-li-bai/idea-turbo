import type { TextDocument, TextProcessingResult } from '../types';

export class TextProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'TextProcessingError';
  }
}

export function validateTextInput(text: string): { valid: boolean; error?: string } {
  if (typeof text !== 'string') {
    return { valid: false, error: '输入必须是文本类型' };
  }

  if (text.trim().length === 0) {
    return { valid: false, error: '文本内容不能为空' };
  }

  if (text.length > 10_000_000) {
    return { valid: false, error: '文本过长，最大支持 1000 万字符' };
  }

  return { valid: true };
}

export function estimateProcessingTime(text: string): number {
  const wordsPerSecond = 50000;
  return Math.ceil(text.length / wordsPerSecond * 1000);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  return fn().catch(async (error) => {
    if (maxAttempts <= 1) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, maxAttempts - 1, delay * 2);
  });
}

export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await fn();
  const time = performance.now() - start;
  return { result, time };
}

export function isValidFileType(file: File): boolean {
  const validTypes = [
    'text/plain',
    'text/markdown',
    'text/html',
    'application/json',
    'application/javascript',
  ];
  
  const validExtensions = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.htm'];
  
  if (validTypes.includes(file.type)) {
    return true;
  }
  
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return validExtensions.includes(ext);
}

export function getFileEncoding(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as ArrayBuffer;
      const decoder = new TextDecoder('utf-8', { fatal: true });
      try {
        decoder.decode(result);
        resolve('utf-8');
      } catch {
        resolve('gbk');
      }
    };
    reader.onerror = () => resolve('utf-8');
    reader.readAsArrayBuffer(file.slice(0, 1024));
  });
}
