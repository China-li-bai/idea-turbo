import { oramaSearchService } from './oramaSearchService';
import type { SearchResult, CalendarEvent, Task, Inspiration } from '@/types';

type EntityType = 'event' | 'task' | 'inspiration';

class VectorService {
  private initialized = false;

  async initialize(progressCallback?: (current: number, total: number, message?: string) => void): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing VectorService with Orama + BGE...');
    
    await oramaSearchService.initialize(progressCallback);
    this.initialized = true;
    
    console.log('VectorService initialized successfully');
  }

  async indexEvent(event: CalendarEvent): Promise<void> {
    await this.initialize();
    await oramaSearchService.indexEvent(event);
  }

  async indexTask(task: Task): Promise<void> {
    await this.initialize();
    await oramaSearchService.indexTask(task);
  }

  async indexInspiration(inspiration: Inspiration): Promise<void> {
    await this.initialize();
    await oramaSearchService.indexInspiration(inspiration);
  }

  async indexDocument(
    type: EntityType,
    id: string,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    await this.initialize();
    return oramaSearchService.indexDocument(type, id, text, metadata);
  }

  async indexDocuments(
    documents: Array<{ type: EntityType; id: string; text: string; metadata?: Record<string, unknown> }>,
    progressCallback?: (current: number, total: number) => void
  ): Promise<string[]> {
    await this.initialize();
    return oramaSearchService.indexDocuments(documents, progressCallback);
  }

  async search(
    query: string,
    options?: {
      k?: number;
      similarity?: number;
      filters?: {
        types?: EntityType[];
        dateRange?: { start: Date; end: Date };
      };
    }
  ): Promise<SearchResult[]> {
    await this.initialize();
    return oramaSearchService.search(query, options);
  }

  async hybridSearch(
    query: string,
    options?: {
      k?: number;
      similarity?: number;
      filters?: {
        types?: EntityType[];
        dateRange?: { start: Date; end: Date };
      };
    }
  ): Promise<SearchResult[]> {
    await this.initialize();
    return oramaSearchService.hybridSearch(query, options);
  }

  async deleteFromIndex(id: string): Promise<void> {
    await this.initialize();
    await oramaSearchService.deleteFromIndex(id);
  }

  async syncAll(): Promise<void> {
    await this.initialize();
    console.log('Syncing all documents...');
    const stats = this.getStats();
    console.log(`Total indexed documents: ${stats.totalDocuments}`);
  }

  async saveIndex(name: string = 'ai-calendar-vectors'): Promise<void> {
    await this.initialize();
    await oramaSearchService.save(name);
  }

  async loadIndex(name: string = 'ai-calendar-vectors'): Promise<boolean> {
    return oramaSearchService.load(name);
  }

  getStats(): { totalDocuments: number; byType: Record<EntityType, number> } {
    return oramaSearchService.getStats();
  }

  get isInitialized(): boolean {
    return this.initialized && oramaSearchService.isInitialized;
  }
}

export const vectorService = new VectorService();
