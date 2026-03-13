import { v4 as uuidv4 } from 'uuid';
import { db, getAllFromStore } from '@/lib/storage';
import { eventBus } from '@/lib/utils/eventBus';
import { vectorService } from './vectorService';
import type { Inspiration } from '@/types';

export class InspirationService {
  async create(inspiration: Omit<Inspiration, 'id' | 'captureTime'>): Promise<Inspiration> {
    const newInspiration: Inspiration = {
      ...inspiration,
      id: uuidv4(),
      captureTime: new Date(),
    };

    await db.inspirations.setItem(newInspiration.id, newInspiration);
    this.updateVectorIndex(newInspiration).catch(console.error);

    eventBus.publish({
      type: 'created',
      entityType: 'inspiration',
      entityId: newInspiration.id,
    });

    return newInspiration;
  }

  async get(id: string): Promise<Inspiration | null> {
    const inspiration = await db.inspirations.getItem<Inspiration>(id);
    return inspiration || null;
  }

  async getAll(options?: {
    processed?: boolean;
    type?: string;
  }): Promise<Inspiration[]> {
    const allInspirations = await getAllFromStore<Inspiration>(db.inspirations);
    
    return allInspirations.filter((inspiration) => {
      let matches = true;
      
      if (options?.processed !== undefined) {
        matches = matches && inspiration.processed === options.processed;
      }
      
      if (options?.type) {
        matches = matches && inspiration.type === options.type;
      }
      
      return matches;
    }).sort((a, b) => b.captureTime.getTime() - a.captureTime.getTime());
  }

  async update(id: string, updates: Partial<Inspiration>): Promise<Inspiration> {
    const existingInspiration = await this.get(id);
    if (!existingInspiration) {
      throw new Error(`Inspiration not found: ${id}`);
    }

    const updatedInspiration: Inspiration = {
      ...existingInspiration,
      ...updates,
      id,
    };

    await db.inspirations.setItem(id, updatedInspiration);
    this.updateVectorIndex(updatedInspiration).catch(console.error);

    eventBus.publish({
      type: 'updated',
      entityType: 'inspiration',
      entityId: id,
    });

    return updatedInspiration;
  }

  async delete(id: string): Promise<void> {
    await db.inspirations.removeItem(id);
    vectorService.deleteFromIndex(id).catch(console.error);

    eventBus.publish({
      type: 'deleted',
      entityType: 'inspiration',
      entityId: id,
    });
  }

  async process(id: string): Promise<Inspiration> {
    return this.update(id, {
      processed: true,
      processedAt: new Date(),
    });
  }

  private async updateVectorIndex(inspiration: Inspiration): Promise<void> {
    await vectorService.indexDocument('inspiration', inspiration.id, inspiration.content, {
      type: inspiration.type,
      processed: inspiration.processed,
      captureTime: inspiration.captureTime,
      extractedDate: inspiration.extractedDate,
    });
  }
}

export const inspirationService = new InspirationService();
