'use client';

import { useState, useEffect, useCallback } from 'react';
import { unifiedDataService } from './unifiedDataService';
import { eventBus } from '../eventBus';
import type { CalendarEvent, Task, Inspiration, ShiftSchedule, UserSettings, SearchHistory } from '@/types';

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const data = await unifiedDataService.getAllEvents();
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.entityType === 'event') {
        loadEvents();
      }
    });

    return unsubscribe;
  }, [loadEvents]);

  return { events, loading, refresh: loadEvents };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const data = await unifiedDataService.getAllTasks();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.entityType === 'task') {
        loadTasks();
      }
    });

    return unsubscribe;
  }, [loadTasks]);

  return { tasks, loading, refresh: loadTasks };
}

export function useInspirations() {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInspirations = useCallback(async () => {
    setLoading(true);
    const data = await unifiedDataService.getAllInspirations();
    setInspirations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInspirations();

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.entityType === 'inspiration') {
        loadInspirations();
      }
    });

    return unsubscribe;
  }, [loadInspirations]);

  return { inspirations, loading, refresh: loadInspirations };
}

export function useSchedules() {
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    const data = await unifiedDataService.getAllSchedules();
    setSchedules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSchedules();

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.entityType === 'schedule') {
        loadSchedules();
      }
    });

    return unsubscribe;
  }, [loadSchedules]);

  return { schedules, loading, refresh: loadSchedules };
}

export function useScheduleById(id?: string) {
  const [schedule, setSchedule] = useState<ShiftSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSchedule = useCallback(async () => {
    if (!id) {
      setSchedule(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const data = await unifiedDataService.getScheduleById(id);
    setSchedule(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadSchedule();

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.entityType === 'schedule' && event.entityId === id) {
        loadSchedule();
      }
    });

    return unsubscribe;
  }, [loadSchedule, id]);

  return { schedule, loading, refresh: loadSchedule };
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const data = await unifiedDataService.getSettings();
    setSettings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.entityType === 'settings' && event.entityId === 'current') {
        loadSettings();
      }
    });

    return unsubscribe;
  }, [loadSettings]);

  return { settings, loading, refresh: loadSettings };
}

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSearchHistory = useCallback(async () => {
    setLoading(true);
    const data = await unifiedDataService.getAllSearchHistory();
    setSearchHistory(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSearchHistory();

    const unsubscribe = eventBus.subscribe((event) => {
      if (event.entityType === 'searchHistory') {
        loadSearchHistory();
      }
    });

    return unsubscribe;
  }, [loadSearchHistory]);

  return { searchHistory, loading, refresh: loadSearchHistory };
}
