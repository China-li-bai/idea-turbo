import init, { 
  EdgeVec as EdgeVecWasm, 
  EdgeVecConfig,
  JsMetadataValue 
} from "edgevec";
import { 
  VectorEntry, 
  SearchResult, 
  VectorDBConfig, 
  CalendarEvent,
  CompactionResult,
  MemoryPressure,
  FilterOptions
} from "./types.js";

export class VectorDB {
  private db: EdgeVecWasm | null = null;
  private config: VectorDBConfig;
  private initialized: boolean = false;
  private idToVectorId: Map<string, number> = new Map();
  private vectorIdToEntry: Map<number, VectorEntry> = new Map();

  constructor(config: VectorDBConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await init();
    
    const edgeVecConfig = new EdgeVecConfig(this.config.dimension);
    
    if (this.config.metric) {
      edgeVecConfig.metric = this.config.metric;
    }
    if (this.config.m) {
      edgeVecConfig.m = this.config.m;
    }
    if (this.config.m0) {
      edgeVecConfig.m0 = this.config.m0;
    }
    if (this.config.efConstruction) {
      edgeVecConfig.ef_construction = this.config.efConstruction;
    }
    if (this.config.efSearch) {
      edgeVecConfig.ef_search = this.config.efSearch;
    }
    
    this.db = new EdgeVecWasm(edgeVecConfig);
    
    if (this.config.compactionThreshold) {
      this.db.setCompactionThreshold(this.config.compactionThreshold);
    }
    
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error("VectorDB not initialized. Call initialize() first.");
    }
  }

  private setEventMetadata(vectorId: number, event: CalendarEvent): void {
    this.db!.setMetadata(vectorId, "id", JsMetadataValue.fromString(event.id));
    this.db!.setMetadata(vectorId, "title", JsMetadataValue.fromString(event.title));
    this.db!.setMetadata(vectorId, "description", JsMetadataValue.fromString(event.description || ""));
    this.db!.setMetadata(vectorId, "startTime", JsMetadataValue.fromString(event.startTime.toISOString()));
    this.db!.setMetadata(vectorId, "endTime", JsMetadataValue.fromString(event.endTime.toISOString()));
    this.db!.setMetadata(vectorId, "createdAt", JsMetadataValue.fromString(event.createdAt.toISOString()));
    this.db!.setMetadata(vectorId, "updatedAt", JsMetadataValue.fromString(event.updatedAt.toISOString()));
    
    if (event.location) {
      this.db!.setMetadata(vectorId, "location", JsMetadataValue.fromString(event.location));
    }
    
    if (event.tags && event.tags.length > 0) {
      this.db!.setMetadata(vectorId, "tags", JsMetadataValue.fromStringArray(event.tags));
    }
    
    if (event.attendees && event.attendees.length > 0) {
      this.db!.setMetadata(vectorId, "attendees", JsMetadataValue.fromStringArray(event.attendees));
    }
  }

  addEntry(entry: VectorEntry): void {
    this.ensureInitialized();

    if (entry.vector.length !== this.config.dimension) {
      throw new Error(
        `Vector dimension mismatch. Expected ${this.config.dimension}, got ${entry.vector.length}`
      );
    }

    const vector = new Float32Array(entry.vector);
    const vectorId = this.db!.insert(vector);
    
    this.setEventMetadata(vectorId, entry.metadata);

    this.idToVectorId.set(entry.id, vectorId);
    this.vectorIdToEntry.set(vectorId, entry);
  }

  addEntriesBatch(entries: VectorEntry[]): number[] {
    this.ensureInitialized();

    const vectors: Float32Array[] = [];
    for (const entry of entries) {
      if (entry.vector.length !== this.config.dimension) {
        throw new Error(
          `Vector dimension mismatch. Expected ${this.config.dimension}, got ${entry.vector.length}`
        );
      }
      vectors.push(new Float32Array(entry.vector));
    }

    const result = this.db!.insertBatch(vectors);
    const ids: number[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      const vectorId = Number(result.ids[i]);
      const entry = entries[i]!;
      this.setEventMetadata(vectorId, entry.metadata);
      this.idToVectorId.set(entry.id, vectorId);
      this.vectorIdToEntry.set(vectorId, entry);
      ids.push(vectorId);
    }

    return ids;
  }

  removeEntry(id: string): boolean {
    this.ensureInitialized();
    const vectorId = this.idToVectorId.get(id);
    if (vectorId === undefined) {
      return false;
    }

    try {
      const deleted = this.db!.softDelete(vectorId);
      if (deleted) {
        this.idToVectorId.delete(id);
        this.vectorIdToEntry.delete(vectorId);
      }
      return deleted;
    } catch {
      return false;
    }
  }

  removeEntriesBatch(ids: string[]): { deleted: number; notFound: number } {
    this.ensureInitialized();
    
    const vectorIds: number[] = [];
    const idMapping: Map<number, string> = new Map();
    
    ids.forEach(id => {
      const vectorId = this.idToVectorId.get(id);
      if (vectorId !== undefined) {
        vectorIds.push(vectorId);
        idMapping.set(vectorId, id);
      }
    });

    if (vectorIds.length === 0) {
      return { deleted: 0, notFound: ids.length };
    }

    const result = this.db!.softDeleteBatch(new Uint32Array(vectorIds));
    
    idMapping.forEach((id, vectorId) => {
      this.idToVectorId.delete(id);
      this.vectorIdToEntry.delete(vectorId);
    });

    return {
      deleted: result.deleted,
      notFound: result.invalidIds
    };
  }

  getEntry(id: string): VectorEntry | undefined {
    const vectorId = this.idToVectorId.get(id);
    if (vectorId === undefined) {
      return undefined;
    }
    return this.vectorIdToEntry.get(vectorId);
  }

  getAllEntries(): VectorEntry[] {
    return Array.from(this.vectorIdToEntry.values());
  }

  loadEntries(entries: VectorEntry[]): void {
    this.ensureInitialized();
    if (entries.length > 0) {
      this.addEntriesBatch(entries);
    }
  }

  clear(): void {
    this.ensureInitialized();
    const edgeVecConfig = new EdgeVecConfig(this.config.dimension);
    
    if (this.config.metric) {
      edgeVecConfig.metric = this.config.metric;
    }
    if (this.config.m) {
      edgeVecConfig.m = this.config.m;
    }
    if (this.config.m0) {
      edgeVecConfig.m0 = this.config.m0;
    }
    if (this.config.efConstruction) {
      edgeVecConfig.ef_construction = this.config.efConstruction;
    }
    if (this.config.efSearch) {
      edgeVecConfig.ef_search = this.config.efSearch;
    }
    
    this.db = new EdgeVecWasm(edgeVecConfig);
    
    if (this.config.compactionThreshold) {
      this.db.setCompactionThreshold(this.config.compactionThreshold);
    }
    
    this.idToVectorId.clear();
    this.vectorIdToEntry.clear();
  }

  search(queryVector: number[], topK: number = this.config.topK): SearchResult[] {
    this.ensureInitialized();

    if (queryVector.length !== this.config.dimension) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.config.dimension}, got ${queryVector.length}`
      );
    }

    const query = new Float32Array(queryVector);
    const results = this.db!.search(query, topK);

    return this.processSearchResults(results);
  }

  searchBQ(queryVector: number[], topK: number = this.config.topK): SearchResult[] {
    this.ensureInitialized();

    if (queryVector.length !== this.config.dimension) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.config.dimension}, got ${queryVector.length}`
      );
    }

    const query = new Float32Array(queryVector);
    const results = this.db!.searchBQ(query, topK);

    return this.processSearchResults(results);
  }

  private processSearchResults(results: any[]): SearchResult[] {
    return results
      .map((result: any) => {
        const entry = this.vectorIdToEntry.get(result.id);
        if (!entry) {
          return null;
        }
        return {
          event: entry.metadata as CalendarEvent,
          score: 1 - result.distance,
        };
      })
      .filter((result: SearchResult | null): result is SearchResult => result !== null);
  }

  private buildFilterExpression(options: FilterOptions): string {
    const filters: string[] = [];

    if (options.startTime) {
      filters.push(`startTime >= "${options.startTime.toISOString()}"`);
    }

    if (options.endTime) {
      filters.push(`endTime <= "${options.endTime.toISOString()}"`);
    }

    if (options.location) {
      filters.push(`location = "${options.location}"`);
    }

    if (options.tags && options.tags.length > 0) {
      const tagFilters = options.tags.map(tag => `tags CONTAINS "${tag}"`);
      filters.push(`(${tagFilters.join(" OR ")})`);
    }

    if (options.attendee) {
      filters.push(`attendees CONTAINS "${options.attendee}"`);
    }

    if (options.customFilter) {
      filters.push(options.customFilter);
    }

    return filters.join(" AND ");
  }

  searchWithFilter(
    queryVector: number[],
    options: FilterOptions,
    topK: number = this.config.topK
  ): SearchResult[] {
    this.ensureInitialized();

    if (queryVector.length !== this.config.dimension) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.config.dimension}, got ${queryVector.length}`
      );
    }

    const query = new Float32Array(queryVector);
    const filterExpr = this.buildFilterExpression(options);

    if (!filterExpr) {
      return this.search(queryVector, topK);
    }

    try {
      const searchOptions = JSON.stringify({
        filter: filterExpr,
        strategy: "auto"
      });
      
      const results = this.db!.searchFiltered(query, topK, searchOptions);
      const parsedResults = JSON.parse(results);
      
      return this.processSearchResults(parsedResults);
    } catch (error) {
      console.warn("Filter search failed, falling back to manual filtering:", error);
      return this.fallbackFilter(queryVector, options, topK);
    }
  }

  searchWithTimeFilter(
    queryVector: number[],
    startTime: Date,
    endTime: Date,
    topK: number = this.config.topK
  ): SearchResult[] {
    return this.searchWithFilter(queryVector, { startTime, endTime }, topK);
  }

  private fallbackFilter(
    queryVector: number[],
    options: FilterOptions,
    topK: number
  ): SearchResult[] {
    const allResults = this.search(queryVector, this.config.topK * 10);
    
    return allResults
      .filter(result => {
        const event = result.event;
        
        if (options.startTime && event.endTime < options.startTime) {
          return false;
        }
        if (options.endTime && event.startTime > options.endTime) {
          return false;
        }
        if (options.location && event.location !== options.location) {
          return false;
        }
        if (options.tags && options.tags.length > 0) {
          const hasTag = options.tags.some(tag => event.tags?.includes(tag));
          if (!hasTag) return false;
        }
        if (options.attendee && !event.attendees?.includes(options.attendee)) {
          return false;
        }
        
        return true;
      })
      .slice(0, topK);
  }

  needsCompaction(): boolean {
    this.ensureInitialized();
    return this.db!.needsCompaction();
  }

  getCompactionWarning(): string | undefined {
    this.ensureInitialized();
    return this.db!.compactionWarning();
  }

  compact(): CompactionResult {
    this.ensureInitialized();
    
    const result = this.db!.compact();
    
    return {
      tombstonesRemoved: result.tombstones_removed,
      newSize: result.new_size,
      durationMs: result.duration_ms
    };
  }

  getMemoryPressure(): MemoryPressure {
    this.ensureInitialized();
    
    const pressure = this.db!.getMemoryPressure();
    
    return {
      level: pressure.level as "normal" | "warning" | "critical",
      liveCount: this.db!.liveCount(),
      deletedCount: this.db!.deletedCount(),
      tombstoneRatio: this.db!.tombstoneRatio()
    };
  }

  getStats(): {
    liveCount: number;
    deletedCount: number;
    tombstoneRatio: number;
    totalMetadataCount: number;
  } {
    this.ensureInitialized();
    
    return {
      liveCount: this.db!.liveCount(),
      deletedCount: this.db!.deletedCount(),
      tombstoneRatio: this.db!.tombstoneRatio(),
      totalMetadataCount: this.db!.totalMetadataCount()
    };
  }

  async save(name: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.save(name);
  }

  static async load(name: string, config: VectorDBConfig): Promise<VectorDB> {
    await init();
    const db = await EdgeVecWasm.load(name);
    
    const vectorDB = new VectorDB(config);
    vectorDB.db = db;
    vectorDB.initialized = true;
    
    return vectorDB;
  }

  isDeleted(id: string): boolean {
    this.ensureInitialized();
    const vectorId = this.idToVectorId.get(id);
    if (vectorId === undefined) {
      return false;
    }
    return this.db!.isDeleted(vectorId);
  }
}
