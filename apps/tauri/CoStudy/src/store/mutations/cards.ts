import type { PGlite } from "@electric-sql/pglite";
import type { CardRow, FsrsRating } from "@make-gold/lib/schema";
import { cards as cardAccess, reviews as reviewAccess } from "@make-gold/lib/data-access";
import {
  createCard as createFsrsCard,
  applyCardRowPatchToFsrsCard,
  fsrsCardToCardRowPatch,
  fsrsRatingStringToGrade,
  scheduleNext,
} from "@make-gold/lib/fsrs";

/**
 * 建立新卡片（FSRS 初始狀態），立即寫入 DB
 */
export async function createCard(
  db: PGlite,
  deckId: string,
  front: string,
  back: string
): Promise<CardRow | null> {
  const fsrsCard = createFsrsCard(new Date());
  return cardAccess.create(db, deckId, fsrsCard, front, back);
}

/**
 * 更新卡片部分欄位（直寫）
 */
export async function updateCard(
  db: PGlite,
  id: string,
  patch: Partial<CardRow>
): Promise<CardRow | null> {
  return cardAccess.update(db, id, patch);
}

/**
 * 進行一次複習：
 * - 基於 FSRS 算法計算下一狀態與 due
 * - 原子化地更新卡片並插入 review_logs
 */
export async function reviewCard(
  db: PGlite,
  card: CardRow,
  rating: FsrsRating,
  reviewDurationMs: number | null = null
): Promise<CardRow | null> {
  // 構造 FSRS 當前卡片（從 DB 狀態注入）
  const currentFsrs = applyCardRowPatchToFsrsCard(
    createFsrsCard(new Date(card.created_at)),
    {
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      learning_steps: card.learning_steps,
      state: card.state,
      last_review: card.last_review ?? undefined,
    }
  );

  // 依用戶評分計算下一狀態
  const grade = fsrsRatingStringToGrade(rating);
  const next = scheduleNext(currentFsrs, grade, new Date());
  const nextPatch = fsrsCardToCardRowPatch(next.card);

  // 原子化更新：BEGIN -> UPDATE cards -> INSERT review_logs -> COMMIT
  await db.exec("BEGIN");
  try {
    const updated = await cardAccess.update(db, card.id, nextPatch);
    await reviewAccess.create(
      db,
      card.id,
      rating,
      card.state,
      nextPatch.state!,
      card.stability,
      nextPatch.stability!,
      card.difficulty,
      nextPatch.difficulty!,
      reviewDurationMs
    );
    await db.exec("COMMIT");
    return updated;
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }
}