import { Storage } from "./storage";
import { VectorDB } from "./vectorDB";
import { EmbeddingEngine } from "./embeddingEngine";
import { RAGEngine } from "./ragEngine";
import {
  CalendarEvent,
  CalendarConfig,
  SearchResult,
  DEFAULT_CALENDAR_CONFIG,
  VectorEntry,
} from "./types";

export * from "./types";
export { Storage } from "./storage";
export { VectorDB } from "./vectorDB";
export { EmbeddingEngine } from "./embeddingEngine";
export { RAGEngine } from "./ragEngine";

export class LocalFirstAICalendar {
  private config: CalendarConfig;
  private storage: Storage;
  private vectorDB: VectorDB;
  private embeddingEngine: EmbeddingEngine;
  private ragEngine?: RAGEngine;
  private initialized: boolean = false;

  constructor(config: Partial<CalendarConfig> = {}) {
    this.config = { ...DEFAULT_CALENDAR_CONFIG, ...config };
    this.storage = new Storage(this.config.dbName);
    this.vectorDB = new VectorDB(this.config.vectorDB);
    this.embeddingEngine = new EmbeddingEngine(this.config.embedding);

    if (this.config.rag) {
      this.ragEngine = new RAGEngine(this.config.rag);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.embeddingEngine.initialize();
    await this.vectorDB.initialize();

    const vectorEntries = await this.storage.getAllVectorEntries();
    this.vectorDB.loadEntries(vectorEntries);

    this.initialized = true;
  }

  async addEvent(event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): Promise<CalendarEvent> {
    await this.ensureInitialized();

    const id = crypto.randomUUID();
    const now = new Date();
    const calendarEvent: CalendarEvent = {
      ...event,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.saveEvent(calendarEvent);

    const embedding = await this.embeddingEngine.generateEventEmbedding(calendarEvent);
    const vectorEntry: VectorEntry = {
      id,
      vector: embedding,
      metadata: calendarEvent,
    };

    await this.storage.saveVectorEntry(vectorEntry);
    this.vectorDB.addEntry(vectorEntry);

    return calendarEvent;
  }

  async updateEvent(
    id: string,
    updates: Partial<Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">>
  ): Promise<CalendarEvent | null> {
    await this.ensureInitialized();

    const existingEvent = await this.storage.getEvent(id);
    if (!existingEvent) {
      return null;
    }

    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    await this.storage.saveEvent(updatedEvent);

    const embedding = await this.embeddingEngine.generateEventEmbedding(updatedEvent);
    const vectorEntry: VectorEntry = {
      id,
      vector: embedding,
      metadata: updatedEvent,
    };

    await this.storage.saveVectorEntry(vectorEntry);
    this.vectorDB.addEntry(vectorEntry);

    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<boolean> {
    await this.ensureInitialized();

    const event = await this.storage.getEvent(id);
    if (!event) {
      return false;
    }

    await this.storage.deleteEvent(id);
    await this.storage.deleteVectorEntry(id);
    this.vectorDB.removeEntry(id);

    return true;
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    return await this.storage.getEvent(id);
  }

  async getAllEvents(): Promise<CalendarEvent[]> {
    return await this.storage.getAllEvents();
  }

  async getEventsByTimeRange(start: Date, end: Date): Promise<CalendarEvent[]> {
    return await this.storage.getEventsByTimeRange(start, end);
  }

  async searchEvents(query: string, topK?: number): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const queryEmbedding = await this.embeddingEngine.generateQueryEmbedding(query);
    return this.vectorDB.search(queryEmbedding, topK);
  }

  async searchEventsWithTimeFilter(
    query: string,
    startTime: Date,
    endTime: Date,
    topK?: number
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const queryEmbedding = await this.embeddingEngine.generateQueryEmbedding(query);
    return this.vectorDB.searchWithTimeFilter(queryEmbedding, startTime, endTime, topK);
  }

  async askAI(query: string): Promise<string> {
    if (!this.ragEngine) {
      throw new Error("RAG engine not configured. Please provide RAG configuration in the constructor.");
    }

    await this.ensureInitialized();

    const searchResults = await this.searchEvents(query);
    return await this.ragEngine.query(query, searchResults);
  }

  async askAIWithTimeFilter(
    query: string,
    startTime: Date,
    endTime: Date
  ): Promise<string> {
    if (!this.ragEngine) {
      throw new Error("RAG engine not configured. Please provide RAG configuration in the constructor.");
    }

    await this.ensureInitialized();

    const searchResults = await this.searchEventsWithTimeFilter(query, startTime, endTime);
    return await this.ragEngine.query(query, searchResults);
  }

  async clearAll(): Promise<void> {
    await this.storage.clearAll();
    this.vectorDB.clear();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export function createLocalFirstAICalendar(
  config?: Partial<CalendarConfig>
): LocalFirstAICalendar {
  return new LocalFirstAICalendar(config);
}
