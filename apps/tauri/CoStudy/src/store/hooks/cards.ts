import { useLiveQuery, useLiveIncrementalQuery } from "@electric-sql/pglite-react";
import type { CardRow, ReviewRow, FsrsState } from "@make-gold/lib/schema";
import { useDatabase } from "@make-gold/lib/database-provider";

/**
 * 實時獲取到期卡片（可選 deckId 以及上限）
 * 排序優先級：learning/relearning > review > new，其次按 due 升序。
 */
export function useDueCardsLive(deckId?: string, limit: number = 50): CardRow[] | null {
  const { db, isLoading } = useDatabase();

  if (!deckId || !db || isLoading) return null;

  const params: any[] = [];
  let sql = `
SELECT * FROM cards
    WHERE due <= NOW()
      AND state IN('new', 'learning', 'review', 'relearning')
  `;
  if (deckId) {
    sql += ` AND deck_id = $1`;
    params.push(deckId);
  }
  sql += `
    ORDER BY
CASE 
        WHEN state = 'learning' OR state = 'relearning' THEN 1
        WHEN state = 'review' THEN 2  
        WHEN state = 'new' THEN 3
END,
  due ASC
    LIMIT ${limit}
`;
  const rows = useLiveQuery(sql, params) as CardRow[] | null;
  return rows; // 不要转换 null，保持原始状态
}

/**
 * 實時獲取指定牌組下卡片列表，支持按狀態過濾
 */
export function useCardsByDeckLive(deckId: string, state?: FsrsState): CardRow[] {
  const { db, isLoading } = useDatabase();

  if (!db || isLoading) return [];

  const params: any[] = [deckId];
  let sql = `SELECT * FROM cards WHERE deck_id = $1`;
  if (state) {
    sql += ` AND state = $2`;
    params.push(state);
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = useLiveQuery(sql, params) as CardRow[] | null;
  return rows ?? [];
}

/**
 * 實時獲取卡片計數（按狀態），可選僅統計到期
 */
export function useCardCountsLive(
  deckId: string,
  onlyDue: boolean = true
): { new: number; review: number; learning: number; total: number } {
  const { db, isLoading } = useDatabase();

  if (!db || isLoading) {
    return { new: 0, learning: 0, review: 0, total: 0 };
  }

  const dueCondition = onlyDue ? " AND due <= NOW()" : "";
  const sql = `
SELECT
COUNT(CASE WHEN state = 'new' THEN 1 END) as new,
  COUNT(CASE WHEN state = 'learning'${dueCondition} THEN 1 END) as learning,
  COUNT(CASE WHEN(state = 'review' OR state = 'relearning')${dueCondition} THEN 1 END) as review,
  COUNT(*) as total
    FROM cards
    WHERE deck_id = $1
  `;
  const rows = useLiveQuery(sql, [deckId]) as any[] | null;
  const row = rows && rows.length > 0 ? rows[0] : null;
  return row ?? { new: 0, learning: 0, review: 0, total: 0 };
}

/**
 * 大列表使用增量 live 查詢，性能更好；需提供主鍵列名
 */
export function useIncrementalCardsByDeckLive(deckId: string, state?: FsrsState): CardRow[] {
  const { db, isLoading } = useDatabase();

  if (!db || isLoading) return [];

  const params: any[] = [deckId];
  let sql = `SELECT * FROM cards WHERE deck_id = $1`;
  if (state) {
    sql += ` AND state = $2`;
    params.push(state);
  }
  sql += ` ORDER BY created_at DESC`;
  const rows = useLiveIncrementalQuery(sql, params, "id") as CardRow[] | null;
  return rows ?? [];
}