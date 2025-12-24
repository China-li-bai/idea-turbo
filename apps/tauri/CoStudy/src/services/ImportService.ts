/**
 * ImportService - 批量导入业务逻辑服务
 * 
 * 处理闪卡和词汇卡的批量导入，包括 FSRS 数据初始化
 */

import type { CardRow, VocabularyCardRow, VocabularyDefinitionRow, VocabularySynonymRow, VocabularyAntonymRow } from "@make-gold/lib/schema";
import { getUnifiedDataAccess, type UnifiedDataAccess } from "./UnifiedDataAccess";
import { isIOS14OrLower } from "./PlatformDetectionService";
import { uuid } from "@make-gold/lib/uuid";

export interface FlashcardImportData {
    front: string;
    back: string;
}

export interface VocabularyImportData {
    word: string;
    language_code?: string;
    difficulty_level?: string | null;
    frequency_rank?: number | null;
    ipa_pronunciation?: string | null;
    audio_url?: string | null;
    accent?: string | null;
    etymology?: string | null;
    mnemonic?: string | null;
    definitions?: any[];
    synonyms?: string[];
    antonyms?: string[];
}

export type ProgressCallback = (processed: number, total: number) => void;

/**
 * 导入服务类
 */
export class ImportService {
    private dataAccess: UnifiedDataAccess | null = null;

    /**
     * 获取数据访问实例（简化的二元选择）
     */
    private async getDataAccess(): Promise<UnifiedDataAccess> {
        if (this.dataAccess) {
            return this.dataAccess;
        }

        // Linus-style: 消除特殊情况，简单的二元选择
        if (isIOS14OrLower()) {
            this.dataAccess = getUnifiedDataAccess({ dataSource: 'supabase' });
            console.log('[ImportService] iOS14设备使用云端数据源');
        } else {
            this.dataAccess = getUnifiedDataAccess({ dataSource: 'local' });
            console.log('[ImportService] 非iOS14设备使用本地数据源');
        }

        return this.dataAccess;
    }

