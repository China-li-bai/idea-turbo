import { IndexedDBWrapper } from './indexeddb';
import { SchemaManager, SchemaConfig } from './schema-manager';

export interface LocalFirstConfig {
  projectId: string;
  token?: string;
  storage?: 'indexeddb' | 'memory';
  schema?: SchemaConfig;
}

export class LocalFirstDatabase {
  private db: IndexedDBWrapper;
  private schema?: SchemaManager;

  constructor(config: LocalFirstConfig) {
    this.db = new IndexedDBWrapper(config.projectId);
    
    if (config.schema) {
      this.schema = new SchemaManager(config.schema);
    }
  }

  async connect() {
    await this.db.connect();
  }

  async disconnect() {
    await this.db.disconnect();
  }

  getClient() {
    return this.db;
  }

  async insert(collection: string, data: any) {
    let processedData = data;

    if (this.schema) {
      processedData = this.schema.applyDefaults(collection, data);
      console.log('[LocalFirstDatabase] After applyDefaults:', JSON.stringify(processedData, null, 2));
      
      if (!this.schema.validate(collection, processedData)) {
        throw new Error(`Validation failed for collection: ${collection}`);
      }
    }

    return this.db.insert(collection, processedData);
  }

  async update(collection: string, id: string, data: any) {
    if (this.schema && !this.schema.validate(collection, data)) {
      throw new Error(`Validation failed for collection: ${collection}`);
    }

    return this.db.update(collection, id, data);
  }

  async delete(collection: string, id: string) {
    return this.db.delete(collection, id);
  }

  async fetchOne(collection: string, id: string) {
    return this.db.fetchOne(collection, id);
  }

  async fetchAll(collection: string) {
    return this.db.fetchAll(collection);
  }

  subscribe(collection: string, callback: (data: any[]) => void) {
    return this.db.subscribe(collection, callback);
  }

  getSchema() {
    return this.schema;
  }
}

export function createLocalFirstDB(config: LocalFirstConfig) {
  return new LocalFirstDatabase(config);
}

export * from './sync';
export * from './react-hooks';
export * from './schema';
export * from './schema-manager';
