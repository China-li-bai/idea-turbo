import { useSyncExternalStore, useState, useEffect } from 'react';
import { LocalFirstDatabase } from './index';

export function createSyncStore<T>(
  db: LocalFirstDatabase,
  collection: string,
  initialData: T[]
) {
  let data = initialData;

  const getSnapshot = () => data;

  const subscribe = (callback: () => void) => {
    return db.subscribe(collection, (newData: T[]) => {
      data = newData;
      callback();
    });
  };

  return {
    getSnapshot,
    subscribe,
    getData: () => data,
  };
}

export function useSyncCollection<T>(
  syncManager: { getSnapshot: () => T[]; subscribe: (onStoreChange: () => void) => () => void } | null,
  getServerSnapshot?: () => T[] | null
): T[] {
  const serverSnapshot = getServerSnapshot ?? (() => null as T[] | null);
  
  const data = useSyncExternalStore(
    syncManager?.subscribe ?? (() => () => {}),
    syncManager?.getSnapshot ?? (() => [] as T[]),
    () => {
      const result = serverSnapshot();
      return result === null ? ([] as T[]) : result;
    }
  );

  return data;
}

export function useLocalFirstCollection<T>(
  db: LocalFirstDatabase | null,
  collection: string
): { data: T[]; loading: boolean; error: Error | null } {
  const [state, setState] = useState<{
    data: T[];
    loading: boolean;
    error: Error | null;
    isConnected: boolean;
  }>({
    data: [],
    loading: true,
    error: null,
    isConnected: false,
  });

  useEffect(() => {
    if (!db) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    let isMounted = true;

    const initAndSubscribe = async () => {
      try {
        // 确保数据库已连接
        await db.connect();

        if (!isMounted) return;

        setState(prev => ({ ...prev, isConnected: true }));

        // 获取初始数据
        const data = await db.fetchAll(collection);
        if (!isMounted) return;

        setState(prev => ({ ...prev, data: data as T[], loading: false, error: null }));

        // 订阅数据变化
        const unsubscribe = db.subscribe(collection, (newData: T[]) => {
          if (isMounted) {
            setState(prev => ({ ...prev, data: newData }));
          }
        });

        // 保存取消订阅函数
        return unsubscribe;
      } catch (error) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error as Error,
            isConnected: false
          }));
        }
        return null;
      }
    };

    let unsubscribe: (() => void) | null = null;

    initAndSubscribe().then(unsub => {
      if (isMounted && unsub) {
        unsubscribe = unsub;
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [db, collection]);

  return state;
}
