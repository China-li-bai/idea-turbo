export interface JournalTranslation {
  language: string;
  text: string;
  difficulty: 'simple' | 'medium' | 'advanced';
}

export interface JournalEntry {
  id: string;
  originalText: string;
  originalLanguage: string;
  translations: JournalTranslation[];
  audioUrls: Record<string, string>;
  tags: string[];
  template: string;
  createdAt: number;
  updatedAt: number;
  learningStatus: 'pending' | 'in_progress' | 'completed';
  reviewCount: number;
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
}

export interface JournalSettings {
  targetLanguages: string[];
  defaultTemplate: string;
  dailyGoal: number;
  autoTranslate: boolean;
  audioSpeed: number;
}

const DB_NAME = 'listen-book-journal';
const DB_VERSION = 1;
const STORE_NAME = 'entries';
const SETTINGS_STORE = 'settings';

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('learningStatus', 'learningStatus', { unique: false });
        store.createIndex('nextReviewAt', 'nextReviewAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getJournalEntry(id: string): Promise<JournalEntry | undefined> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getEntriesForReview(): Promise<JournalEntry[]> {
  const database = await initDB();
  const now = Date.now();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('nextReviewAt');
    const range = IDBKeyRange.upperBound(now);
    const request = index.getAll(range);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSettings(): Promise<JournalSettings | undefined> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SETTINGS_STORE], 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get('settings');

    request.onsuccess = () => resolve(request.result?.data);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSettings(settings: JournalSettings): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([SETTINGS_STORE], 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.put({ id: 'settings', data: settings });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateNextReview(reviewCount: number): number {
  const intervals = [1, 2, 4, 7, 15, 30];
  const days = intervals[Math.min(reviewCount, intervals.length - 1)];
  return Date.now() + days * 24 * 60 * 60 * 1000;
}
