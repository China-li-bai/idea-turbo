import { Storage } from "./storage.js";
import { VectorDB } from "./vectorDB.js";
import { EmbeddingEngine } from "./embeddingEngine.js";
import { RAGEngine } from "./ragEngine.js";
import {
  CalendarEvent,
  CalendarConfig,
  SearchResult,
  DEFAULT_CALENDAR_CONFIG,
  VectorEntry,
  FilterOptions,
  CompactionResult,
  MemoryPressure,
} from "./types.js";

export * from "./types.js";
export { Storage } from "./storage.js";
export { VectorDB } from "./vectorDB.js";
export { EmbeddingEngine } from "./embeddingEngine.js";
export { RAGEngine } from "./ragEngine.js";

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

  async searchEventsWithFilter(
    query: string,
    options: FilterOptions,
    topK?: number
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const queryEmbedding = await this.embeddingEngine.generateQueryEmbedding(query);
    return this.vectorDB.searchWithFilter(queryEmbedding, options, topK);
  }

  async searchEventsBQ(query: string, topK?: number): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const queryEmbedding = await this.embeddingEngine.generateQueryEmbedding(query);
    return this.vectorDB.searchBQ(queryEmbedding, topK);
  }

  needsCompaction(): boolean {
    return this.vectorDB.needsCompaction();
  }

  getCompactionWarning(): string | undefined {
    return this.vectorDB.getCompactionWarning();
  }

  compact(): CompactionResult {
    return this.vectorDB.compact();
  }

  getMemoryPressure(): MemoryPressure {
    return this.vectorDB.getMemoryPressure();
  }

  getStats(): {
    liveCount: number;
    deletedCount: number;
    tombstoneRatio: number;
    totalMetadataCount: number;
  } {
    return this.vectorDB.getStats();
  }

  async saveDatabase(name: string): Promise<void> {
    await this.vectorDB.save(name);
  }

  static async loadDatabase(
    name: string,
    config: Partial<CalendarConfig> = {}
  ): Promise<LocalFirstAICalendar> {
    const fullConfig = { ...DEFAULT_CALENDAR_CONFIG, ...config };
    const instance = new LocalFirstAICalendar(config);
    
    instance.vectorDB = await VectorDB.load(name, fullConfig.vectorDB);
    instance.initialized = true;
    
    return instance;
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
