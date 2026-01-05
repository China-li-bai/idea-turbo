import { LocalFirstDatabase, LocalFirstConfig } from './index';
import { PartySocket } from 'partysocket';

export type SyncMode = 'full' | 'local-only' | 'push-only' | 'pull-only';

export interface SyncConfig extends LocalFirstConfig {
  partykitHost: string;
  partykitRoom: string;
  syncMode?: SyncMode;
}

export interface SyncMessage {
  type: 'sync' | 'subscribe' | 'update' | 'initial' | 'ack';
  collection: string;
  operation?: 'insert' | 'update' | 'delete';
  data?: any;
  timestamp?: string;
  clientId?: string;
}

export class SyncManager {
  private db: LocalFirstDatabase;
  private ws: PartySocket | null;
  private clientId: string;
  private subscriptions: Map<string, Set<Function>> = new Map();
  private pendingSyncs: Map<string, any> = new Map();
  private isSyncing: boolean = false;
  private syncMode: SyncMode;

  constructor(config: SyncConfig) {
    this.clientId = this.generateClientId();
    this.syncMode = config.syncMode || 'full';
    
    this.db = new LocalFirstDatabase({
      projectId: config.projectId,
      token: config.token,
      storage: config.storage,
      schema: config.schema,
    });

    this.ws = this.syncMode === 'local-only' ? null : new PartySocket({
      host: config.partykitHost,
      room: config.partykitRoom,
    });

    if (this.ws) {
      this.setupWebSocketHandlers();
    } else {
      console.log('[SyncManager] Running in local-only mode, no WebSocket connection');
    }
  }

