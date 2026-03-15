import { dataStoreAdapter } from './dataStoreAdapter';
import type { Task } from '@/types';

export class TaskService {
  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newTask: Task = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now,
    };
    return dataStoreAdapter.addTask(newTask);
  }

  async get(id: string): Promise<Task | null> {
    return dataStoreAdapter.getTaskById(id);
  }

  async getAll(options?: {
    eventId?: string;
    completed?: boolean;
    priority?: string;
  }): Promise<Task[]> {
    return dataStoreAdapter.getAllTasks(options);
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const result = await dataStoreAdapter.updateTask(id, updates);
    if (!result) {
      throw new Error(`Task not found: ${id}`);
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    await dataStoreAdapter.deleteTask(id);
  }

  async toggleComplete(id: string): Promise<Task> {
    const task = await this.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }
    return this.update(id, { 
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : undefined,
    });
  }
}

export const taskService = new TaskService();
