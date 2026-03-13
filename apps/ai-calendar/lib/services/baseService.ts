import { v4 as uuidv4 } from 'uuid';

export abstract class BaseService<T extends { id: string }> {
  protected storeName: string;

  constructor(storeName: string) {
    this.storeName = storeName;
  }

  protected generateId(): string {
    return uuidv4();
  }

  protected getNow(): Date {
    return new Date();
  }

  abstract create(item: Omit<T, 'id'>): Promise<T>;
  abstract get(id: string): Promise<T | null>;
  abstract getAll(options?: any): Promise<T[]>;
  abstract update(id: string, updates: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
