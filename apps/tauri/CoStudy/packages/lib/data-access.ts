/**
 * Data Access Layer for PGlite
 *
 * This module centralizes all database interactions, providing a decoupled,
 * type-safe interface for querying and mutating FSRS data. It is designed
 * to be the single source of truth for database operations.
 *
 * Principles:
 * - Decoupling: Abstracts PGlite specifics from UI and business logic.
 * - Type Safety: Uses TypeScript types from `schema.ts` for all I/O.
 * - Clarity: Exports plain functions for clear, predictable data flow.
 */

import { PGlite } from "@electric-sql/pglite";
import { uuid } from './uuid';
import {
  CardRow,
  DeckRow,
  ReviewRow,
  FsrsRating,
  FsrsState,
  DeckType,
} from "./schema";
import {
  FSRSCard,
  stateToFsrsState,

} from "./fsrs";

// Generic query function for flexibility
export async function query<T>(db: PGlite, sql: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await db.query<T>(sql, params);
    return result.rows || [];
  } catch (error) {
    console.error("Database query failed:", error);
    return [];
  }
}

// Deck operations
export const decks = {
  async getAll(db: PGlite): Promise<DeckRow[]> {
    return query<DeckRow>(db, "SELECT * FROM decks ORDER BY created_at DESC");
  },

  async getById(db: PGlite, id: string): Promise<DeckRow | null> {
    const [row] = await query<DeckRow>(db, "SELECT * FROM decks WHERE id = $1", [id]);
    return row ?? null;
  },

  async create(db: PGlite, name: string, description?: string, deckType: DeckType = 'mixed'): Promise<DeckRow | null> {
    const [row] = await query<DeckRow>(db,
      "INSERT INTO decks (id, name, description, deck_type) VALUES ($1, $2, $3, $4) RETURNING *",
      [uuid(), name, description || null, deckType]
    );
    return row ?? null;
  },
};

