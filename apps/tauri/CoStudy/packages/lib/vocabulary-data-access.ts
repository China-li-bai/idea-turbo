import type { PGlite } from '@electric-sql/pglite'
import type { 
  VocabularyCardRow, 
  VocabularyDefinitionRow, 
  VocabularySynonymRow, 
  VocabularyAntonymRow,
  DifficultyLevel,
  AccentType 
} from './schema'

// 完整的词汇数据结构 (组合查询结果)
export interface VocabularyCard {
  card_id: string
  word: string
  language_code: string
  difficulty_level?: DifficultyLevel | null
  frequency_rank?: number | null
  ipa_pronunciation?: string | null
  audio_url?: string | null
  accent?: AccentType | null
  etymology?: string | null
  mnemonic?: string | null
  definitions: VocabularyDefinitionRow[]
  synonyms: string[]
  antonyms: string[]
}

// 创建词汇卡片数据
export interface CreateVocabularyCardInput {
  card_id: string
  word: string
  language_code?: string
  difficulty_level?: DifficultyLevel
  frequency_rank?: number
  ipa_pronunciation?: string
  audio_url?: string
  accent?: AccentType
  etymology?: string
  mnemonic?: string
  definitions: Array<{
    part_of_speech: string
    meaning_en: string
    meaning_zh: string
    example_en?: string
    example_zh?: string
    definition_order?: number
  }>
  synonyms?: string[]
  antonyms?: string[]
}

