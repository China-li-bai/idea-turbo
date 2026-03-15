'use client';

import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { 
  CalendarEvent, 
  Task, 
  Inspiration, 
  ShiftSchedule, 
  UserSettings, 
  SearchHistory 
} from '@/types';
import { vectorService } from '../services/vectorService';

localforage.config({
  name: 'ai-calendar',
  version: 1.0,
  storeName: 'zustand_store',
});

const createIndexedDBStorage = (storeName: string): StateStorage => ({
  getItem: async (name: string): Promise<string | null> => {
    const store = localforage.createInstance({ name: 'ai-calendar', storeName });
    return store.getItem<string>(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const store = localforage.createInstance({ name: 'ai-calendar', storeName });
    await store.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    const store = localforage.createInstance({ name: 'ai-calendar', storeName });
    await store.removeItem(name);
  },
});

interface DataState {
  events: CalendarEvent[];
  tasks: Task[];
  inspirations: Inspiration[];
  schedules: ShiftSchedule[];
  settings: UserSettings | null;
  searchHistory: SearchHistory[];
  
  _initialized: boolean;
  _loading: boolean;
}

interface DataActions {
  initialize: () => Promise<void>;
  
  addEvent: (event: CalendarEvent) => Promise<CalendarEvent>;
  addEvents: (events: CalendarEvent[]) => Promise<CalendarEvent[]>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<CalendarEvent | null>;
  deleteEvent: (id: string) => Promise<boolean>;
  getEventById: (id: string) => CalendarEvent | undefined;
  
  addTask: (task: Task) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  getTaskById: (id: string) => Task | undefined;
  toggleTaskComplete: (id: string) => Promise<void>;
  
  addInspiration: (inspiration: Inspiration) => Promise<Inspiration>;
  updateInspiration: (id: string, updates: Partial<Inspiration>) => Promise<Inspiration | null>;
  deleteInspiration: (id: string) => Promise<boolean>;
  processInspiration: (id: string) => Promise<void>;
  
  addSchedule: (schedule: ShiftSchedule) => Promise<ShiftSchedule>;
  updateSchedule: (id: string, updates: Partial<ShiftSchedule>) => Promise<ShiftSchedule | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  getScheduleById: (id: string) => ShiftSchedule | undefined;
  
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  
  addSearchHistory: (history: SearchHistory) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  
  setLoading: (loading: boolean) => void;
}

type DataStore = DataState & DataActions;

const defaultSettings: UserSettings = {
  viewMode: 'personal',
  defaultCalendarView: 'week',
  firstDayOfWeek: 1,
  showWeekends: true,
  workingHours: { start: '09:00', end: '18:00' },
  theme: 'system',
  accentColor: '#3B82F6',
  language: 'zh-CN',
  defaultReminders: [15],
  reminderSound: true,
  reminderNotification: true,
  aiMode: 'local-only',
  vectorSearchEnabled: true,
  autoSyncEmbeddings: true,
  embeddingModel: 'local',
  autoBackup: false,
  backupFrequency: 'weekly',
};

export const useDataStore = create<DataStore>()(
  persist(
    (set, get) => ({
      events: [],
      tasks: [],
      inspirations: [],
      schedules: [],
      settings: null,
      searchHistory: [],
      _initialized: false,
      _loading: false,

      initialize: async () => {
        if (get()._initialized) return;
        set({ _loading: true });
        
        const state = get();
        if (!state.settings) {
          set({ settings: defaultSettings });
        }
        
        set({ _initialized: true, _loading: false });
      },

      addEvent: async (event) => {
        const now = new Date();
        const newEvent: CalendarEvent = {
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          isAllDay: event.isAllDay ?? false,
          reminders: event.reminders ?? [],
          viewMode: event.viewMode ?? 'personal',
          createdAt: event.createdAt ?? now,
          updatedAt: now,
          eventType: event.eventType ?? 'regular',
          description: event.description,
          location: event.location,
          repeatRule: event.repeatRule,
          linkedEventId: event.linkedEventId,
          linkedTaskIds: event.linkedTaskIds,
          vectorId: event.vectorId,
          embeddingUpdatedAt: event.embeddingUpdatedAt,
          color: event.color,
          shiftMetadata: event.shiftMetadata,
        };
        
        try {
          await vectorService.indexEvent(newEvent);
        } catch (error) {
          console.error('Failed to index event:', error);
        }
        
        set((state) => ({
          events: [...state.events, newEvent],
        }));
        
        return newEvent;
      },

      addEvents: async (events) => {
        const now = new Date();
        const newEvents: CalendarEvent[] = events.map((event) => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          isAllDay: event.isAllDay ?? false,
          reminders: event.reminders ?? [],
          viewMode: event.viewMode ?? 'personal',
          createdAt: event.createdAt ?? now,
          updatedAt: now,
          eventType: event.eventType ?? 'regular',
          description: event.description,
          location: event.location,
          repeatRule: event.repeatRule,
          linkedEventId: event.linkedEventId,
          linkedTaskIds: event.linkedTaskIds,
          vectorId: event.vectorId,
          embeddingUpdatedAt: event.embeddingUpdatedAt,
          color: event.color,
          shiftMetadata: event.shiftMetadata,
        }));
        
        for (const event of newEvents) {
          try {
            await vectorService.indexEvent(event);
          } catch (error) {
            console.error('Failed to index event:', error);
          }
        }
        
        set((state) => ({
          events: [...state.events, ...newEvents],
        }));
        
        return newEvents;
      },

      updateEvent: async (id, updates) => {
        const state = get();
        const existing = state.events.find((e) => e.id === id);
        if (!existing) return null;

        const updated: CalendarEvent = {
          ...existing,
          ...updates,
          id,
          updatedAt: new Date(),
        };
        
        try {
          await vectorService.indexEvent(updated);
        } catch (error) {
          console.error('Failed to update event index:', error);
        }
        
        set((state) => ({
          events: state.events.map((e) => (e.id === id ? updated : e)),
        }));
        
        return updated;
      },

      deleteEvent: async (id) => {
        const state = get();
        const existing = state.events.find((e) => e.id === id);
        if (!existing) return false;

        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        }));
        
        return true;
      },

      getEventById: (id) => {
        return get().events.find((e) => e.id === id);
      },

      addTask: async (task) => {
        const now = new Date();
        const newTask: Task = {
          id: task.id,
          title: task.title,
          completed: task.completed ?? false,
          priority: task.priority ?? 'medium',
          createdAt: task.createdAt ?? now,
          updatedAt: now,
          eventId: task.eventId,
          description: task.description,
          dueTime: task.dueTime,
          completedAt: task.completedAt,
          resources: task.resources,
          dependsOnTaskIds: task.dependsOnTaskIds,
          vectorId: task.vectorId,
          embeddingUpdatedAt: task.embeddingUpdatedAt,
        };
        
        try {
          await vectorService.indexTask(newTask);
        } catch (error) {
          console.error('Failed to index task:', error);
        }
        
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        
        return newTask;
      },

      updateTask: async (id, updates) => {
        const state = get();
        const existing = state.tasks.find((t) => t.id === id);
        if (!existing) return null;

        const updated: Task = {
          ...existing,
          ...updates,
          id,
          updatedAt: new Date(),
        };
        
        try {
          await vectorService.indexTask(updated);
        } catch (error) {
          console.error('Failed to update task index:', error);
        }
        
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        }));
        
        return updated;
      },

      deleteTask: async (id) => {
        const state = get();
        const existing = state.tasks.find((t) => t.id === id);
        if (!existing) return false;

        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
        
        return true;
      },

      getTaskById: (id) => {
        return get().tasks.find((t) => t.id === id);
      },

      toggleTaskComplete: async (id) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        
        await get().updateTask(id, { 
          completed: !task.completed,
          completedAt: !task.completed ? new Date() : undefined,
        });
      },

      addInspiration: async (inspiration) => {
        const now = new Date();
        const newInspiration: Inspiration = {
          id: inspiration.id,
          content: inspiration.content,
          captureTime: inspiration.captureTime ?? now,
          type: inspiration.type ?? 'raw',
          processed: inspiration.processed ?? false,
          createdAt: inspiration.createdAt ?? now,
          updatedAt: now,
          processedAt: inspiration.processedAt,
          extractedDate: inspiration.extractedDate,
          extractedTime: inspiration.extractedTime,
          extractedLocation: inspiration.extractedLocation,
          extractedPeople: inspiration.extractedPeople,
          convertedToEventId: inspiration.convertedToEventId,
          convertedToTaskId: inspiration.convertedToTaskId,
          conversionNotes: inspiration.conversionNotes,
          vectorId: inspiration.vectorId,
          embeddingUpdatedAt: inspiration.embeddingUpdatedAt,
          source: inspiration.source,
        };
        
        try {
          await vectorService.indexInspiration(newInspiration);
        } catch (error) {
          console.error('Failed to index inspiration:', error);
        }
        
        set((state) => ({
          inspirations: [newInspiration, ...state.inspirations],
        }));
        
        return newInspiration;
      },

      updateInspiration: async (id, updates) => {
        const state = get();
        const existing = state.inspirations.find((i) => i.id === id);
        if (!existing) return null;

        const updated: Inspiration = {
          ...existing,
          ...updates,
          id,
          updatedAt: new Date(),
        };
        
        try {
          await vectorService.indexInspiration(updated);
        } catch (error) {
          console.error('Failed to update inspiration index:', error);
        }
        
        set((state) => ({
          inspirations: state.inspirations.map((i) => (i.id === id ? updated : i)),
        }));
        
        return updated;
      },

      deleteInspiration: async (id) => {
        const state = get();
        const existing = state.inspirations.find((i) => i.id === id);
        if (!existing) return false;

        set((state) => ({
          inspirations: state.inspirations.filter((i) => i.id !== id),
        }));
        
        return true;
      },

      processInspiration: async (id) => {
        await get().updateInspiration(id, { 
          processed: true, 
          processedAt: new Date() 
        });
      },

      addSchedule: async (schedule) => {
        const now = new Date();
        const newSchedule: ShiftSchedule = {
          id: schedule.id,
          name: schedule.name,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          employees: schedule.employees ?? [],
          shiftTypes: schedule.shiftTypes ?? [],
          shifts: schedule.shifts ?? [],
          rules: schedule.rules ?? [],
          createdAt: schedule.createdAt ?? now,
          updatedAt: now,
          description: schedule.description,
          generatedBy: schedule.generatedBy,
        };
        
        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));
        
        return newSchedule;
      },

      updateSchedule: async (id, updates) => {
        const state = get();
        const existing = state.schedules.find((s) => s.id === id);
        if (!existing) return null;

        const updated: ShiftSchedule = {
          ...existing,
          ...updates,
          id,
          updatedAt: new Date(),
        };
        
        set((state) => ({
          schedules: state.schedules.map((s) => (s.id === id ? updated : s)),
        }));
        
        return updated;
      },

      deleteSchedule: async (id) => {
        const state = get();
        const existing = state.schedules.find((s) => s.id === id);
        if (!existing) return false;

        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        }));
        
        return true;
      },

      getScheduleById: (id) => {
        return get().schedules.find((s) => s.id === id);
      },

      updateSettings: async (settingsUpdate) => {
        set((state) => ({
          settings: state.settings 
            ? { ...state.settings, ...settingsUpdate }
            : { ...defaultSettings, ...settingsUpdate },
        }));
      },

      addSearchHistory: async (history) => {
        set((state) => ({
          searchHistory: [history, ...state.searchHistory].slice(0, 100),
        }));
      },

      clearSearchHistory: async () => {
        set({ searchHistory: [] });
      },

      setLoading: (loading) => {
        set({ _loading: loading });
      },
    }),
    {
      name: 'ai-calendar-data',
      storage: createJSONStorage(() => createIndexedDBStorage('data')),
      partialize: (state) => ({
        events: state.events,
        tasks: state.tasks,
        inspirations: state.inspirations,
        schedules: state.schedules,
        settings: state.settings,
        searchHistory: state.searchHistory,
      }),
    }
  )
);

export type { DataState, DataActions, DataStore };
