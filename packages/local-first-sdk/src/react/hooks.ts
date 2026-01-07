import { useEffect, useState, useRef } from "react";
import { LocalFirstSDK } from "../sdk";
import type { SyncConfig, SyncState, UserPresence } from "../types";

export function useLocalFirst(config: SyncConfig) {
  const sdkRef = useRef<LocalFirstSDK | null>(null);
  const [state, setState] = useState<SyncState>({
    status: "syncing",
    isOnline: false,
  });

  useEffect(() => {
    const sdk = new LocalFirstSDK(config);
    sdkRef.current = sdk;

    const unsubscribe = sdk.onStateChange((newState) => {
      setState(newState);
    });

    sdk.initialize(`local-first-${config.room}`);

    return () => {
      unsubscribe();
      sdk.destroy();
    };
  }, [config.room, config.host, config.party]);

  return {
    sdk: sdkRef.current,
    state,
  };
}

export function useSyncState(sdk: LocalFirstSDK | null) {
  const [state, setState] = useState<SyncState>({
    status: "syncing",
    isOnline: false,
  });

  useEffect(() => {
    if (!sdk) return;

    const unsubscribe = sdk.onStateChange((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [sdk]);

  return state;
}

export function useUserPresence(sdk: LocalFirstSDK | null) {
  const [presence, setPresence] = useState<UserPresence | undefined>();

  useEffect(() => {
    if (!sdk) return;

    const updatePresence = () => {
      setPresence(sdk.getUserPresence());
    };

    updatePresence();

    const unsubscribe = sdk.onStateChange(updatePresence);

    return unsubscribe;
  }, [sdk]);

  const setLocalPresence = (newPresence: UserPresence) => {
    if (sdk) {
      sdk.setUserPresence(newPresence);
    }
  };

  return {
    presence,
    setLocalPresence,
  };
}
