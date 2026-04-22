import { db, getAllFromStore } from './index';
import type { UnifiedCalendarItem } from '@/types/unified';

class CalendarItemStorageImpl {
  private store: LocalForage;
  private initialized: boolean = false;

  constructor() {
    this.store = db.calendarItems;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.store.ready();
      this.initialized = true;
    } catch (error) {
      console.error('[CalendarItemStorage] Failed to initialize:', error);
      throw error;
    }
  }

  async save(item: UnifiedCalendarItem): Promise<void> {
    if (!this.initialized) await this.initialize();
    await this.store.setItem(item.id, item);
  }

  async get(id: string): Promise<UnifiedCalendarItem | null> {
    if (!this.initialized) await this.initialize();
    return await this.store.getItem<UnifiedCalendarItem>(id);
  }

  async update(id: string, updates: Partial<UnifiedCalendarItem>): Promise<UnifiedCalendarItem | null> {
    if (!this.initialized) await this.initialize();
    const existing = await this.get(id);
    if (!existing) return null;

    const updated: UnifiedCalendarItem = {
      ...existing,
      ...updates,
      id: existing.id,
      metadata: {
        ...existing.metadata,
        ...(updates.metadata || {}),
      },
    };

    await this.save(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    const item = await this.get(id);
    if (!item) return false;
    await this.store.removeItem(id);
    return true;
  }

  async getAll(): Promise<UnifiedCalendarItem[]> {
    if (!this.initialized) await this.initialize();
    return await getAllFromStore<UnifiedCalendarItem>(this.store);
  }

  async count(): Promise<number> {
    if (!this.initialized) await this.initialize();
    return await this.store.length();
  }

  async clear(): Promise<void> {
    if (!this.initialized) await this.initialize();
    await this.store.clear();
  }

  async saveBatch(items: UnifiedCalendarItem[]): Promise<void> {
    if (!this.initialized) await this.initialize();
    await Promise.all(
      items.map(item => this.store.setItem(item.id, item))
    );
  }

  async deleteBatch(ids: string[]): Promise<number> {
    if (!this.initialized) await this.initialize();
    let deleted = 0;
    for (const id of ids) {
      const result = await this.delete(id);
      if (result) deleted++;
    }
    return deleted;
  }
}

export const calendarItemStorage = new CalendarItemStorageImpl();
