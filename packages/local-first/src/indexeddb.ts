export class IndexedDBWrapper {
  private dbName: string;
  private db: IDBDatabase | null = null;
  private subscribers: Map<string, Set<(data: any[]) => void>> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        if (request.error) reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        this.setupChangeListeners();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('todos')) {
          db.createObjectStore('todos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
      };
    });
  }

  private setupChangeListeners() {
    if (!this.db) return;

    this.db.addEventListener('close', () => {
      this.subscribers.clear();
    });
  }

  private async notifySubscribers(collection: string) {
    const subscribers = this.subscribers.get(collection);
    if (!subscribers || subscribers.size === 0) return;

    const data = await this.fetchAll(collection);
    subscribers.forEach(callback => callback(data));
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.subscribers.clear();
    this.listeners.clear();
  }

  async insert(collection: string, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not connected');

    const result = await new Promise<any>((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.add(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => {
        if (request.error) reject(request.error);
      };
    });

    await this.notifySubscribers(collection);
    return result;
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not connected');

    const result = await new Promise<any>((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.put({ id, ...data });

      request.onsuccess = () => resolve({ id, ...data });
      request.onerror = () => {
        if (request.error) reject(request.error);
      };
    });

    await this.notifySubscribers(collection);
    return result;
  }

  async delete(collection: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        if (request.error) reject(request.error);
      };
    });

    await this.notifySubscribers(collection);
  }

  async fetchOne(collection: string, id: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readonly');
      const store = transaction.objectStore(collection);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => {
        if (request.error) reject(request.error);
      };
    });
  }

  async fetchAll(collection: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readonly');
      const store = transaction.objectStore(collection);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        if (request.error) reject(request.error);
      };
    });
  }

  subscribe(collection: string, callback: (data: any[]) => void): () => void {
    if (!this.subscribers.has(collection)) {
      this.subscribers.set(collection, new Set());
    }
    this.subscribers.get(collection)!.add(callback);

    this.fetchAll(collection).then(callback);

    return () => {
      const subscribers = this.subscribers.get(collection);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(collection);
        }
      }
    };
  }
}
