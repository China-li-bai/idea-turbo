import type { SyncState } from "../types";

interface SyncStatusProps {
  state: SyncState;
  className?: string;
}

export function SyncStatus({ state, className = "" }: SyncStatusProps) {
  const getStatusText = () => {
    switch (state.status) {
      case "synced":
        return "✓ 已同步";
      case "syncing":
        return "⟳ 同步中...";
      case "offline":
        return "⚠ 离线模式";
    }
  };

  const getStatusClass = () => {
    switch (state.status) {
      case "synced":
        return "synced";
      case "syncing":
        return "syncing";
      case "offline":
        return "offline";
    }
  };

  return (
    <span className={`sync-status ${getStatusClass()} ${className}`}>
      {getStatusText()}
    </span>
  );
}
