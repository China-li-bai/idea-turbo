import { useState, useEffect, useCallback } from 'react';
import { taskService } from '@/lib/services';
import { eventBus } from '@/lib/utils/eventBus';
import type { Task } from '@/types';

interface UseTasksOptions {
  eventId?: string;
  completed?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export function useTasks(options?: UseTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await taskService.getAll(options);
      setTasks(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(options)]);

  useEffect(() => {
    loadTasks();

    const unsubscribe = eventBus.subscribe('task', () => {
      loadTasks();
    });

    return unsubscribe;
  }, [loadTasks]);

  return { tasks, isLoading, error, refresh: loadTasks };
}
