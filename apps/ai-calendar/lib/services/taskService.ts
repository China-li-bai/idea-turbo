import { v4 as uuidv4 } from 'uuid';
import { db, getAllFromStore } from '@/lib/storage';
import { eventBus } from '@/lib/utils/eventBus';
import { vectorService } from './vectorService';
import type { Task } from '@/types';

export class TaskService {
  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const now = new Date();
    const newTask: Task = {
      ...task,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await db.tasks.setItem(newTask.id, newTask);
    this.updateVectorIndex(newTask).catch(console.error);

    eventBus.publish({
      type: 'created',
      entityType: 'task',
      entityId: newTask.id,
    });

    return newTask;
  }

  async get(id: string): Promise<Task | null> {
    const task = await db.tasks.getItem<Task>(id);
    return task || null;
  }

  async getAll(options?: {
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
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const existingTask = await this.get(id);
    if (!existingTask) {
      throw new Error(`Task not found: ${id}`);
    }

    const now = new Date();
    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      id,
      updatedAt: now,
    };

    await db.tasks.setItem(id, updatedTask);
    this.updateVectorIndex(updatedTask).catch(console.error);

    eventBus.publish({
      type: 'updated',
      entityType: 'task',
      entityId: id,
    });

    return updatedTask;
  }

  async delete(id: string): Promise<void> {
    await db.tasks.removeItem(id);
    vectorService.deleteFromIndex(id).catch(console.error);

    eventBus.publish({
      type: 'deleted',
      entityType: 'task',
      entityId: id,
    });
  }

  async toggleComplete(id: string): Promise<Task> {
    const task = await this.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    const now = new Date();
    return this.update(id, {
      completed: !task.completed,
      completedAt: !task.completed ? now : undefined,
    });
  }

  private async updateVectorIndex(task: Task): Promise<void> {
    const text = `${task.title} ${task.description || ''}`;
    await vectorService.indexDocument('task', task.id, text, {
      completed: task.completed,
      priority: task.priority,
      eventId: task.eventId,
      dueTime: task.dueTime,
    });
  }
}

export const taskService = new TaskService();
