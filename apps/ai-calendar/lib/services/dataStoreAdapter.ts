import { useDataStore } from '../stores/dataStore';
import type { 
  CalendarEvent, 
  Task, 
  Inspiration, 
  ShiftSchedule, 
  UserSettings, 
  SearchHistory 
} from '@/types';

class DataStoreAdapter {
  private getStore() {
    return useDataStore.getState();
  }

  async getAllEvents(options?: {
    dateRange?: { start: Date; end: Date };
    viewMode?: string;
    eventType?: string;
  }): Promise<CalendarEvent[]> {
    const store = this.getStore();
    let events = store.events;
    
    if (options?.dateRange) {
      const { start, end } = options.dateRange;
      events = events.filter((event) => event.startTime < end && event.endTime > start);
    }
    
    if (options?.viewMode) {
      events = events.filter((event) => event.viewMode === options.viewMode);
    }

    if (options?.eventType) {
      events = events.filter((event) => event.eventType === options.eventType);
    }
    
    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getEventById(id: string): Promise<CalendarEvent | null> {
    return this.getStore().getEventById(id) || null;
  }

  async addEvent(event: CalendarEvent): Promise<CalendarEvent> {
    return this.getStore().addEvent(event);
  }

  async addEvents(events: CalendarEvent[]): Promise<CalendarEvent[]> {
    return this.getStore().addEvents(events);
  }

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    return this.getStore().updateEvent(id, updates);
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.getStore().deleteEvent(id);
  }

  async getAllTasks(options?: {
    eventId?: string;
    completed?: boolean;
    priority?: string;
  }): Promise<Task[]> {
    const store = this.getStore();
    let tasks = store.tasks;
    
    if (options?.eventId) {
      tasks = tasks.filter((task) => task.eventId === options.eventId);
    }
    
    if (options?.completed !== undefined) {
      tasks = tasks.filter((task) => task.completed === options.completed);
    }
    
    if (options?.priority) {
      tasks = tasks.filter((task) => task.priority === options.priority);
    }
    
    return tasks.sort((a, b) => {
      if (a.dueTime && b.dueTime) {
        return a.dueTime.getTime() - b.dueTime.getTime();
      }
      return 0;
    });
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.getStore().getTaskById(id) || null;
  }

  async addTask(task: Task): Promise<Task> {
    return this.getStore().addTask(task);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    return this.getStore().updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.getStore().deleteTask(id);
  }

  async getAllInspirations(options?: {
    type?: string;
    processed?: boolean;
  }): Promise<Inspiration[]> {
    const store = this.getStore();
    let inspirations = store.inspirations;
    
    if (options?.type) {
      inspirations = inspirations.filter((i) => i.type === options.type);
    }
    
    if (options?.processed !== undefined) {
      inspirations = inspirations.filter((i) => i.processed === options.processed);
    }
    
    return inspirations.sort((a, b) => b.captureTime.getTime() - a.captureTime.getTime());
  }

  async getInspirationById(id: string): Promise<Inspiration | null> {
    const store = this.getStore();
    return store.inspirations.find((i) => i.id === id) || null;
  }

  async addInspiration(inspiration: Inspiration): Promise<Inspiration> {
    return this.getStore().addInspiration(inspiration);
  }

  async updateInspiration(id: string, updates: Partial<Inspiration>): Promise<Inspiration | null> {
    return this.getStore().updateInspiration(id, updates);
  }

  async deleteInspiration(id: string): Promise<boolean> {
    return this.getStore().deleteInspiration(id);
  }

  async getAllSchedules(): Promise<ShiftSchedule[]> {
    return this.getStore().schedules;
  }

  async getScheduleById(id: string): Promise<ShiftSchedule | null> {
    return this.getStore().getScheduleById(id) || null;
  }

  async addSchedule(schedule: ShiftSchedule): Promise<ShiftSchedule> {
    return this.getStore().addSchedule(schedule);
  }

  async updateSchedule(id: string, updates: Partial<ShiftSchedule>): Promise<ShiftSchedule | null> {
    return this.getStore().updateSchedule(id, updates);
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return this.getStore().deleteSchedule(id);
  }

  async getSettings(): Promise<UserSettings | null> {
    return this.getStore().settings;
  }

  async saveSettings(settings: UserSettings): Promise<UserSettings> {
    await this.getStore().updateSettings(settings);
    return this.getStore().settings!;
  }

  async getAllSearchHistory(): Promise<SearchHistory[]> {
    return this.getStore().searchHistory;
  }

  async addSearchHistory(history: SearchHistory): Promise<SearchHistory> {
    await this.getStore().addSearchHistory(history);
    return history;
  }

  async deleteSearchHistory(id: string): Promise<boolean> {
    const store = this.getStore();
    const history = store.searchHistory.find((h) => h.id === id);
    if (!history) return false;
    
    const newHistory = store.searchHistory.filter((h) => h.id !== id);
    useDataStore.setState({ searchHistory: newHistory });
    return true;
  }

  async clearAllSearchHistory(): Promise<void> {
    await this.getStore().clearSearchHistory();
  }
}

export const dataStoreAdapter = new DataStoreAdapter();
