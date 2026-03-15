'use client';

import { useDataStore } from '../stores/dataStore';
import type { CalendarEvent, Task, Inspiration, ShiftSchedule, UserSettings, SearchHistory } from '@/types';

export function useEvents() {
  const events = useDataStore((state) => state.events);
  const loading = useDataStore((state) => state._loading);
  const addEvent = useDataStore((state) => state.addEvent);
  const addEvents = useDataStore((state) => state.addEvents);
  const updateEvent = useDataStore((state) => state.updateEvent);
  const deleteEvent = useDataStore((state) => state.deleteEvent);
  const getEventById = useDataStore((state) => state.getEventById);

  return { 
    events, 
    loading, 
    addEvent, 
    addEvents, 
    updateEvent, 
    deleteEvent,
    getEventById,
  };
}

export function useTasks() {
  const tasks = useDataStore((state) => state.tasks);
  const loading = useDataStore((state) => state._loading);
  const addTask = useDataStore((state) => state.addTask);
  const updateTask = useDataStore((state) => state.updateTask);
  const deleteTask = useDataStore((state) => state.deleteTask);
  const getTaskById = useDataStore((state) => state.getTaskById);
  const toggleTaskComplete = useDataStore((state) => state.toggleTaskComplete);

  return { 
    tasks, 
    loading, 
    addTask, 
    updateTask, 
    deleteTask,
    getTaskById,
    toggleTaskComplete,
  };
}

export function useInspirations() {
  const inspirations = useDataStore((state) => state.inspirations);
  const loading = useDataStore((state) => state._loading);
  const addInspiration = useDataStore((state) => state.addInspiration);
  const updateInspiration = useDataStore((state) => state.updateInspiration);
  const deleteInspiration = useDataStore((state) => state.deleteInspiration);
  const processInspiration = useDataStore((state) => state.processInspiration);

  return { 
    inspirations, 
    loading, 
    addInspiration, 
    updateInspiration, 
    deleteInspiration,
    processInspiration,
  };
}

export function useSchedules() {
  const schedules = useDataStore((state) => state.schedules);
  const loading = useDataStore((state) => state._loading);
  const addSchedule = useDataStore((state) => state.addSchedule);
  const updateSchedule = useDataStore((state) => state.updateSchedule);
  const deleteSchedule = useDataStore((state) => state.deleteSchedule);
  const getScheduleById = useDataStore((state) => state.getScheduleById);

  return { 
    schedules, 
    loading, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule,
    getScheduleById,
  };
}

export function useScheduleById(id?: string) {
  const schedule = useDataStore((state) => 
    id ? state.schedules.find((s: ShiftSchedule) => s.id === id) : undefined
  );
  const loading = useDataStore((state) => state._loading);

  return { schedule, loading };
}

export function useSettings() {
  const settings = useDataStore((state) => state.settings);
  const loading = useDataStore((state) => state._loading);
  const updateSettings = useDataStore((state) => state.updateSettings);

  return { settings, loading, updateSettings };
}

export function useSearchHistory() {
  const searchHistory = useDataStore((state) => state.searchHistory);
  const loading = useDataStore((state) => state._loading);
  const addSearchHistory = useDataStore((state) => state.addSearchHistory);
  const clearSearchHistory = useDataStore((state) => state.clearSearchHistory);

  return { 
    searchHistory, 
    loading, 
    addSearchHistory, 
    clearSearchHistory,
  };
}

export function useDataInitialization() {
  const initialize = useDataStore((state) => state.initialize);
  const initialized = useDataStore((state) => state._initialized);
  const loading = useDataStore((state) => state._loading);

  return { initialize, initialized, loading };
}

export { useDataStore } from '../stores/dataStore';
