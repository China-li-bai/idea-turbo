export class IndexedDBWrapper {
  private dbName: string;
  private db: IDBDatabase | null = null;
  private subscribers: Map<string, Set<(data: any[]) => void>> = new Map();

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

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async insert(collection: string, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not connected');

    console.log('[IndexedDB] Inserting data into', collection, ':', JSON.stringify(data, null, 2));

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.add(data);

      request.onsuccess = () => {
        this.notifySubscribers(collection);
        resolve(data);
      };
      request.onerror = () => {
        console.error('[IndexedDB] Insert error:', request.error);
        if (request.error) reject(request.error);
      };
    });
  }

  async update(collection: string, id: string, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.put({ id, ...data });

      request.onsuccess = () => {
        this.notifySubscribers(collection);
        resolve({ id, ...data });
      };
      request.onerror = () => {
        if (request.error) reject(request.error);
      };
    });
  }

  async delete(collection: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([collection], 'readwrite');
      const store = transaction.objectStore(collection);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.notifySubscribers(collection);
        resolve();
      };
      request.onerror = () => {
        if (request.error) reject(request.error);
      };
    });
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
    if (!this.db) throw new Error('Database not connected');

    if (!this.subscribers.has(collection)) {
      this.subscribers.set(collection, new Set());
    }

    this.subscribers.get(collection)!.add(callback);

    const fetchAndNotify = () => {
      this.fetchAll(collection).then(callback);
    };

    fetchAndNotify();

    return () => {
      const collectionSubscribers = this.subscribers.get(collection);
      if (collectionSubscribers) {
        collectionSubscribers.delete(callback);
      }
    };
  }

  private notifySubscribers(collection: string) {
    const collectionSubscribers = this.subscribers.get(collection);
    if (collectionSubscribers) {
      this.fetchAll(collection).then((data) => {
        collectionSubscribers.forEach((callback) => {
          try {
            callback(data);
          } catch (error) {
            console.error('[IndexedDB] Error in subscriber callback:', error);
          }
        });
      });
    }
  }
}
