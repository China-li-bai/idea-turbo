import { dataStoreAdapter } from './dataStoreAdapter';
import type { Inspiration } from '@/types';

export class InspirationService {
  async create(inspiration: Omit<Inspiration, 'id' | 'captureTime'>): Promise<Inspiration> {
    const id = crypto.randomUUID();
    const newInspiration: Inspiration = {
      ...inspiration,
      id,
      captureTime: new Date(),
    };
    return dataStoreAdapter.addInspiration(newInspiration);
  }

  async get(id: string): Promise<Inspiration | null> {
    return dataStoreAdapter.getInspirationById(id);
  }

  async getAll(options?: {
    processed?: boolean;
    type?: string;
  }): Promise<Inspiration[]> {
    return dataStoreAdapter.getAllInspirations(options);
  }

  async update(id: string, updates: Partial<Inspiration>): Promise<Inspiration> {
    const result = await dataStoreAdapter.updateInspiration(id, updates);
    if (!result) {
      throw new Error(`Inspiration not found: ${id}`);
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    await dataStoreAdapter.deleteInspiration(id);
  }

  async markProcessed(id: string, conversionData?: {
    convertedToEventId?: string;
    convertedToTaskId?: string;
    conversionNotes?: string;
  }): Promise<Inspiration> {
    return this.update(id, {
      processed: true,
      processedAt: new Date(),
      ...conversionData,
    });
  }
}

export const inspirationService = new InspirationService();
