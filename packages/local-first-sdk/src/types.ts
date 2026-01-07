export type SyncStatus = "synced" | "syncing" | "offline";

export interface SyncConfig {
  room: string;
  host?: string;
  party?: string;
}

export interface UserPresence {
  name: string;
  color: string;
}

export interface SyncState {
  status: SyncStatus;
  isOnline: boolean;
  lastSyncTime?: Date;
}
