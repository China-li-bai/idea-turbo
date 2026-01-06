import { IndexedDBWrapper } from './indexeddb';

export interface LocalFirstConfig {
  projectId: string;
  token?: string;
  storage?: 'indexeddb' | 'memory';
}

export class LocalFirstDatabase {
  private db: IndexedDBWrapper;

  constructor(config: LocalFirstConfig) {
    this.db = new IndexedDBWrapper(config.projectId);
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
    return this.db.insert(collection, data);
  }

  async update(collection: string, id: string, data: any) {
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
}

export function createLocalFirstDB(config: LocalFirstConfig) {
  return new LocalFirstDatabase(config);
}

export * from './sync';
export * from './hooks';
