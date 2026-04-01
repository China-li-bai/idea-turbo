import localforage from 'localforage';
import type { AIConfig } from '@/lib/ai/types';

localforage.config({
  name: 'ai-calendar',
  version: 1.0,
  storeName: 'ai_calendar_store',
  description: 'AI Calendar Local Storage',
});

export const db = {
  settings: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'settings',
  }),

  oramasearch: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'oramasearch',
  }),

  memory: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'memory',
  }),

  memoryIndex: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'memory-index',
  }),
};

export async function getAllFromStore<T>(store: LocalForage): Promise<T[]> {
  const keys = await store.keys();
  const items: T[] = [];
  for (const key of keys) {
    const item = await store.getItem<T>(key);
    if (item) {
      items.push(item);
    }
  }
  return items;
}

export async function clearAllStores(): Promise<void> {
  await Promise.all([
    db.settings.clear(),
    db.oramasearch.clear(),
    db.memory.clear(),
    db.memoryIndex.clear(),
  ]);
}

export { localforage };
