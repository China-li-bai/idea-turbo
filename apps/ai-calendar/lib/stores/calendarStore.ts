import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { CalendarEvent, UserSettings, Inspiration, Task } from '@/types';

localforage.config({
  name: 'ai-calendar',
  storeName: 'calendar-data',
});

const forageStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await localforage.getItem<string>(name);
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name);
  },
};

interface CalendarState {
  events: CalendarEvent[];
  inspirations: Inspiration[];
  tasks: Task[];
  settings: UserSettings;
  
  addEvent: (event: CalendarEvent) => void;
  addEvents: (events: CalendarEvent[]) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  
  addInspiration: (inspiration: Inspiration) => void;
  updateInspiration: (id: string, inspiration: Partial<Inspiration>) => void;
  deleteInspiration: (id: string) => void;
  processInspiration: (id: string) => void;
  
  addTask: (task: Task) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  
  setViewMode: (mode: 'boss' | 'assistant' | 'personal') => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      inspirations: [],
      tasks: [],
      settings: {
        viewMode: 'personal',
        firstDayOfWeek: 1,
        theme: 'system',
        language: 'zh-CN',
      },
      
      addEvent: (event) =>
        set((state) => ({ 
          events: [...state.events, { eventType: 'regular', ...event }] 
        })),
      
      addEvents: (newEvents) =>
        set((state) => ({ 
          events: [...state.events, ...newEvents.map(e => ({ eventType: 'regular', ...e }))] 
        })),
      
      updateEvent: (id, eventUpdate) =>
        set((state) => ({
          events: state.events.map((e) =>
            e.id === id ? { ...e, ...eventUpdate } : e
          ),
        })),
      
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),
      
      addInspiration: (inspiration) =>
        set((state) => ({ inspirations: [...state.inspirations, inspiration] })),
      
      updateInspiration: (id, inspirationUpdate) =>
        set((state) => ({
          inspirations: state.inspirations.map((i) =>
            i.id === id ? { ...i, ...inspirationUpdate } : i
          ),
        })),
      
      deleteInspiration: (id) =>
        set((state) => ({
          inspirations: state.inspirations.filter((i) => i.id !== id),
        })),
      
      processInspiration: (id) =>
        set((state) => ({
          inspirations: state.inspirations.map((i) =>
            i.id === id ? { ...i, processed: true } : i
          ),
        })),
      
      addTask: (task) =>
        set((state) => ({ tasks: [...state.tasks, task] })),
      
      updateTask: (id, taskUpdate) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...taskUpdate } : t
          ),
        })),
      
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),
      
      toggleTaskComplete: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          ),
        })),
      
      setViewMode: (mode) =>
        set((state) => ({
          settings: { ...state.settings, viewMode: mode },
        })),
    }),
    {
      name: 'ai-calendar-storage',
      storage: createJSONStorage(() => forageStorage),
    }
  )
);
