import { useEffect, useState, useCallback } from 'react';
import { LocalFirstDatabase } from './index';

export function useQuery<T>(db: LocalFirstDatabase, collection: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        const results = await db.fetchAll(collection);
        if (mounted) {
          setData(results);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    const unsubscribe = db.subscribe(collection, (newData) => {
      if (mounted) {
        setData(newData);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [db, collection]);

  return { data, loading, error };
}

export function useMutation<T>(
  db: LocalFirstDatabase,
  collection: string,
  operation: 'insert' | 'update' | 'delete'
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      switch (operation) {
        case 'insert':
          result = await db.insert(collection, data);
          break;
        case 'update':
          result = await db.update(collection, data.id, data);
          break;
        case 'delete':
          result = await db.delete(collection, data.id);
          break;
      }
      
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db, collection, operation]);

  return { mutate, loading, error };
}

export function useOptimisticMutation<T>(
  db: LocalFirstDatabase,
  collection: string,
  operation: 'insert' | 'update' | 'delete'
) {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      let optimisticResult;
      switch (operation) {
        case 'insert':
          optimisticResult = {
            ...data,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setOptimisticData(optimisticResult);
          break;
        case 'update':
          optimisticResult = {
            ...data,
            updatedAt: new Date().toISOString(),
          };
          setOptimisticData(optimisticResult);
          break;
        case 'delete':
          optimisticResult = data;
          setOptimisticData(optimisticResult);
          break;
      }

      let result;
      switch (operation) {
        case 'insert':
          result = await db.insert(collection, data);
          break;
        case 'update':
          result = await db.update(collection, data.id, data);
          break;
        case 'delete':
          result = await db.delete(collection, data.id);
          break;
      }
      
      setOptimisticData(null);
      return result;
    } catch (err) {
      setError(err as Error);
      setOptimisticData(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [db, collection, operation]);

  return { mutate, loading, error, optimisticData };
}
