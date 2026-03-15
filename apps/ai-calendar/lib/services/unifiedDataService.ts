/**
 * @deprecated Use dataStoreAdapter instead. This service directly accesses the database
 * and bypasses the unified Zustand store, which can cause data inconsistency issues.
 * 
 * Migration guide:
 * - unifiedDataService.getAllEvents() → dataStoreAdapter.getAllEvents()
 * - unifiedDataService.getEventById() → dataStoreAdapter.getEventById()
 * - unifiedDataService.addEvent() → dataStoreAdapter.addEvent()
 * - unifiedDataService.updateEvent() → dataStoreAdapter.updateEvent()
 * - unifiedDataService.deleteEvent() → dataStoreAdapter.deleteEvent()
 * 
 * Similar methods exist for tasks, inspirations, schedules, and settings.
 * 
 * @see dataStoreAdapter
 * @see useDataStore
 */
import { db, getAllFromStore } from '../storage';
import { eventBus, type DataChangeEvent, type EntityType } from '../utils/eventBus';
import { vectorService } from './vectorService';
import type { CalendarEvent, Task, Inspiration, ShiftSchedule, UserSettings, SearchHistory } from '@/types';
import type { AIConfig } from '@/lib/ai/types';

class UnifiedDataService {
  private async publishChange(type: DataChangeEvent['type'], entityType: EntityType, entityId: string, data?: any) {
    eventBus.publish({
      type,
      entityType,
      entityId,
      data,
    });
  }

  private async updateEventVectorIndex(event: CalendarEvent): Promise<void> {
    try {
      await vectorService.indexEvent(event);
    } catch (error) {
      console.error('Failed to update event vector index:', error);
    }
  }

  private async updateTaskVectorIndex(task: Task): Promise<void> {
    try {
      await vectorService.indexTask(task);
    } catch (error) {
      console.error('Failed to update task vector index:', error);
    }
  }

  private async updateInspirationVectorIndex(inspiration: Inspiration): Promise<void> {
    try {
      await vectorService.indexInspiration(inspiration);
    } catch (error) {
      console.error('Failed to update inspiration vector index:', error);
    }
  }

