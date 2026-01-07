import YPartyKitProvider from "y-partykit/provider";
import type { SyncConfig, SyncState } from "./types";

export class NetworkManager {
  private provider: YPartyKitProvider | null = null;
  private config: SyncConfig;
  private listeners: Map<string, Set<(state: SyncState) => void>> = new Map();

  constructor(config: SyncConfig) {
    this.config = config;
  }

  async connect(doc: any, awareness: any): Promise<void> {
    const host = this.config.host || "localhost:1999";
    this.provider = new YPartyKitProvider(
      host,
      this.config.room,
      doc,
      {
        awareness,
        connect: true,
      }
    );

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.provider) return;

    this.provider.on("sync", () => {
      this.notifyListeners({ status: "synced", isOnline: true });
    });

    this.provider.on("connection-close", () => {
      this.notifyListeners({ status: "offline", isOnline: false });
    });

    this.provider.on("connection-error", () => {
      this.notifyListeners({ status: "offline", isOnline: false });
    });
  }

  private notifyListeners(state: SyncState): void {
    this.listeners.forEach((callbacks) => {
      callbacks.forEach((callback) => callback(state));
    });
  }

  onStateChange(callback: (state: SyncState) => void): () => void {
    const key = Math.random().toString(36);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      this.listeners.get(key)?.delete(callback);
      if (this.listeners.get(key)?.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  disconnect(): void {
    this.provider?.destroy();
    this.provider = null;
  }

  isConnected(): boolean {
    return this.provider?.wsconnected ?? false;
  }

  destroy(): void {
    this.disconnect();
    this.listeners.clear();
  }
}