// 检查卡片是否为词汇卡片
export async function isVocabularyCard(db: PGlite, cardId: string): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM vocabulary_cards WHERE card_id = $1`,
    [cardId]
  )
  return result.rows.length > 0
}

// 获取完整的词汇卡片数据
export async function getVocabularyCard(db: PGlite, cardId: string): Promise<VocabularyCard | null> {
  // 获取基础词汇信息
  const vocabResult = await db.query<VocabularyCardRow>(
    `SELECT * FROM vocabulary_cards WHERE card_id = $1`,
    [cardId]
  )
  
  if (vocabResult.rows.length === 0) {
    return null
  }
  
  const vocabCard = vocabResult.rows[0]
  
  // 获取释义 (按顺序排序)
  const definitionsResult = await db.query<VocabularyDefinitionRow>(
    `SELECT * FROM vocabulary_definitions 
     WHERE card_id = $1 
     ORDER BY definition_order ASC`,
    [cardId]
  )
  
  // 获取同义词
  const synonymsResult = await db.query<VocabularySynonymRow>(
    `SELECT synonym FROM vocabulary_synonyms WHERE card_id = $1`,
    [cardId]
  )
  
  // 获取反义词
  const antonymsResult = await db.query<VocabularyAntonymRow>(
    `SELECT antonym FROM vocabulary_antonyms WHERE card_id = $1`,
    [cardId]
  )
  
  return {
    ...vocabCard,
    definitions: definitionsResult.rows,
    synonyms: synonymsResult.rows.map(row => row.synonym),
    antonyms: antonymsResult.rows.map(row => row.antonym)
  }
}

// 创建词汇卡片数据
export async function createVocabularyCard(db: PGlite, input: CreateVocabularyCardInput): Promise<void> {
  await db.query('BEGIN')
  
  try {
    // 创建基础词汇信息
    await db.query(
      `INSERT INTO vocabulary_cards (
        card_id, word, language_code, difficulty_level, frequency_rank,
        ipa_pronunciation, audio_url, accent, etymology, mnemonic
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.card_id,
        input.word,
        input.language_code || 'en',
        input.difficulty_level || null,
        input.frequency_rank || null,
        input.ipa_pronunciation || null,
        input.audio_url || null,
        input.accent || null,
        input.etymology || null,
        input.mnemonic || null
      ]
    )
    
    // 创建释义
    for (let i = 0; i < input.definitions.length; i++) {
      const def = input.definitions[i]
      await db.query(
        `INSERT INTO vocabulary_definitions (
          id, card_id, part_of_speech, meaning_en, meaning_zh,
          example_en, example_zh, definition_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `${input.card_id}_def_${i}`,
          input.card_id,
          def.part_of_speech,
          def.meaning_en,
          def.meaning_zh,
          def.example_en || null,
          def.example_zh || null,
          def.definition_order || (i + 1)
        ]
      )
    }
    
    // 创建同义词
    if (input.synonyms) {
      for (const synonym of input.synonyms) {
        await db.query(
          `INSERT INTO vocabulary_synonyms (card_id, synonym) VALUES ($1, $2)`,
          [input.card_id, synonym]
        )
      }
    }
    
    // 创建反义词
    if (input.antonyms) {
      for (const antonym of input.antonyms) {
        await db.query(
          `INSERT INTO vocabulary_antonyms (card_id, antonym) VALUES ($1, $2)`,
          [input.card_id, antonym]
        )
      }
    }
    
    await db.query('COMMIT')
  } catch (error) {
    await db.query('ROLLBACK')
    throw error
  }
}

// 删除词汇卡片数据 (级联删除会自动处理关联表)
export async function deleteVocabularyCard(db: PGlite, cardId: string): Promise<void> {
  await db.query(`DELETE FROM vocabulary_cards WHERE card_id = $1`, [cardId])
}

// 批量创建词汇卡片数据
export async function createVocabularyCardsBatch(
  db: PGlite, 
  inputs: CreateVocabularyCardInput[],
  batchSize: number = 100,
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  const total = inputs.length;
  let processed = 0;
  
  // 分批处理数据
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    
    await db.query('BEGIN');
    
    try {
      // 批量插入基础词汇信息
      for (const input of batch) {
        await db.query(
          `INSERT INTO vocabulary_cards (
            card_id, word, language_code, difficulty_level, frequency_rank,
            ipa_pronunciation, audio_url, accent, etymology, mnemonic
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            input.card_id,
            input.word,
            input.language_code || 'en',
            input.difficulty_level || null,
            input.frequency_rank || null,
            input.ipa_pronunciation || null,
            input.audio_url || null,
            input.accent || null,
            input.etymology || null,
            input.mnemonic || null
          ]
        );
      }
      
      // 批量插入释义
      for (const input of batch) {
        for (let i = 0; i < input.definitions.length; i++) {
          const def = input.definitions[i];
          await db.query(
            `INSERT INTO vocabulary_definitions (
              id, card_id, part_of_speech, meaning_en, meaning_zh,
              example_en, example_zh, definition_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              `${input.card_id}_def_${i}`,
              input.card_id,
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
      
      // 批量插入同义词
      for (const input of batch) {
        if (input.synonyms) {
          for (const synonym of input.synonyms) {
            await db.query(
              `INSERT INTO vocabulary_synonyms (card_id, synonym) VALUES ($1, $2)`,
              [input.card_id, synonym]
            );
          }
        }
      }
      
      // 批量插入反义词
      for (const input of batch) {
        if (input.antonyms) {
          for (const antonym of input.antonyms) {
            await db.query(
              `INSERT INTO vocabulary_antonyms (card_id, antonym) VALUES ($1, $2)`,
              [input.card_id, antonym]
            );
          }
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
}

// 按难度获取词汇卡片
export async function getVocabularyCardsByDifficulty(
  db: PGlite, 
  difficulty: DifficultyLevel
): Promise<VocabularyCard[]> {
  const result = await db.query<VocabularyCardRow>(
    `SELECT * FROM vocabulary_cards WHERE difficulty_level = $1`,
    [difficulty]
  )
  
  // 为每个卡片获取完整数据
  const cards: VocabularyCard[] = []
  for (const vocabCard of result.rows) {
    const fullCard = await getVocabularyCard(db, vocabCard.card_id)
    if (fullCard) {
      cards.push(fullCard)
    }
  }
  
  return cards
}

// 搜索词汇 (按词汇名称)
export async function searchVocabularyByWord(db: PGlite, searchTerm: string): Promise<VocabularyCard[]> {
  const result = await db.query<VocabularyCardRow>(
    `SELECT * FROM vocabulary_cards WHERE word ILIKE $1`,
    [`%${searchTerm}%`]
  )
  
  const cards: VocabularyCard[] = []
  for (const vocabCard of result.rows) {
    const fullCard = await getVocabularyCard(db, vocabCard.card_id)
    if (fullCard) {
      cards.push(fullCard)
    }
  }
  
  return cards
}