  async getAllEvents(options?: {
    dateRange?: { start: Date; end: Date };
    viewMode?: string;
    eventType?: string;
  }): Promise<CalendarEvent[]> {
    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    
    return allEvents.filter((event) => {
      let matches = true;
      
      if (options?.dateRange) {
        const { start, end } = options.dateRange;
        matches = matches && event.startTime < end && event.endTime > start;
      }
      
      if (options?.viewMode) {
        matches = matches && event.viewMode === options.viewMode;
      }

      if (options?.eventType) {
        matches = matches && event.eventType === options.eventType;
      }
      
      return matches;
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getEventById(id: string): Promise<CalendarEvent | null> {
    return db.events.getItem<CalendarEvent>(id);
  }

  async addEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const now = new Date();
    const newEvent: CalendarEvent = {
      ...event,
      createdAt: event.createdAt || now,
      updatedAt: now,
      eventType: event.eventType || 'regular',
    };
    
    await db.events.setItem(newEvent.id, newEvent);
    await this.updateEventVectorIndex(newEvent);
    await this.publishChange('created', 'event', newEvent.id, newEvent);
    return newEvent;
  }

  async addEvents(events: CalendarEvent[]): Promise<CalendarEvent[]> {
    const added: CalendarEvent[] = [];
    const now = new Date();
    
    for (const event of events) {
      const newEvent: CalendarEvent = {
        ...event,
        createdAt: event.createdAt || now,
        updatedAt: now,
        eventType: event.eventType || 'regular',
      };
      await db.events.setItem(newEvent.id, newEvent);
      await this.updateEventVectorIndex(newEvent);
      added.push(newEvent);
    }
    
    for (const event of added) {
      await this.publishChange('created', 'event', event.id, event);
    }
    return added;
  }

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const existing = await this.getEventById(id);
    if (!existing) return null;

    const updated: CalendarEvent = { 
      ...existing, 
      ...updates, 
      id,
      updatedAt: new Date() 
    };
    await db.events.setItem(id, updated);
    await this.updateEventVectorIndex(updated);
    await this.publishChange('updated', 'event', id, updated);
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const existing = await this.getEventById(id);
    if (!existing) return false;

    await db.events.removeItem(id);
    await this.publishChange('deleted', 'event', id, existing);
    return true;
  }

  async getAllTasks(options?: {
    eventId?: string;
    completed?: boolean;
    priority?: string;
  }): Promise<Task[]> {
    const allTasks = await getAllFromStore<Task>(db.tasks);
    
    return allTasks.filter((task) => {
      let matches = true;
      
      if (options?.eventId) {
        matches = matches && task.eventId === options.eventId;
      }
      
      if (options?.completed !== undefined) {
        matches = matches && task.completed === options.completed;
      }
      
      if (options?.priority) {
        matches = matches && task.priority === options.priority;
      }
      
      return matches;
    }).sort((a, b) => {
      if (a.dueTime && b.dueTime) {
        return a.dueTime.getTime() - b.dueTime.getTime();
      }
      return 0;
    });
  }

  async getTaskById(id: string): Promise<Task | null> {
    return db.tasks.getItem<Task>(id);
  }

  async addTask(task: Task): Promise<Task> {
    const now = new Date();
    const newTask: Task = {
      ...task,
      createdAt: task.createdAt || now,
      updatedAt: now,
    };
    await db.tasks.setItem(newTask.id, newTask);
    await this.updateTaskVectorIndex(newTask);
    await this.publishChange('created', 'task', newTask.id, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.getTaskById(id);
    if (!existing) return null;

    const updated: Task = { 
      ...existing, 
      ...updates, 
      id,
      updatedAt: new Date() 
    };
    await db.tasks.setItem(id, updated);
    await this.updateTaskVectorIndex(updated);
    await this.publishChange('updated', 'task', id, updated);
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    const existing = await this.getTaskById(id);
    if (!existing) return false;

    await db.tasks.removeItem(id);
    await this.publishChange('deleted', 'task', id, existing);
    return true;
  }

  async getAllInspirations(options?: {
    type?: string;
    processed?: boolean;
  }): Promise<Inspiration[]> {
    const allInspirations = await getAllFromStore<Inspiration>(db.inspirations);
    
    return allInspirations.filter((inspiration) => {
      let matches = true;
      
      if (options?.type) {
        matches = matches && inspiration.type === options.type;
      }
      
      if (options?.processed !== undefined) {
        matches = matches && inspiration.processed === options.processed;
      }
      
      return matches;
    }).sort((a, b) => b.captureTime.getTime() - a.captureTime.getTime());
  }

  async getInspirationById(id: string): Promise<Inspiration | null> {
    return db.inspirations.getItem<Inspiration>(id);
  }

  async addInspiration(inspiration: Inspiration): Promise<Inspiration> {
    const now = new Date();
    const newInspiration: Inspiration = {
      ...inspiration,
      captureTime: inspiration.captureTime || now,
    };
    await db.inspirations.setItem(newInspiration.id, newInspiration);
    await this.updateInspirationVectorIndex(newInspiration);
    await this.publishChange('created', 'inspiration', newInspiration.id, newInspiration);
    return newInspiration;
  }

  async updateInspiration(id: string, updates: Partial<Inspiration>): Promise<Inspiration | null> {
    const existing = await this.getInspirationById(id);
    if (!existing) return null;

    const updated: Inspiration = { 
      ...existing, 
      ...updates, 
      id,
    };
    await db.inspirations.setItem(id, updated);
    await this.updateInspirationVectorIndex(updated);
    await this.publishChange('updated', 'inspiration', id, updated);
    return updated;
  }

  async deleteInspiration(id: string): Promise<boolean> {
    const existing = await this.getInspirationById(id);
    if (!existing) return false;

    await db.inspirations.removeItem(id);
    await this.publishChange('deleted', 'inspiration', id, existing);
    return true;
  }

  async getAllSchedules(): Promise<ShiftSchedule[]> {
    return getAllFromStore<ShiftSchedule>(db.schedules);
  }

  async getScheduleById(id: string): Promise<ShiftSchedule | null> {
    return db.schedules.getItem<ShiftSchedule>(id);
  }

  async addSchedule(schedule: ShiftSchedule): Promise<ShiftSchedule> {
    const now = new Date();
    const newSchedule: ShiftSchedule = {
      ...schedule,
      createdAt: schedule.createdAt || now,
      updatedAt: now,
    };
    await db.schedules.setItem(newSchedule.id, newSchedule);
    await this.publishChange('created', 'shiftSchedule', newSchedule.id, newSchedule);
    return newSchedule;
  }

  async updateSchedule(id: string, updates: Partial<ShiftSchedule>): Promise<ShiftSchedule | null> {
    const existing = await this.getScheduleById(id);
    if (!existing) return null;

    const updated: ShiftSchedule = { 
      ...existing, 
      ...updates, 
      id,
      updatedAt: new Date() 
    };
    await db.schedules.setItem(id, updated);
    await this.publishChange('updated', 'shiftSchedule', id, updated);
    return updated;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const existing = await this.getScheduleById(id);
    if (!existing) return false;

    await db.schedules.removeItem(id);
    await this.publishChange('deleted', 'shiftSchedule', id, existing);
    return true;
  }

  async getSettings(): Promise<UserSettings | null> {
    return db.settings.getItem<UserSettings>('current');
  }

  async saveSettings(settings: UserSettings): Promise<UserSettings> {
    await db.settings.setItem('current', settings);
    await this.publishChange('updated', 'settings', 'current', settings);
    return settings;
  }

  async getAIConfig(): Promise<AIConfig | null> {
    return db.settings.getItem<AIConfig>('aiConfig');
  }

  async saveAIConfig(config: AIConfig): Promise<AIConfig> {
    await db.settings.setItem('aiConfig', config);
    await this.publishChange('updated', 'settings', 'aiConfig', config);
    return config;
  }

  async getAllSearchHistory(): Promise<SearchHistory[]> {
    return getAllFromStore<SearchHistory>(db.searchHistory);
  }

  async addSearchHistory(history: SearchHistory): Promise<SearchHistory> {
    await db.searchHistory.setItem(history.id, history);
    await this.publishChange('created', 'searchHistory', history.id, history);
    return history;
  }

  async deleteSearchHistory(id: string): Promise<boolean> {
    const existing = await db.searchHistory.getItem<SearchHistory>(id);
    if (!existing) return false;

    await db.searchHistory.removeItem(id);
    await this.publishChange('deleted', 'searchHistory', id, existing);
    return true;
  }

  async clearAllSearchHistory(): Promise<void> {
    await db.searchHistory.clear();
    await this.publishChange('deleted', 'searchHistory', 'all');
  }
}

export const unifiedDataService = new UnifiedDataService();
