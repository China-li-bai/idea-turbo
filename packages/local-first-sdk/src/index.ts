import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import YPartyKitProvider from "y-partykit/provider";

export type SyncStatus = "connected" | "connecting" | "disconnected" | "synced" | "error";

export interface LocalFirstConfig {
  room: string;
  host?: string;
  party?: string;
  enablePersistence?: boolean;
  persistenceKey?: string;
  autoConnect?: boolean;
  onStatusChange?: (status: SyncStatus) => void;
  onError?: (error: Error) => void;
}

export interface StateSnapshot {
  isOnline: boolean;
  isSynced: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
}

export interface LocalFirstSDK {
  doc: Y.Doc;
  status: SyncStatus;
  getText(name: string): Y.Text;
  getArray<T>(name: string): Y.Array<T>;
  getMap<T>(name: string): Y.Map<T>;
  getXmlFragment(name: string): Y.XmlFragment;
  connect(): void;
  disconnect(): void;
  destroy(): void;
  on(event: "status" | "change", callback: (status: SyncStatus) => void): void;
  off(event: "status" | "change", callback: (status: SyncStatus) => void): void;
  onStateChange(callback: (state: StateSnapshot) => void): void;
  offStateChange(callback: (state: StateSnapshot) => void): void;
  getState(): StateSnapshot;
  awareness: any;
}

export class LocalFirst implements LocalFirstSDK {
  public readonly doc: Y.Doc;
  public status: SyncStatus = "disconnected";
  public readonly provider: YPartyKitProvider;
  public readonly awareness: any;

  private persistence: IndexeddbPersistence | null = null;
  private stateListeners: Set<(state: StateSnapshot) => void> = new Set();
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private changeListeners: Set<(status: SyncStatus) => void> = new Set();
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private lastSyncTime: Date | null = null;
  private handleOnline: () => void;
  private handleOffline: () => void;

  constructor(config: LocalFirstConfig) {
    this.doc = new Y.Doc();

    const host = config.host || (typeof window !== "undefined" ? window.location.host : "localhost:1999");
    
    this.provider = new YPartyKitProvider(
      host,
      config.room,
      this.doc,
      {
        connect: config.autoConnect !== false,
        party: config.party,
      }
    );

    this.awareness = this.provider.awareness;

    if (config.enablePersistence !== false) {
      const persistenceKey = config.persistenceKey || `local-first-${config.room}`;
      this.persistence = new IndexeddbPersistence(persistenceKey, this.doc);

      this.persistence.on("synced", () => {
        this.lastSyncTime = new Date();
        this.notifyStateChange();
      });
    }

    this.provider.on("status", (status: any) => {
      this.status = status;
      this.notifyStatusChange(status);
      this.notifyStateChange();

      if (config.onStatusChange) {
        config.onStatusChange(status);
      }

      if (status === "error" && config.onError) {
        config.onError(new Error("Sync error occurred"));
      }
    });

    this.provider.on("sync", (isSynced: boolean) => {
      if (isSynced) {
        this.lastSyncTime = new Date();
        this.notifyStateChange();
      }
    });

    this.handleOnline = () => {
      this.isOnline = true;
      this.notifyStateChange();
    };

    this.handleOffline = () => {
      this.isOnline = false;
      this.notifyStateChange();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  private notifyStatusChange(status: SyncStatus): void {
    this.statusListeners.forEach((callback) => callback(status));
    this.changeListeners.forEach((callback) => callback(status));
  }

  private notifyStateChange(): void {
    const state: StateSnapshot = {
      isOnline: this.isOnline,
      isSynced: this.status === "synced",
      syncStatus: this.status,
      lastSyncTime: this.lastSyncTime,
    };
    this.stateListeners.forEach((callback) => callback(state));
  }

  getText(name: string): Y.Text {
    return this.doc.getText(name);
  }

  getArray<T>(name: string): Y.Array<T> {
    return this.doc.getArray(name);
  }

  getMap<T>(name: string): Y.Map<T> {
    return this.doc.getMap(name);
  }

  getXmlFragment(name: string): Y.XmlFragment {
    return this.doc.getXmlFragment(name);
  }

  connect(): void {
    this.provider.connect();
  }

  disconnect(): void {
    this.provider.disconnect();
  }

  destroy(): void {
    this.provider.destroy();
    this.persistence?.destroy();
    this.doc.destroy();
    this.stateListeners.clear();
    this.statusListeners.clear();
    this.changeListeners.clear();

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
  }

  on(event: "status" | "change", callback: (status: SyncStatus) => void): void {
    if (event === "status") {
      this.statusListeners.add(callback);
    } else {
      this.changeListeners.add(callback);
    }
  }

  off(event: "status" | "change", callback: (status: SyncStatus) => void): void {
    if (event === "status") {
      this.statusListeners.delete(callback);
    } else {
      this.changeListeners.delete(callback);
    }
  }

  onStateChange(callback: (state: StateSnapshot) => void): void {
    this.stateListeners.add(callback);
  }

  offStateChange(callback: (state: StateSnapshot) => void): void {
    this.stateListeners.delete(callback);
  }

  getState(): StateSnapshot {
    return {
      isOnline: this.isOnline,
      isSynced: this.status === "synced",
      syncStatus: this.status,
      lastSyncTime: this.lastSyncTime,
    };
  }
}

export function createLocalFirst(config: LocalFirstConfig): LocalFirst {
  return new LocalFirst(config);
}
