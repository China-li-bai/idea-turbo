import { SyncEngine } from "./core";
import { PersistenceManager } from "./persistence";
import { NetworkManager } from "./network";
import * as awarenessProtocol from 'y-protocols/awareness';
import type { SyncConfig, SyncState, UserPresence } from "./types";

export class LocalFirstSDK {
  private engine: SyncEngine;
  private persistence: PersistenceManager;
  private network: NetworkManager;
  private awareness: awarenessProtocol.Awareness;
  private state: SyncState = {
    status: "syncing",
    isOnline: false,
  };

  constructor(config: SyncConfig) {
    this.engine = new SyncEngine();
    this.persistence = new PersistenceManager(this.engine.getDocument());
    this.network = new NetworkManager(config);
    this.awareness = new awarenessProtocol.Awareness(this.engine.getDocument());
  }

  async initialize(persistenceName?: string): Promise<void> {
    if (persistenceName) {
      await this.persistence.enable(persistenceName);
    }

    await this.network.connect(
      this.engine.getDocument(),
      this.awareness
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
    this.awareness.setLocalStateField("user", presence);
  }

  getUserPresence(): UserPresence | undefined {
    return this.awareness.getLocalState()?.user;
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