  private generateClientId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupWebSocketHandlers() {
    this.ws!.addEventListener('open', () => {
      console.log('[SyncManager] Connected to PartyKit server');
    });

    this.ws!.addEventListener('message', async (event: MessageEvent) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);
        await this.handleIncomingMessage(message);
      } catch (error) {
        console.error('[SyncManager] Error handling message:', error);
      }
    });

    this.ws!.addEventListener('close', () => {
      console.log('[SyncManager] Disconnected from PartyKit server');
    });

    this.ws!.addEventListener('error', (error: Event) => {
      console.error('[SyncManager] WebSocket error:', error);
    });
  }

  private async handleIncomingMessage(message: SyncMessage) {
    switch (message.type) {
      case 'update':
        if (this.syncMode !== 'push-only') {
          await this.handleUpdate(message);
        }
        break;
      case 'initial':
        if (this.syncMode !== 'push-only') {
          await this.handleInitial(message);
        }
        break;
      case 'sync':
        if (this.syncMode !== 'push-only') {
          await this.handleSync(message);
        }
        break;
      case 'ack':
        if (this.syncMode !== 'pull-only') {
          await this.handleAck(message);
        }
        break;
      default:
        console.warn('[SyncManager] Unknown message type:', message.type);
    }
  }

  private async handleUpdate(message: SyncMessage) {
    const { collection, data } = message;
    
    if (!data || !Array.isArray(data)) return;

    const localData = await this.db.fetchAll(collection);
    const mergedData = await this.resolveConflicts(collection, localData, data);

    if (this.hasDataChanged(localData, mergedData)) {
      await this.updateLocalData(collection, mergedData);
      this.notifySubscribers(collection, mergedData);
    }
  }

  private async handleInitial(message: SyncMessage) {
    const { collection, data } = message;
    
    if (!data || !Array.isArray(data)) return;

    const localData = await this.db.fetchAll(collection);
    
    if (localData.length === 0) {
      await this.updateLocalData(collection, data);
    } else {
      const mergedData = await this.resolveConflicts(collection, localData, data);
      await this.updateLocalData(collection, mergedData);
    }

    this.notifySubscribers(collection, data);
  }

  private async handleSync(message: SyncMessage) {
    const { collection, operation, data, clientId } = message;

    if (clientId === this.clientId) {
      return;
    }

    switch (operation) {
      case 'insert':
        await this.db.insert(collection, data);
        break;
      case 'update':
        await this.db.update(collection, data.id, data);
        break;
      case 'delete':
        await this.db.delete(collection, data.id);
        break;
    }

    this.notifySubscribers(collection, await this.db.fetchAll(collection));
  }

  private async handleAck(message: SyncMessage) {
    const { collection, data } = message;
    if (data && data.id) {
      this.pendingSyncs.delete(data.id);
    }
  }

  private async resolveConflicts(collection: string, localData: any[], remoteData: any[]): Promise<any[]> {
    const localMap = new Map(localData.map(item => [item.id, item]));
    const remoteMap = new Map(remoteData.map(item => [item.id, item]));
    const merged: any[] = [];

    for (const [id, localItem] of localMap) {
      const remoteItem = remoteMap.get(id);
      
      if (!remoteItem) {
        merged.push(localItem);
      } else {
        const mergedItem = this.mergeItems(localItem, remoteItem);
        merged.push(mergedItem);
      }
    }

    for (const [id, remoteItem] of remoteMap) {
      if (!localMap.has(id)) {
        merged.push(remoteItem);
      }
    }

    return merged;
  }

  private mergeItems(localItem: any, remoteItem: any): any {
    const localTimestamp = new Date(localItem.updatedAt || 0).getTime();
    const remoteTimestamp = new Date(remoteItem.updatedAt || 0).getTime();

    if (remoteTimestamp > localTimestamp) {
      return { ...localItem, ...remoteItem };
    }

    return { ...remoteItem, ...localItem };
  }

  private hasDataChanged(localData: any[], newData: any[]): boolean {
    if (localData.length !== newData.length) return true;

    const localMap = new Map(localData.map(item => [item.id, item]));
    
    for (const newItem of newData) {
      const localItem = localMap.get(newItem.id);
      if (!localItem) return true;

      const localTimestamp = new Date(localItem.updatedAt || 0).getTime();
      const newTimestamp = new Date(newItem.updatedAt || 0).getTime();
      
      if (newTimestamp > localTimestamp) return true;
    }

    return false;
  }

  private async updateLocalData(collection: string, data: any[]) {
    for (const item of data) {
      const existing = await this.db.fetchOne(collection, item.id);
      if (existing) {
        await this.db.update(collection, item.id, item);
      } else {
        await this.db.insert(collection, item);
      }
    }
  }

  private notifySubscribers(collection: string, data: any[]) {
    const callbacks = this.subscriptions.get(collection);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  async connect() {
    await this.db.connect();
    
    if (this.ws) {
      await new Promise<void>((resolve) => {
        this.ws!.addEventListener('open', () => resolve(), { once: true });
      });
    }
  }

  async disconnect() {
    await this.db.disconnect();
    if (this.ws) {
      this.ws.close();
    }
  }

  async insert(collection: string, data: any) {
    const item = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.insert(collection, item);

    this.sendSyncMessage({
      type: 'sync',
      collection,
      operation: 'insert',
      data: item,
      clientId: this.clientId,
      timestamp: item.updatedAt,
    });

    return item;
  }

  async update(collection: string, id: string, data: any) {
    const item = {
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };

    await this.db.update(collection, id, item);

    this.sendSyncMessage({
      type: 'sync',
      collection,
      operation: 'update',
      data: item,
      clientId: this.clientId,
      timestamp: item.updatedAt,
    });

    return item;
  }

  async delete(collection: string, id: string) {
    await this.db.delete(collection, id);

    this.sendSyncMessage({
      type: 'sync',
      collection,
      operation: 'delete',
      data: { id },
      clientId: this.clientId,
      timestamp: new Date().toISOString(),
    });
  }

  async fetchOne(collection: string, id: string) {
    return this.db.fetchOne(collection, id);
  }

  async fetchAll(collection: string) {
    return this.db.fetchAll(collection);
  }

  subscribe(collection: string, callback: (data: any[]) => void) {
    if (!this.subscriptions.has(collection)) {
      this.subscriptions.set(collection, new Set());
      this.sendSubscribeMessage(collection);
    }

    this.subscriptions.get(collection)!.add(callback);

    return () => {
      const callbacks = this.subscriptions.get(collection);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(collection);
        }
      }
    };
  }

  private sendSyncMessage(message: SyncMessage) {
    if (this.ws && this.syncMode !== 'pull-only') {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendSubscribeMessage(collection: string) {
    if (this.ws && this.syncMode !== 'push-only') {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        collection,
      }));
    }
  }

  getDB() {
    return this.db;
  }

  getWebSocket() {
    return this.ws;
  }
}

export function createSyncManager(config: SyncConfig) {
  return new SyncManager(config);
}
