import { SyncEngine } from "./core";
import { PersistenceManager } from "./persistence";
import { NetworkManager } from "./network";
import type { SyncConfig, SyncState, UserPresence } from "./types";

export class LocalFirstSDK {
  private engine: SyncEngine;
  private persistence: PersistenceManager;
  private network: NetworkManager;
  private state: SyncState = {
    status: "syncing",
    isOnline: false,
  };

  constructor(config: SyncConfig) {
    this.engine = new SyncEngine();
    this.persistence = new PersistenceManager(this.engine.getDocument());
    this.network = new NetworkManager(config);
  }

  async initialize(persistenceName?: string): Promise<void> {
    if (persistenceName) {
      await this.persistence.enable(persistenceName);
    }

    await this.network.connect(
      this.engine.getDocument(),
      this.engine.getDocument().awareness
    );

    this.network.onStateChange((newState) => {
      this.state = newState;
    });
  }

  getEngine(): SyncEngine {
    return this.engine;
  }

  getPersistence(): PersistenceManager {
    return this.persistence;
  }

  getNetwork(): NetworkManager {
    return this.network;
  }

  getState(): SyncState {
    return this.state;
  }

  setUserPresence(presence: UserPresence): void {
    this.engine.getDocument().awareness.setLocalStateField("user", presence);
  }

  getUserPresence(): UserPresence | undefined {
    return this.engine.getDocument().awareness.getLocalState()?.user;
  }

  onStateChange(callback: (state: SyncState) => void): () => void {
    return this.network.onStateChange(callback);
  }

  destroy(): void {
    this.network.destroy();
    this.persistence.destroy();
    this.engine.destroy();
  }
}
