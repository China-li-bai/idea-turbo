import localforage from 'localforage';
import type { CalendarEvent, Task, Inspiration, ShiftSchedule } from '@/types';
import type { AIConfig } from '@/lib/ai/types';

localforage.config({
  name: 'ai-calendar',
  version: 1.0,
  storeName: 'ai_calendar_store',
  description: 'AI Calendar Local Storage',
});

export const db = {
  events: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'events',
  }),
  
  tasks: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'tasks',
  }),
  
  inspirations: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'inspirations',
  }),
  
  schedules: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'schedules',
  }),
  
  settings: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'settings',
  }),
  
  searchHistory: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'searchHistory',
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
    db.events.clear(),
    db.tasks.clear(),
    db.inspirations.clear(),
    db.schedules.clear(),
    db.settings.clear(),
    db.searchHistory.clear(),
  ]);
}
