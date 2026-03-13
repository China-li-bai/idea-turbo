import localforage from 'localforage';

localforage.config({
  name: 'ai-calendar',
  storeName: 'calendar-data',
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
  shiftSchedules: localforage.createInstance({
    name: 'ai-calendar',
    storeName: 'shiftSchedules',
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

export async function getAllFromStore<T>(
  store: LocalForage,
  filter?: (item: T) => boolean
): Promise<T[]> {
  const items: T[] = [];
  await store.iterate((value: T, key: string) => {
    if (!filter || filter(value)) {
      items.push(value);
    }
  });
  return items;
}

export async function clearAllStores(): Promise<void> {
  await Promise.all([
    db.events.clear(),
    db.tasks.clear(),
    db.inspirations.clear(),
    db.shiftSchedules.clear(),
    db.settings.clear(),
    db.searchHistory.clear(),
  ]);
}
