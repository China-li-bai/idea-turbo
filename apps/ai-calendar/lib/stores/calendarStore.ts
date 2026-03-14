import { create } from 'zustand';
import { unifiedDataService } from '@/lib/services/unifiedDataService';
import { useEvents, useTasks, useInspirations, useSettings } from '@/lib/hooks/useUnifiedData';
import type { CalendarEvent, UserSettings, Inspiration, Task } from '@/types';

interface CalendarStoreState {
  addEvent: (event: CalendarEvent) => Promise<void>;
  addEvents: (events: CalendarEvent[]) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  addInspiration: (inspiration: Inspiration) => Promise<void>;
  updateInspiration: (id: string, inspiration: Partial<Inspiration>) => Promise<void>;
  deleteInspiration: (id: string) => Promise<void>;
  processInspiration: (id: string) => Promise<void>;
  
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  
  setViewMode: (mode: 'boss' | 'assistant' | 'personal') => Promise<void>;
}

export const useCalendarStore = create<CalendarStoreState>()(() => ({
  addEvent: async (event) => {
    await unifiedDataService.addEvent({
      ...event,
      eventType: event.eventType || 'regular',
    });
  },
  
  addEvents: async (newEvents) => {
    await unifiedDataService.addEvents(
      newEvents.map(e => ({ ...e, eventType: e.eventType || 'regular' }))
    );
  },
  
  updateEvent: async (id, eventUpdate) => {
    await unifiedDataService.updateEvent(id, eventUpdate);
  },
  
  deleteEvent: async (id) => {
    await unifiedDataService.deleteEvent(id);
  },
  
  addInspiration: async (inspiration) => {
    await unifiedDataService.addInspiration(inspiration);
  },
  
  updateInspiration: async (id, inspirationUpdate) => {
    await unifiedDataService.updateInspiration(id, inspirationUpdate);
  },
  
  deleteInspiration: async (id) => {
    await unifiedDataService.deleteInspiration(id);
  },
  
  processInspiration: async (id) => {
    await unifiedDataService.updateInspiration(id, { processed: true });
  },
  
  addTask: async (task) => {
    await unifiedDataService.addTask(task);
  },
  
  updateTask: async (id, taskUpdate) => {
    await unifiedDataService.updateTask(id, taskUpdate);
  },
  
  deleteTask: async (id) => {
    await unifiedDataService.deleteTask(id);
  },
  
  toggleTaskComplete: async (id) => {
    const task = await unifiedDataService.getTaskById(id);
    if (task) {
      await unifiedDataService.updateTask(id, { completed: !task.completed });
    }
  },
  
  setViewMode: async (mode) => {
    const settings = await unifiedDataService.getSettings();
    if (settings) {
      await unifiedDataService.saveSettings({ ...settings, viewMode: mode });
    }
  },
}));

export { useEvents, useTasks, useInspirations, useSettings };
