import init, { EdgeVec as EdgeVecWasm, EdgeVecConfig } from "edgevec";
import { VectorEntry, SearchResult, VectorDBConfig, CalendarEvent } from "./types";

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
    const config = new EdgeVecConfig(this.config.dimension);
    this.db = new EdgeVecWasm(config);
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error("VectorDB not initialized. Call initialize() first.");
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
    const vectorId = this.db!.insertWithMetadata(vector, {
      id: entry.id,
      title: entry.metadata.title,
      startTime: entry.metadata.startTime.toISOString(),
      endTime: entry.metadata.endTime.toISOString(),
      metadata: JSON.stringify(entry.metadata),
    });

    this.idToVectorId.set(entry.id, vectorId);
    this.vectorIdToEntry.set(vectorId, entry);
  }

  removeEntry(id: string): boolean {
    this.ensureInitialized();
    const vectorId = this.idToVectorId.get(id);
    if (vectorId === undefined) {
      return false;
    }

    try {
      this.db!.softDelete(vectorId);
      this.idToVectorId.delete(id);
      this.vectorIdToEntry.delete(vectorId);
      return true;
    } catch {
      return false;
    }
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
    entries.forEach((entry) => this.addEntry(entry));
  }

  clear(): void {
    this.ensureInitialized();
    const config = new EdgeVecConfig(this.config.dimension);
    this.db = new EdgeVecWasm(config);
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

  searchWithTimeFilter(
    queryVector: number[],
    startTime: Date,
    endTime: Date,
    topK: number = this.config.topK
  ): SearchResult[] {
    this.ensureInitialized();

    const query = new Float32Array(queryVector);
    const startISO = startTime.toISOString();
    const endISO = endTime.toISOString();
    const filter = `startTime >= "${startISO}" AND endTime <= "${endISO}"`;

    try {
      const results = this.db!.searchWithFilter(query, filter, topK);
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
    } catch {
      const allResults = this.search(queryVector, this.config.topK * 10);
      return allResults
        .filter(
          (result) =>
            result.event.startTime < endTime && result.event.endTime > startTime
        )
        .slice(0, topK);
    }
  }
}
