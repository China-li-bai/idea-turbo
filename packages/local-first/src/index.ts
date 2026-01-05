import { Client } from '@triplit/client';

export interface LocalFirstConfig {
  projectId: string;
  token?: string;
  storage?: 'indexeddb' | 'memory';
}

export class LocalFirstDatabase {
  private client: Client;

  constructor(config: LocalFirstConfig) {
    this.client = new Client({
      projectId: config.projectId,
      token: config.token,
      storage: config.storage || 'indexeddb',
    });
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.disconnect();
  }

  getClient() {
    return this.client;
  }

  async insert(collection: string, data: any) {
    return this.client.insert(collection, data);
  }

  async update(collection: string, id: string, data: any) {
    return this.client.update(collection, id, data);
  }

  async delete(collection: string, id: string) {
    return this.client.delete(collection, id);
  }

  async fetchOne(collection: string, id: string) {
    return this.client.fetchOne(collection, id);
  }

  async fetchAll(collection: string) {
    return this.client.fetchAll(collection);
  }

  subscribe(collection: string, callback: (data: any[]) => void) {
    return this.client.subscribe(collection, callback);
  }
}

export function createLocalFirstDB(config: LocalFirstConfig) {
  return new LocalFirstDatabase(config);
}
