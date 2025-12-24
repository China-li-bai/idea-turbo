import type { PGlite } from "@electric-sql/pglite";
import type { CardRow } from "@make-gold/lib/schema";
import { cards as cardAccess } from "@make-gold/lib/data-access";
import { createCard as createFsrsCard } from "@make-gold/lib/fsrs";
import { 
  createVocabularyCard as createVocabData,
  deleteVocabularyCard as deleteVocabData 
} from "@make-gold/lib/vocabulary-data-access";
import type { CreateVocabularyCardInput } from "@make-gold/lib/vocabulary-data-access";

/**
 * 创建词汇卡片 (卡片 + 词汇数据)
 */
export async function createVocabularyCard(
  db: PGlite,
  deckId: string,
  front: string,
  vocabularyData: Omit<CreateVocabularyCardInput, 'card_id'>
): Promise<CardRow | null> {
  await db.exec("BEGIN");
  
  try {
    // 1. 创建基础卡片 (使用简化的 back 内容)
    const fsrsCard = createFsrsCard(new Date());
    const card = await cardAccess.create(
      db, 
      deckId, 
      fsrsCard, 
      front, 
      `词汇: ${vocabularyData.word}` // 简化的 back 内容
    );
    
    if (!card) {
      throw new Error('Failed to create card');
    }
    
    // 2. 创建词汇数据
    const vocabularyInput: CreateVocabularyCardInput = {
      ...vocabularyData,
      card_id: card.id
    };
    await createVocabData(db, vocabularyInput);
    
    await db.exec("COMMIT");
    return card;
    
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * 删除词汇卡片 (级联删除词汇数据)
 */
export async function deleteVocabularyCard(
  db: PGlite,
  cardId: string
): Promise<boolean> {
  await db.exec("BEGIN");
  
  try {
    // 删除卡片会级联删除所有相关的词汇数据
    const deleted = await cardAccess.delete(db, cardId);
    await db.exec("COMMIT");
    return deleted;
    
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * 更新词汇数据 (保持卡片的 FSRS 状态不变)
 */
export async function updateVocabularyData(
  db: PGlite,
  cardId: string,
  vocabularyData: Partial<Omit<CreateVocabularyCardInput, 'card_id'>>
): Promise<void> {
  await db.exec("BEGIN");
  
  try {
    // 更新基础词汇信息
    const vocabFields: string[] = [];
    const vocabValues: any[] = [cardId]; // cardId is $1
    let paramIndex = 2;
    
    if (vocabularyData.word !== undefined) {
      vocabFields.push(`word = $${paramIndex++}`);
      vocabValues.push(vocabularyData.word);
    }
    if (vocabularyData.difficulty_level !== undefined) {
      vocabFields.push(`difficulty_level = $${paramIndex++}`);
      vocabValues.push(vocabularyData.difficulty_level);
    }
    if (vocabularyData.ipa_pronunciation !== undefined) {
      vocabFields.push(`ipa_pronunciation = $${paramIndex++}`);
      vocabValues.push(vocabularyData.ipa_pronunciation);
    }
    if (vocabularyData.audio_url !== undefined) {
      vocabFields.push(`audio_url = $${paramIndex++}`);
      vocabValues.push(vocabularyData.audio_url);
    }
    if (vocabularyData.etymology !== undefined) {
      vocabFields.push(`etymology = $${paramIndex++}`);
      vocabValues.push(vocabularyData.etymology);
    }
    if (vocabularyData.mnemonic !== undefined) {
      vocabFields.push(`mnemonic = $${paramIndex++}`);
      vocabValues.push(vocabularyData.mnemonic);
    }
    
    if (vocabFields.length > 0) {
      vocabFields.push(`updated_at = NOW()`);
      await db.query(
        `UPDATE vocabulary_cards SET ${vocabFields.join(', ')} WHERE card_id = $1`,
        vocabValues
      );
    }
    
    // 如果有新的释义，删除旧的并插入新的
    if (vocabularyData.definitions && vocabularyData.definitions.length > 0) {
      await db.query(`DELETE FROM vocabulary_definitions WHERE card_id = $1`, [cardId]);
      
      for (let i = 0; i < vocabularyData.definitions.length; i++) {
        const def = vocabularyData.definitions[i];
        await db.query(
          `INSERT INTO vocabulary_definitions (
            id, card_id, part_of_speech, meaning_en, meaning_zh,
            example_en, example_zh, definition_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `${cardId}_def_${i}`,
            cardId,
            def.part_of_speech,
            def.meaning_en,
            def.meaning_zh,
            def.example_en || null,
            def.example_zh || null,
            def.definition_order || (i + 1)
          ]
        );
      }
    }
    
    // 如果有新的同义词，删除旧的并插入新的
    if (vocabularyData.synonyms) {
      await db.query(`DELETE FROM vocabulary_synonyms WHERE card_id = $1`, [cardId]);
      
      for (const synonym of vocabularyData.synonyms) {
        await db.query(
          `INSERT INTO vocabulary_synonyms (card_id, synonym) VALUES ($1, $2)`,
          [cardId, synonym]
        );
      }
    }
    
    // 如果有新的反义词，删除旧的并插入新的
    if (vocabularyData.antonyms) {
      await db.query(`DELETE FROM vocabulary_antonyms WHERE card_id = $1`, [cardId]);
      
      for (const antonym of vocabularyData.antonyms) {
        await db.query(
          `INSERT INTO vocabulary_antonyms (card_id, antonym) VALUES ($1, $2)`,
          [cardId, antonym]
        );
      }
    }
    
    await db.exec("COMMIT");
    
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}