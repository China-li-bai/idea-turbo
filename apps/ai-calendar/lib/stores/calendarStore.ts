'use client';

import { useDataStore } from './dataStore';
import type { CalendarEvent, Inspiration, Task } from '@/types';

export const useCalendarStore = () => {
  const addEvent = useDataStore((state) => state.addEvent);
  const addEvents = useDataStore((state) => state.addEvents);
  const updateEvent = useDataStore((state) => state.updateEvent);
  const deleteEvent = useDataStore((state) => state.deleteEvent);
  
  const addInspiration = useDataStore((state) => state.addInspiration);
  const updateInspiration = useDataStore((state) => state.updateInspiration);
  const deleteInspiration = useDataStore((state) => state.deleteInspiration);
  const processInspiration = useDataStore((state) => state.processInspiration);
  
  const addTask = useDataStore((state) => state.addTask);
  const updateTask = useDataStore((state) => state.updateTask);
  const deleteTask = useDataStore((state) => state.deleteTask);
  const toggleTaskComplete = useDataStore((state) => state.toggleTaskComplete);
  
  const updateSettings = useDataStore((state) => state.updateSettings);

  return {
    addEvent,
    addEvents,
    updateEvent,
    deleteEvent,
    
    addInspiration,
    updateInspiration,
    deleteInspiration,
    processInspiration,
    
    addTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    
    setViewMode: async (mode: 'boss' | 'assistant' | 'personal') => {
      await updateSettings({ viewMode: mode });
    },
  };
};
