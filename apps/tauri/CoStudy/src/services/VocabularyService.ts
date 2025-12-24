/**
 * VocabularyService - 词汇卡片业务逻辑服务
 * 
 * 处理词汇卡片的特殊数据（发音、定义、例句等）
 */

import { getUnifiedDataAccess, type UnifiedDataAccess } from "./UnifiedDataAccess";
import { createVocabularyCard, getVocabularyCard, type CreateVocabularyCardInput } from "@make-gold/lib/vocabulary-data-access";
import { uuid } from "@make-gold/lib/uuid";

/**
 * 词汇卡片数据结构
 */
export interface VocabularyCardData {
    card_id: string;
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

/**
 * 词汇服务类
 */
export class VocabularyService {
    private dataAccess: UnifiedDataAccess;

    constructor(dataAccess?: UnifiedDataAccess) {
        this.dataAccess = dataAccess || getUnifiedDataAccess();
    }

    /**
     * 创建词汇卡片数据
     */
    async createVocabularyCard(data: VocabularyCardData): Promise<boolean> {
        try {
            // 尝试使用本地优化实现
            const localResult = await this.dataAccess.executeLocal(async (db) => {
                await createVocabularyCard(db, data as CreateVocabularyCardInput);
                return true;
            });

            if (localResult) {
                return true;
            }

            // 回退到通用实现 (Supabase)
            // 需要手动拆分数据并分别插入相关表

            // 1. 准备主表数据
            const { definitions, synonyms, antonyms, ...cardData } = data;

            // 插入 vocabulary_cards
            const cardResult = await this.dataAccess.insert('vocabulary_cards', cardData);
            if (cardResult.error) {
                console.error('[VocabularyService] 创建词汇卡片主表失败:', cardResult.error);
                return false;
            }

            // 2. 插入定义
            if (definitions && definitions.length > 0) {
                const definitionsData = definitions.map((def: any) => ({
                    id: uuid(),
                    card_id: data.card_id,
                    part_of_speech: def.part_of_speech,
                    meaning_en: def.meaning_en,
                    meaning_zh: def.meaning_zh,
                    example_en: def.example_en,
                    example_zh: def.example_zh,
                    definition_order: def.definition_order || 1
                }));

                const defResult = await this.dataAccess.insert('vocabulary_definitions', definitionsData as any);
                if (defResult.error) {
                    console.error('[VocabularyService] 创建词汇定义失败:', defResult.error);
                    // 注意：这里没有回滚机制
                }
            }

            // 3. 插入同义词
            if (synonyms && synonyms.length > 0) {
                const synonymsData = synonyms.map(syn => ({
                    card_id: data.card_id,
                    synonym: syn
                }));

                const synResult = await this.dataAccess.insert('vocabulary_synonyms', synonymsData as any);
                if (synResult.error) {
                    console.error('[VocabularyService] 创建同义词失败:', synResult.error);
                }
            }

            // 4. 插入反义词
            if (antonyms && antonyms.length > 0) {
                const antonymsData = antonyms.map(ant => ({
                    card_id: data.card_id,
                    antonym: ant
                }));

                const antResult = await this.dataAccess.insert('vocabulary_antonyms', antonymsData as any);
                if (antResult.error) {
                    console.error('[VocabularyService] 创建反义词失败:', antResult.error);
                }
            }

            return true;
        } catch (error) {
            console.error('[VocabularyService] createVocabularyCard 发生错误:', error);
            return false;
        }
    }

    /**
     * 获取词汇卡片数据
     */
    async getVocabularyCard(cardId: string): Promise<VocabularyCardData | null> {
        try {
            // 尝试使用本地优化实现
            const localResult = await this.dataAccess.executeLocal(async (db) => {
                return await getVocabularyCard(db, cardId);
            });

            if (localResult) {
                return localResult as unknown as VocabularyCardData;
            }

            // 回退到通用实现
            const result = await this.dataAccess.select<VocabularyCardData>(
                'vocabulary_cards',
                '*',
                { card_id: cardId },
                undefined,
                1
            );

            if (result.error || !result.data || result.data.length === 0) {
                return null;
            }

            return result.data[0];
        } catch (error) {
            console.error('[VocabularyService] getVocabularyCard 发生错误:', error);
            return null;
        }
    }
}

// 单例模式
let defaultVocabularyService: VocabularyService | null = null;

export function getVocabularyService(dataAccess?: UnifiedDataAccess): VocabularyService {
    if (!defaultVocabularyService || dataAccess) {
        defaultVocabularyService = new VocabularyService(dataAccess);
    }
    return defaultVocabularyService;
}

// 向后兼容的导出
export async function createVocabularyCardFn(data: VocabularyCardData): Promise<boolean> {
    const service = getVocabularyService();
    return service.createVocabularyCard(data);
}
