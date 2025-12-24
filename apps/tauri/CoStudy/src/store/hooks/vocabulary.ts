import { useLiveQuery } from "@electric-sql/pglite-react";
import type { VocabularyCard } from '@make-gold/lib/vocabulary-data-access';
import { useDatabase } from "@make-gold/lib/database-provider";

export function useVocabularyCard(cardId: string): VocabularyCard | null {
  const { db, isLoading } = useDatabase();

  // 數據庫未準備好時返回 null，避免 LiveQuery 報錯
  if (!db || isLoading) {
    return null;
  }

  // 获取基础词汇信息
  const vocabRows = useLiveQuery(
    `SELECT * FROM vocabulary_cards WHERE card_id = $1`,
    [cardId]
  ) as any[] | null;

  // 获取释义
  const definitionRows = useLiveQuery(
    `SELECT * FROM vocabulary_definitions WHERE card_id = $1 ORDER BY definition_order ASC`,
    [cardId]
  ) as any[] | null;

  // 获取同义词
  const synonymRows = useLiveQuery(
    `SELECT synonym FROM vocabulary_synonyms WHERE card_id = $1`,
    [cardId]
  ) as any[] | null;

  // 获取反义词
  const antonymRows = useLiveQuery(
    `SELECT antonym FROM vocabulary_antonyms WHERE card_id = $1`,
    [cardId]
  ) as any[] | null;

  // 如果没有词汇基础信息，返回 null
  if (!vocabRows || vocabRows.length === 0) {
    return null;
  }

  const vocabCard = vocabRows[0];

  // 安全检查：确保 vocabCard 存在
  if (!vocabCard) {
    return null;
  }

  // 确保不使用 vocabCard 中可能存在的错误 definitions 字段
  const { definitions: _, ...cleanVocabCard } = vocabCard;

  const result = {
    ...cleanVocabCard,
    definitions: Array.isArray(definitionRows) ? definitionRows : [],
    synonyms: synonymRows?.map(row => row.synonym) ?? [],
    antonyms: antonymRows?.map(row => row.antonym) ?? []
  };

  return result;
}

export function useIsVocabularyCard(cardId: string): boolean {
  const { db, isLoading } = useDatabase();

  // 數據庫未準備好時返回 false，避免 LiveQuery 報錯
  if (!db || isLoading) {
    return false;
  }

  const rows = useLiveQuery(
    `SELECT 1 FROM vocabulary_cards WHERE card_id = $1`,
    [cardId]
  ) as any[] | null;

  return rows !== null && rows.length > 0;
}