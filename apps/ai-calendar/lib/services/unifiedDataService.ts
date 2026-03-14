import { db, getAllFromStore } from '../storage';
import { eventBus } from '../utils/eventBus';
import { vectorService } from './vectorService';
import type { CalendarEvent, Task, Inspiration, ShiftSchedule, UserSettings, SearchHistory } from '@/types';
import type { AIConfig } from '@/lib/ai/types';

export interface DataChangeEvent {
  type: 'created' | 'updated' | 'deleted';
  entityType: 'event' | 'task' | 'inspiration' | 'schedule' | 'settings' | 'searchHistory';
  entityId: string;
  data?: any;
}

class UnifiedDataService {
  private async publishChange(event: DataChangeEvent) {
    eventBus.publish({
      type: event.type as any,
      entityType: event.entityType as any,
      entityId: event.entityId,
      data: event.data,
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
    const newEvent = {
      eventType: 'regular' as const,
      ...event,
      createdAt: event.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    await db.events.setItem(newEvent.id, newEvent);
    await this.updateEventVectorIndex(newEvent);
    await this.publishChange({
      type: 'created',
      entityType: 'event',
      entityId: newEvent.id,
      data: newEvent,
    });
    return newEvent;
  }

  async addEvents(events: CalendarEvent[]): Promise<CalendarEvent[]> {
    const added: CalendarEvent[] = [];
    for (const event of events) {
      const newEvent = {
        eventType: 'regular' as const,
        ...event,
        createdAt: event.createdAt || new Date(),
        updatedAt: new Date(),
      };
      await db.events.setItem(newEvent.id, newEvent);
      await this.updateEventVectorIndex(newEvent);
      added.push(newEvent);
    }
    for (const event of added) {
      await this.publishChange({
        type: 'created',
        entityType: 'event',
        entityId: event.id,
        data: event,
      });
    }
    return added;
  }

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const existing = await this.getEventById(id);
    if (!existing) return null;

    const updated = { 
      ...existing, 
      ...updates, 
      id,
      updatedAt: new Date() 
    };
    await db.events.setItem(id, updated);
    await this.updateEventVectorIndex(updated);
    await this.publishChange({
      type: 'updated',
      entityType: 'event',
      entityId: id,
      data: updated,
    });
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const existing = await this.getEventById(id);
    if (!existing) return false;

    await db.events.removeItem(id);
    await this.publishChange({
      type: 'deleted',
      entityType: 'event',
      entityId: id,
      data: existing,
    });
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
    const newTask = {
      ...task,
      createdAt: task.createdAt || new Date(),
      updatedAt: new Date(),
    };
    await db.tasks.setItem(newTask.id, newTask);
    await this.updateTaskVectorIndex(newTask);
    await this.publishChange({
      type: 'created',
      entityType: 'task',
      entityId: newTask.id,
      data: newTask,
    });
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.getTaskById(id);
    if (!existing) return null;

    const updated = { 
      ...existing, 
      ...updates, 
      id,
      updatedAt: new Date() 
    };
    await db.tasks.setItem(id, updated);
    await this.updateTaskVectorIndex(updated);
    await this.publishChange({
      type: 'updated',
      entityType: 'task',
      entityId: id,
      data: updated,
    });
    return updated;
  }

  async deleteTask(id: string): Promise<boolean> {
    const existing = await this.getTaskById(id);
    if (!existing) return false;

    await db.tasks.removeItem(id);
    await this.publishChange({
      type: 'deleted',
      entityType: 'task',
      entityId: id,
      data: existing,
    });
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
    const newInspiration = {
      ...inspiration,
      createdAt: inspiration.createdAt || new Date(),
      updatedAt: new Date(),
    };
    await db.inspirations.setItem(newInspiration.id, newInspiration);
    await this.updateInspirationVectorIndex(newInspiration);
    await this.publishChange({
      type: 'created',
      entityType: 'inspiration',
      entityId: newInspiration.id,
      data: newInspiration,
    });
    return newInspiration;
  }

  async updateInspiration(id: string, updates: Partial<Inspiration>): Promise<Inspiration | null> {
    const existing = await this.getInspirationById(id);
    if (!existing) return null;

    const updated = { 
      ...existing, 
      ...updates, 
      id,
      updatedAt: new Date() 
    };
    await db.inspirations.setItem(id, updated);
    await this.updateInspirationVectorIndex(updated);
    await this.publishChange({
      type: 'updated',
      entityType: 'inspiration',
      entityId: id,
      data: updated,
    });
    return updated;
  }

  async deleteInspiration(id: string): Promise<boolean> {
    const existing = await this.getInspirationById(id);
    if (!existing) return false;

    await db.inspirations.removeItem(id);
    await this.publishChange({
      type: 'deleted',
      entityType: 'inspiration',
      entityId: id,
      data: existing,
    });
    return true;
  }

  async getAllSchedules(): Promise<ShiftSchedule[]> {
    return getAllFromStore<ShiftSchedule>(db.schedules);
  }

  async getScheduleById(id: string): Promise<ShiftSchedule | null> {
    return db.schedules.getItem<ShiftSchedule>(id);
  }

  async addSchedule(schedule: ShiftSchedule): Promise<ShiftSchedule> {
    const newSchedule = {
      ...schedule,
      createdAt: schedule.createdAt || new Date(),
      updatedAt: new Date(),
    };
    await db.schedules.setItem(newSchedule.id, newSchedule);
    await this.publishChange({
      type: 'created',
      entityType: 'schedule',
      entityId: newSchedule.id,
      data: newSchedule,
    });
    return newSchedule;
  }

  async updateSchedule(id: string, updates: Partial<ShiftSchedule>): Promise<ShiftSchedule | null> {
    const existing = await this.getScheduleById(id);
    if (!existing) return null;

    const updated = { 
      ...existing, 
      ...updates, 
      id,
      updatedAt: new Date() 
    };
    await db.schedules.setItem(id, updated);
    await this.publishChange({
      type: 'updated',
      entityType: 'schedule',
      entityId: id,
      data: updated,
    });
    return updated;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const existing = await this.getScheduleById(id);
    if (!existing) return false;

    await db.schedules.removeItem(id);
    await this.publishChange({
      type: 'deleted',
      entityType: 'schedule',
      entityId: id,
      data: existing,
    });
    return true;
  }

  async getSettings(): Promise<UserSettings | null> {
    return db.settings.getItem<UserSettings>('current');
  }

  async saveSettings(settings: UserSettings): Promise<UserSettings> {
    await db.settings.setItem('current', settings);
    await this.publishChange({
      type: 'updated',
      entityType: 'settings',
      entityId: 'current',
      data: settings,
    });
    return settings;
  }

  async getAIConfig(): Promise<AIConfig | null> {
    return db.settings.getItem<AIConfig>('aiConfig');
  }

  async saveAIConfig(config: AIConfig): Promise<AIConfig> {
    await db.settings.setItem('aiConfig', config);
    await this.publishChange({
      type: 'updated',
      entityType: 'settings',
      entityId: 'aiConfig',
      data: config,
    });
    return config;
  }

  async getAllSearchHistory(): Promise<SearchHistory[]> {
    return getAllFromStore<SearchHistory>(db.searchHistory);
  }

  async addSearchHistory(history: SearchHistory): Promise<SearchHistory> {
    await db.searchHistory.setItem(history.id, history);
    await this.publishChange({
      type: 'created',
      entityType: 'searchHistory',
      entityId: history.id,
      data: history,
    });
    return history;
  }

  async deleteSearchHistory(id: string): Promise<boolean> {
    const existing = await db.searchHistory.getItem<SearchHistory>(id);
    if (!existing) return false;

    await db.searchHistory.removeItem(id);
    await this.publishChange({
      type: 'deleted',
      entityType: 'searchHistory',
      entityId: id,
      data: existing,
    });
    return true;
  }

  async clearAllSearchHistory(): Promise<void> {
    await db.searchHistory.clear();
    await this.publishChange({
      type: 'deleted',
      entityType: 'searchHistory',
      entityId: 'all',
    });
  }
}

export const unifiedDataService = new UnifiedDataService();
