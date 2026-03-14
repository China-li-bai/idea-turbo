import type { SearchResult, CalendarEvent, Task, Inspiration } from '@/types';

type EntityType = 'event' | 'task' | 'inspiration';

interface VectorDocument {
  id: string;
  type: EntityType;
  text: string;
  vector?: number[];
  metadata: {
    title?: string;
    date?: string;
    type?: string;
    [key: string]: any;
  };
}

class VectorService {
  private initialized = false;
  private documents: Map<string, VectorDocument> = new Map();
  private vectors: Map<string, number[]> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    console.log('Initializing VectorService...');
    
    try {
      const { LocalAIStore } = await import('local-first-ai-calendar');
      console.log('LocalAIStore loaded successfully');
    } catch (error) {
      console.warn('LocalAIStore not available, using fallback:', error);
    }
    
    this.initialized = true;
  }

  private generateSimpleVector(text: string): number[] {
    const vector: number[] = [];
    const words = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < 384; i++) {
      let sum = 0;
      for (let j = 0; j < words.length; j++) {
        const charCode = words[j].charCodeAt(j % words[j].length) || 0;
        sum += Math.sin(charCode * (i + 1) * 0.001);
      }
      vector.push(sum / words.length);
    }
    
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / magnitude);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async indexEvent(event: CalendarEvent): Promise<void> {
    await this.initialize();
    
    const text = [
      event.title,
      event.description || '',
      event.location || '',
    ].filter(Boolean).join(' ');

    const vector = this.generateSimpleVector(text);
    
    const doc: VectorDocument = {
      id: event.id,
      type: 'event',
      text,
      vector,
      metadata: {
        title: event.title,
        date: event.startTime?.toISOString(),
        type: event.eventType,
        location: event.location,
      },
    };

    this.documents.set(event.id, doc);
    this.vectors.set(event.id, vector);
    
    console.log(`Indexed event: ${event.id}`);
  }

  async indexTask(task: Task): Promise<void> {
    await this.initialize();
    
    const text = [
      task.title,
      task.description || '',
    ].filter(Boolean).join(' ');

    const vector = this.generateSimpleVector(text);
    
    const doc: VectorDocument = {
      id: task.id,
      type: 'task',
      text,
      vector,
      metadata: {
        title: task.title,
        priority: task.priority,
        completed: task.completed,
      },
    };

    this.documents.set(task.id, doc);
    this.vectors.set(task.id, vector);
    
    console.log(`Indexed task: ${task.id}`);
  }

  async indexInspiration(inspiration: Inspiration): Promise<void> {
    await this.initialize();
    
    const text = inspiration.content;
    const vector = this.generateSimpleVector(text);
    
    const doc: VectorDocument = {
      id: inspiration.id,
      type: 'inspiration',
      text,
      vector,
      metadata: {
        type: inspiration.type,
        captureTime: inspiration.captureTime?.toISOString(),
      },
    };

    this.documents.set(inspiration.id, doc);
    this.vectors.set(inspiration.id, vector);
    
    console.log(`Indexed inspiration: ${inspiration.id}`);
  }

  async indexDocument(
    type: EntityType,
    id: string,
    text: string,
    metadata?: any
  ): Promise<string> {
    await this.initialize();
    
    const vector = this.generateSimpleVector(text);
    
    const doc: VectorDocument = {
      id,
      type,
      text,
      vector,
      metadata: metadata || {},
    };

    this.documents.set(id, doc);
    this.vectors.set(id, vector);
    
    console.log(`Indexed ${type} document: ${id}`);
    return id;
  }

  async indexDocuments(
    documents: Array<{ type: EntityType; id: string; text: string; metadata?: any }>
  ): Promise<string[]> {
    await this.initialize();
    const results: string[] = [];
    
    for (const doc of documents) {
      const id = await this.indexDocument(doc.type, doc.id, doc.text, doc.metadata);
      results.push(id);
    }
    
    return results;
  }

  async search(
    query: string,
    options?: {
      k?: number;
      filters?: {
        types?: EntityType[];
        dateRange?: { start: Date; end: Date };
      };
    }
  ): Promise<SearchResult[]> {
    await this.initialize();
    
    const k = options?.k || 10;
    const queryVector = this.generateSimpleVector(query);
    
    const results: Array<{ id: string; score: number; doc: VectorDocument }> = [];
    
    for (const [id, docVector] of this.vectors.entries()) {
      const doc = this.documents.get(id);
      if (!doc) continue;
      
      if (options?.filters?.types && !options.filters.types.includes(doc.type)) {
        continue;
      }
      
      if (options?.filters?.dateRange && doc.metadata.date) {
        const docDate = new Date(doc.metadata.date);
        if (docDate < options.filters.dateRange.start || docDate > options.filters.dateRange.end) {
          continue;
        }
      }
      
      const score = this.cosineSimilarity(queryVector, docVector);
      results.push({ id, score, doc });
    }
    
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, k).map(result => ({
      id: result.id,
      type: result.doc.type,
      score: result.score,
      text: result.doc.text,
      metadata: result.doc.metadata,
    }));
  }

  async deleteFromIndex(id: string): Promise<void> {
    await this.initialize();
    
    this.documents.delete(id);
    this.vectors.delete(id);
    
    console.log('Deleted from index:', id);
  }

  async syncAll(): Promise<void> {
    await this.initialize();
    console.log('Syncing all documents...');
    console.log(`Total indexed documents: ${this.documents.size}`);
  }

  getStats(): { totalDocuments: number; byType: Record<EntityType, number> } {
    const byType: Record<EntityType, number> = {
      event: 0,
      task: 0,
      inspiration: 0,
    };
    
    for (const doc of this.documents.values()) {
      byType[doc.type]++;
    }
    
    return {
      totalDocuments: this.documents.size,
      byType,
    };
  }
}

export const vectorService = new VectorService();