// Card operations
export const cards = {
  async getDue(db: PGlite, deckId?: string, limit: number = 20): Promise<CardRow[]> {
    let sql = "SELECT * FROM cards WHERE due <= NOW() AND state IN ('new', 'learning', 'review', 'relearning')";
    const params: any[] = [];
    if (deckId) {
      sql += " AND deck_id = $1";
      params.push(deckId);
    }
    sql += ` ORDER BY 
      CASE 
        WHEN state = 'learning' OR state = 'relearning' THEN 1
        WHEN state = 'review' THEN 2  
        WHEN state = 'new' THEN 3
      END,
      due ASC 
      LIMIT ${limit}`;
    return query<CardRow>(db, sql, params);
  },

  async getById(db: PGlite, id: string): Promise<CardRow | null> {
    const [row] = await query<CardRow>(db, "SELECT * FROM cards WHERE id = $1", [id]);
    return row ?? null;
  },

  async create(db: PGlite, deckId: string, fsrsCard: FSRSCard, front: string, back: string): Promise<CardRow | null> {
    const { stability, difficulty, state, due, reps = 0, lapses = 0 } = fsrsCard;
    // Use the due date from the FSRS card if available, otherwise set to now
    const dueDate = due ? due.toISOString() : new Date().toISOString();
    // Convert the FSRS state enum to string for storage
    const stateStr = stateToFsrsState(state);
    const [row] = await query<CardRow>(db,
      `INSERT INTO cards (
        id, deck_id, front, back, due, stability, difficulty, 
        elapsed_days, scheduled_days, reps, lapses, state
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        uuid(),
        deckId,
        front,
        back,
        dueDate,
        stability,
        difficulty,
        (fsrsCard as any).elapsed_days || 0,
        (fsrsCard as any).scheduled_days || 0,
        reps,
        lapses,
        stateStr
      ]
    );
    return row ?? null;
  },

  async update(db: PGlite, id: string, patch: Partial<CardRow>): Promise<CardRow | null> {
    const keys = Object.keys(patch)
    const setClauses = keys.map((key, i) => `${key} = $${i + 2}`)
    if (!keys.includes('updated_at')) setClauses.push('updated_at = NOW()')
    const values = [id, ...Object.values(patch)]

    const [row] = await query<CardRow>(db,
      `UPDATE cards SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
      values
    )
    return row ?? null
  },

  async getCardCounts(db: PGlite, deckId: string, onlyDue: boolean = true): Promise<{ new: number; review: number; learning: number; total: number }> {
    const dueCondition = onlyDue ? " AND due <= NOW()" : "";
    const [row] = await query<{ new: number; review: number; learning: number; total: number }>(db,
      `SELECT
         COUNT(CASE WHEN state = 'new' THEN 1 END) as new,
         COUNT(CASE WHEN state = 'learning'${dueCondition} THEN 1 END) as learning,
         COUNT(CASE WHEN (state = 'review' OR state = 'relearning')${dueCondition} THEN 1 END) as review,
         COUNT(*) as total
       FROM cards
       WHERE deck_id = $1`,
      [deckId]
    );
    return row ?? { new: 0, learning: 0, review: 0, total: 0 };
  },

  async getByDeck(db: PGlite, deckId: string, state?: FsrsState): Promise<CardRow[]> {
    let sql = "SELECT * FROM cards WHERE deck_id = $1";
    const params: any[] = [deckId];

    if (state) {
      sql += " AND state = $2";
      params.push(state);
    }

    sql += " ORDER BY created_at DESC";
    return query<CardRow>(db, sql, params);
  },

  // 批量创建卡片
  async createBatch(
    db: PGlite, 
    cardsData: Array<{
      deckId: string;
      fsrsCard: FSRSCard;
      front: string;
      back: string;
    }>,
    batchSize: number = 100,
    onProgress?: (processed: number, total: number) => void
  ): Promise<CardRow[]> {
    const total = cardsData.length;
    let processed = 0;
    const createdCards: CardRow[] = [];
    
    // 分批处理数据
    for (let i = 0; i < cardsData.length; i += batchSize) {
      const batch = cardsData.slice(i, i + batchSize);
      
      await db.query('BEGIN');
      
      try {
        // 批量插入卡片
        for (const cardData of batch) {
          const { deckId, fsrsCard, front, back } = cardData;
          const { stability, difficulty, state, due, reps = 0, lapses = 0 } = fsrsCard;
          
          // 使用FSRS卡片的到期日期（如果有），否则设置为现在
          const dueDate = due ? due.toISOString() : new Date().toISOString();
          // 将FSRS状态枚举转换为字符串进行存储
          const stateStr = stateToFsrsState(state);
          
          const [row] = await query<CardRow>(db,
            `INSERT INTO cards (
              id, deck_id, front, back, due, stability, difficulty, 
              elapsed_days, scheduled_days, reps, lapses, state
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [
              uuid(),
              deckId,
              front,
              back,
              dueDate,
              stability,
              difficulty,
              (fsrsCard as any).elapsed_days || 0,
              (fsrsCard as any).scheduled_days || 0,
              reps,
              lapses,
              stateStr
            ]
          );
          
          if (row) {
            createdCards.push(row);
          }
        }
        
        await db.query('COMMIT');
        
        // 更新进度
        processed += batch.length;
        if (onProgress) {
          onProgress(processed, total);
        }
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    }
    
    return createdCards;
  }
};

// Review operations
export const reviews = {
  async create(
    db: PGlite,
    cardId: string,
    rating: FsrsRating,
    stateBefore: FsrsState,
    stateAfter: FsrsState,
    stabilityBefore: number,
    stabilityAfter: number,
    difficultyBefore: number,
    difficultyAfter: number,
    reviewDurationMs: number | null = null
  ): Promise<ReviewRow | null> {
    const [row] = await query<ReviewRow>(db,
      `INSERT INTO review_logs (
         id, card_id, rating, review_duration_ms,
         state_before, state_after,
         stability_before, stability_after,
         difficulty_before, difficulty_after
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        uuid(),
        cardId,
        rating,
        reviewDurationMs,
        stateBefore,
        stateAfter,
        stabilityBefore,
        stabilityAfter,
        difficultyBefore,
        difficultyAfter,
      ]
    );
    return row ?? null;
  },

  async getByCard(db: PGlite, cardId: string): Promise<ReviewRow[]> {
    return query<ReviewRow>(db,
      "SELECT * FROM review_logs WHERE card_id = $1 ORDER BY review_time DESC",
      [cardId]
    );
  },
};