    /**
     * 批量导入闪卡
     */
    async importFlashcards(
        deckId: string,
        cards: FlashcardImportData[],
        batchSize: number = 50,
        onProgress?: ProgressCallback
    ): Promise<void> {
        const dataAccess = await this.getDataAccess();
        const total = cards.length;
        let processed = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = cards.slice(i, i + batchSize);
            const cardRows: Partial<CardRow>[] = batch.map(card => ({
                id: uuid(),
                deck_id: deckId,
                front: card.front,
                back: card.back,
                due: new Date().toISOString(),
                stability: 0,
                difficulty: 0,
                elapsed_days: 0,
                scheduled_days: 0,
                reps: 0,
                lapses: 0,
                state: 'new',
                last_review: null,
            }));

            // 使用批量插入（比逐个插入快得多）
            const result = await dataAccess.insertBatch<CardRow>('cards', cardRows);
            if (result.error) {
                console.error('[ImportService] 批量插入闪卡失败:', result.error);
                throw new Error(`Import failed: ${result.error.message}`);
            }

            processed += batch.length;
            if (onProgress) {
                onProgress(processed, total);
            }
        }
    }

    /**
     * 批量导入词汇卡
     */
    async importVocabularyCards(
        deckId: string,
        vocabItems: VocabularyImportData[],
        batchSize: number = 50,
        onProgress?: ProgressCallback
    ): Promise<void> {
        const dataAccess = await this.getDataAccess();
        const total = vocabItems.length;
        let processed = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = vocabItems.slice(i, i + batchSize);

            // 1. 准备基础卡片数据
            const cardRows: Partial<CardRow>[] = [];
            const vocabRows: Partial<VocabularyCardRow>[] = [];
            const definitionRows: Partial<VocabularyDefinitionRow>[] = [];
            const synonymRows: Partial<VocabularySynonymRow>[] = [];
            const antonymRows: Partial<VocabularyAntonymRow>[] = [];

            for (const item of batch) {
                const cardId = uuid();

                // 基础卡片
                cardRows.push({
                    id: cardId,
                    deck_id: deckId,
                    front: item.word,
                    back: this.generateVocabularyBack(item),
                    due: new Date().toISOString(),
                    stability: 0,
                    difficulty: 0,
                    elapsed_days: 0,
                    scheduled_days: 0,
                    reps: 0,
                    lapses: 0,
                    state: 'new',
                    last_review: null,
                });

                // 词汇数据
                vocabRows.push({
                    card_id: cardId,
                    word: item.word,
                    language_code: item.language_code || 'en',
                    difficulty_level: item.difficulty_level as any || null,
                    frequency_rank: item.frequency_rank || null,
                    ipa_pronunciation: item.ipa_pronunciation || null,
                    audio_url: item.audio_url || null,
                    accent: item.accent as any || null,
                    etymology: item.etymology || null,
                    mnemonic: item.mnemonic || null,
                });

                // 定义
                if (item.definitions) {
                    item.definitions.forEach((def, idx) => {
                        definitionRows.push({
                            id: `${cardId}_def_${idx}`,
                            card_id: cardId,
                            part_of_speech: def.part_of_speech,
                            meaning_en: def.meaning_en,
                            meaning_zh: def.meaning_zh,
                            example_en: def.example_en || null,
                            example_zh: def.example_zh || null,
                            definition_order: idx + 1,
                        });
                    });
                }

                // 同义词
                if (item.synonyms) {
                    item.synonyms.forEach(syn => {
                        synonymRows.push({
                            card_id: cardId,
                            synonym: syn
                        });
                    });
                }

                // 反义词
                if (item.antonyms) {
                    item.antonyms.forEach(ant => {
                        antonymRows.push({
                            card_id: cardId,
                            antonym: ant
                        });
                    });
                }
            }

            // 2. 批量插入数据（使用新的批量插入接口）
            console.log(`[ImportService] 开始批量插入 ${cardRows.length} 张卡片`);
            
            const cardResult = await dataAccess.insertBatch<CardRow>('cards', cardRows);
            if (cardResult.error) {
                console.error('批量插入卡片失败:', cardResult.error);
                throw new Error(`Failed to insert cards: ${cardResult.error.message}`);
            }
            const insertedCards = cardResult.data || [];

            // 批量插入词汇信息
            if (vocabRows.length > 0) {
                console.log(`[ImportService] 开始批量插入 ${vocabRows.length} 条词汇信息`);
                const vocabResult = await dataAccess.insertBatch<VocabularyCardRow>('vocabulary_cards', vocabRows);
                if (vocabResult.error) console.error('Failed to insert vocabulary info:', vocabResult.error);
            }

            // 批量插入定义
            if (definitionRows.length > 0) {
                console.log(`[ImportService] 开始批量插入 ${definitionRows.length} 条定义`);
                const defResult = await dataAccess.insertBatch<VocabularyDefinitionRow>('vocabulary_definitions', definitionRows);
                if (defResult.error) console.error('Failed to insert definitions:', defResult.error);
            }

            // 批量插入同义词
            if (synonymRows.length > 0) {
                console.log(`[ImportService] 开始批量插入 ${synonymRows.length} 条同义词`);
                const synResult = await dataAccess.insertBatch<VocabularySynonymRow>('vocabulary_synonyms', synonymRows);
                if (synResult.error) console.error('Failed to insert synonyms:', synResult.error);
            }

            // 批量插入反义词
            if (antonymRows.length > 0) {
                console.log(`[ImportService] 开始批量插入 ${antonymRows.length} 条反义词`);
                const antResult = await dataAccess.insertBatch<VocabularyAntonymRow>('vocabulary_antonyms', antonymRows);
                if (antResult.error) console.error('Failed to insert antonyms:', antResult.error);
            }

            processed += batch.length;
            if (onProgress) {
                onProgress(processed, total);
            }
        }
    }

    /**
     * 生成词汇卡片背面内容 (Helper)
     */
    private generateVocabularyBack(data: VocabularyImportData): string {
        const parts = [];

        if (data.ipa_pronunciation) {
            parts.push(`[${data.ipa_pronunciation}]`);
        }

        if (data.definitions && data.definitions.length > 0) {
            const defs = data.definitions.map(d => {
                let s = `* ${d.part_of_speech} ${d.meaning_zh}`;
                if (d.meaning_en) s += ` (${d.meaning_en})`;
                return s;
            }).join('\n');
            parts.push(defs);
        }

        return parts.join('\n\n');
    }
}

// 单例模式
let defaultImportService: ImportService | null = null;

export function getImportService(dataAccess?: UnifiedDataAccess): ImportService {
    if (!defaultImportService || dataAccess) {
        defaultImportService = new ImportService(dataAccess);
    }
    return defaultImportService;
}

export function createImportService(dataAccess: UnifiedDataAccess): ImportService {
    return new ImportService(dataAccess);
}
