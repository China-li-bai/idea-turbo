/**
 * CardService - 卡片业务逻辑服务
 * 
 * 遵循 Linus 编码哲学的iOS14友好策略：
 * 1. 单一职责 - 只处理卡片相关业务逻辑  
 * 2. "Good Taste" - 智能数据源选择，iOS14用户使用云端，其他用户优先本地
 * 3. "Never Break Userspace" - 确保iOS14用户能正常访问数据
 * 4. 透明度 - 所有数据操作都有明确的返回值和错误处理
 */

import type { CardRow, FsrsRating, FsrsState } from "@make-gold/lib/schema";
import type { FSRSCard } from "@make-gold/lib/fsrs";
import { uuid } from "@make-gold/lib/uuid";
import {
    scheduleNext,
    fsrsCardToCardRowPatch,
    applyCardRowPatchToFsrsCard,
    stateToFsrsState,
    parseRating
} from "@make-gold/lib/fsrs";
import { cards, reviews } from "@make-gold/lib/data-access";
import { getUnifiedDataAccess, type UnifiedDataAccess } from "./UnifiedDataAccess";
import { isIOS14OrLower } from "./PlatformDetectionService";

/**
 * 卡片服务类
 * 
 * 使用与DeckService相同的iOS14友好策略
 */
export class CardService {
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
            console.log('[CardService] iOS14设备使用云端数据源');
        } else {
            this.dataAccess = getUnifiedDataAccess({ dataSource: 'local' });
            console.log('[CardService] 非iOS14设备使用本地数据源');
        }

        return this.dataAccess;
    }

    /**
     * 获取到期的卡片
     * 
     * @param deckId 牌组ID
     * @param limit 限制返回数量
     */
    async getDueCards(deckId: string, limit: number = 20): Promise<CardRow[]> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // iOS14用户跳过本地数据库，直接使用远程数据库
            if (!isIOS14OrLower()) {
                // 尝试使用本地优化实现
                const localResult = await dataAccess.executeLocal(async (db) => {
                    return await cards.getDue(db, deckId, limit);
                });

                if (localResult) {
                    return localResult;
                }
            }

            // 回退到通用实现 (Supabase)
            const now = new Date().toISOString();

            const result = await dataAccess.select<CardRow>(
                'cards',
                '*',
                {
                    deck_id: deckId,
                },
                { due: 'asc' },
                limit
            );

            if (result.error) {
                console.error('[CardService] 获取到期卡片失败:', result.error);
                return [];
            }

            // 过滤出真正到期的卡片
            const dueCards = (result.data || []).filter(card => {
                const cardDue = new Date(card.due);
                return cardDue <= new Date(now) &&
                    ['new', 'learning', 'review', 'relearning'].includes(card.state);
            });

            return dueCards;
        } catch (error) {
            console.error('[CardService] getDueCards 发生错误:', error);
            return [];
        }
    }

    /**
     * 获取指定牌组的所有卡片
     * 
     * @param deckId 牌组ID
     * @param state 可选的状态筛选
     */
    async getCardsByDeck(deckId: string, state?: FsrsState): Promise<CardRow[]> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // iOS14用户跳过本地数据库，直接使用远程数据库
            if (!isIOS14OrLower()) {
                // 尝试使用本地优化实现
                const localResult = await dataAccess.executeLocal(async (db) => {
                    return await cards.getByDeck(db, deckId, state);
                });

                if (localResult) {
                    return localResult;
                }
            }

            // 回退到通用实现
            const filters: Record<string, any> = { deck_id: deckId };

            if (state) {
                filters.state = state;
            }

            const result = await dataAccess.select<CardRow>(
                'cards',
                '*',
                filters,
                { created_at: 'desc' }
            );

            if (result.error) {
                console.error('[CardService] 获取卡片列表失败:', result.error);
                return [];
            }

            return result.data || [];
        } catch (error) {
            console.error('[CardService] getCardsByDeck 发生错误:', error);
            return [];
        }
    }

    /**
     * 复习卡片并更新 FSRS 状态
     * 
     * @param cardId 卡片ID
     * @param rating FSRS 评分
     */
    async reviewCard(cardId: string, rating: FsrsRating): Promise<CardRow | null> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // 1. 获取当前卡片
            const cardResult = await dataAccess.select<CardRow>(
                'cards',
                '*',
                { id: cardId },
                undefined,
                1
            );

            if (cardResult.error || !cardResult.data || cardResult.data.length === 0) {
                console.error('[CardService] 卡片不存在:', cardId);
                return null;
            }

            const currentCard = cardResult.data[0];

            // 2. 转换为 FSRS 卡片格式
            const fsrsCard = applyCardRowPatchToFsrsCard({} as FSRSCard, currentCard);

            // 3. 使用 FSRS 算法计算下次复习
            const grade = parseRating(rating);
            const schedulingResult = scheduleNext(fsrsCard, grade, new Date());
            const scheduledCard = schedulingResult.card;

            // 4. 转换回数据库格式
            const cardPatch = fsrsCardToCardRowPatch(scheduledCard);
            const now = new Date().toISOString();

            // iOS14用户跳过本地数据库，直接使用远程数据库
            if (!isIOS14OrLower()) {
                // 5. 尝试使用本地优化实现 (同时写入复习日志)
                const localResult = await dataAccess.executeLocal(async (db) => {
                // 更新卡片
                const updatedCard = await cards.update(db, cardId, {
                    ...cardPatch,
                    last_review: now,
                });

                // 记录复习日志
                await reviews.create(
                    db,
                    cardId,
                    rating,
                    stateToFsrsState(fsrsCard.state),
                    stateToFsrsState(scheduledCard.state),
                    (fsrsCard as any).stability || 0,
                    (scheduledCard as any).stability || 0,
                    (fsrsCard as any).difficulty || 0,
                    (scheduledCard as any).difficulty || 0
                );

                return updatedCard;
            });

                if (localResult) {
                    return localResult;
                }
            }

            // 回退到通用实现 (不包含复习日志的原子性保证)
            const updateResult = await dataAccess.update<CardRow>(
                'cards',
                {
                    ...cardPatch,
                    last_review: now,
                },
                { id: cardId }
            );

            if (updateResult.error) {
                console.error('[CardService] 更新卡片失败:', updateResult.error);
                return null;
            }

            return updateResult.data;
        } catch (error) {
            console.error('[CardService] reviewCard 发生错误:', error);
            return null;
        }
    }

    /**
     * 创建新卡片
     * 
     * @param deckId 牌组ID
     * @param front 卡片正面
     * @param back 卡片背面
     * @param fsrsCard 可选的 FSRS 卡片数据（用于导入）
     */
    async createCard(
        deckId: string,
        front: string,
        back: string,
        fsrsCard?: FSRSCard
    ): Promise<CardRow | null> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // iOS14用户跳过本地数据库，直接使用远程数据库
            if (!isIOS14OrLower()) {
                // 尝试使用本地优化实现
                const localResult = await dataAccess.executeLocal(async (db) => {
                    if (fsrsCard) {
                        return await cards.create(db, deckId, fsrsCard, front, back);
                    } else {
                        // 创建默认的初始 FSRS 卡片
                        const defaultFsrsCard = {
                            due: new Date(),
                            stability: 0,
                            difficulty: 0,
                            elapsed_days: 0,
                            scheduled_days: 0,
                            reps: 0,
                            lapses: 0,
                            state: 0, // State.New
                            last_review: undefined,
                            learning_steps: 0
                        } as FSRSCard;
                        return await cards.create(db, deckId, defaultFsrsCard, front, back);
                    }
                });

                if (localResult) {
                    return localResult;
                }
            }

            // 回退到通用实现
            const cardData: Record<string, any> = {
                id: uuid(),
                deck_id: deckId,
                front,
                back,
                due: new Date().toISOString(),
                stability: 0,
                difficulty: 0,
                elapsed_days: 0,
                scheduled_days: 0,
                reps: 0,
                lapses: 0,
                state: 'new',
                last_review: null,
            };

            if (fsrsCard) {
                const patch = fsrsCardToCardRowPatch(fsrsCard);
                Object.assign(cardData, patch);
            }

            const result = await dataAccess.insert<CardRow>('cards', cardData);

            if (result.error) {
                console.error('[CardService] 创建卡片失败:', result.error);
                return null;
            }

            return result.data;
        } catch (error) {
            console.error('[CardService] createCard 发生错误:', error);
            return null;
        }
    }

    /**
     * 更新卡片
     * 
     * @param cardId 卡片ID
     * @param updates 要更新的字段
     */
    async updateCard(cardId: string, updates: Partial<CardRow>): Promise<CardRow | null> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // iOS14用户跳过本地数据库，直接使用远程数据库
            if (!isIOS14OrLower()) {
                // 尝试使用本地优化实现
                const localResult = await dataAccess.executeLocal(async (db) => {
                    return await cards.update(db, cardId, updates);
                });

                if (localResult) {
                    return localResult;
                }
            }

            // 回退到通用实现
            const result = await dataAccess.update<CardRow>(
                'cards',
                updates,
                { id: cardId }
            );

            if (result.error) {
                console.error('[CardService] 更新卡片失败:', result.error);
                return null;
            }

            return result.data;
        } catch (error) {
            console.error('[CardService] updateCard 发生错误:', error);
            return null;
        }
    }

    /**
     * 删除卡片
     * 
     * @param cardId 卡片ID
     */
    async deleteCard(cardId: string): Promise<boolean> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // iOS14用户跳过本地数据库，直接使用远程数据库
            if (!isIOS14OrLower()) {
                // 尝试使用本地优化实现
                // 注意：packages/lib/data-access.ts 目前没有显式的 deleteCard，但我们可以直接用 SQL
                const localResult = await dataAccess.executeLocal(async (db) => {
                    await db.query('DELETE FROM cards WHERE id = $1', [cardId]);
                    return true;
                });

                if (localResult) {
                    return true;
                }
            }

            // 回退到通用实现
            const result = await dataAccess.delete('cards', { id: cardId });

            if (result.error) {
                console.error('[CardService] 删除卡片失败:', result.error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[CardService] deleteCard 发生错误:', error);
            return false;
        }
    }

    /**
     * 获取牌组的卡片统计
     * 
     * @param deckId 牌组ID
     * @param onlyDue 是否只统计到期的卡片
     */
    async getCardCounts(
        deckId: string,
        onlyDue: boolean = false
    ): Promise<{ new: number; learning: number; review: number; total: number }> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // iOS14用户跳过本地数据库，直接使用远程数据库
            if (!isIOS14OrLower()) {
                // 尝试使用本地优化实现
                const localResult = await dataAccess.executeLocal(async (db) => {
                    return await cards.getCardCounts(db, deckId, onlyDue);
                });

                if (localResult) {
                    return localResult;
                }
            }

            // 回退到通用实现
            const cardsList = await this.getCardsByDeck(deckId);
            const now = new Date();

            let newCount = 0;
            let learningCount = 0;
            let reviewCount = 0;

            for (const card of cardsList) {
                const isDue = new Date(card.due) <= now;

                if (onlyDue && !isDue) continue;

                switch (card.state) {
                    case 'new':
                        newCount++;
                        break;
                    case 'learning':
                        if (!onlyDue || isDue) learningCount++;
                        break;
                    case 'review':
                    case 'relearning':
                        if (!onlyDue || isDue) reviewCount++;
                        break;
                }
            }

            return {
                new: newCount,
                learning: learningCount,
                review: reviewCount,
                total: cardsList.length,
            };
        } catch (error) {
            console.error('[CardService] getCardCounts 发生错误:', error);
            return { new: 0, learning: 0, review: 0, total: 0 };
        }
    }
}

// 单例模式
let defaultCardService: CardService | null = null;

/**
 * 获取默认的卡片服务实例
 */
export function getCardService(): CardService {
    if (!defaultCardService) {
        defaultCardService = new CardService();
    }
    return defaultCardService;
}

/**
 * 创建新的卡片服务实例
 */
export function createCardService(): CardService {
    return new CardService();
}
