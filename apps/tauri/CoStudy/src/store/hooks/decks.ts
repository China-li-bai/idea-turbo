import { useLiveQuery } from "@electric-sql/pglite-react";
import type { DeckRow } from "@make-gold/lib/schema";
import { useDatabase } from "@make-gold/lib/database-provider";

/**
 * 實時獲取所有牌組（依創建時間倒序）
 * 使用官方 useLiveQuery，當底層表內容變更時自動推送更新。
 */
export function useDecksLive(): DeckRow[] {
  const { db, isLoading } = useDatabase();

  if (!db || isLoading) return [];

  const rows = useLiveQuery(
    `SELECT * FROM decks ORDER BY created_at DESC`
  ) as DeckRow[] | null;
  return rows ?? [];
}

/**
 * 實時獲取指定牌組詳情
 */
export function useDeckByIdLive(deckId?: string): DeckRow | null {
  const { db, isLoading } = useDatabase();

  if (!deckId || !db || isLoading) return null;
  const rows = useLiveQuery(
    `SELECT * FROM decks WHERE id = $1`,
    [deckId]
  ) as DeckRow[] | null;
  return rows && rows.length > 0 ? rows[0] : null;
}