/**
 * DeckService - 牌组业务逻辑服务
 * 
 * 遵循 Linus 编码哲学的iOS14友好策略：
 * 1. 单一职责 - 只处理牌组相关业务逻辑  
 * 2. "Good Taste" - 智能数据源选择，iOS14用户使用云端，其他用户优先本地
 * 3. "Never Break Userspace" - 确保iOS14用户能正常访问数据
 * 4. 透明度 - 所有数据操作都有明确的返回值和错误处理
 */

import type { DeckRow, DeckType } from "@make-gold/lib/schema";
import { decks } from "@make-gold/lib/data-access";
import { getUnifiedDataAccess, type UnifiedDataAccess } from "./UnifiedDataAccess";
import { isIOS14OrLower } from "./PlatformDetectionService";
import { getCardService, type CardService } from "./CardService";
import { uuid } from "@make-gold/lib/uuid";

/**
 * 牌组服务类
 * 
 * 使用与AnalyticsService相同的iOS14友好策略
 */
export class DeckService {
    private dataAccess: UnifiedDataAccess | null = null;
    private cardService: CardService | null = null;

    /**
     * 构造函数
     */
    constructor(cardService?: CardService) {
        this.cardService = cardService || null;
    }

    /**
     * 获取CardService实例
     */
    private getCardService(): CardService {
        if (!this.cardService) {
            this.cardService = getCardService();
        }
        return this.cardService;
    }

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
            console.log('[DeckService] iOS14设备使用云端数据源');
        } else {
            this.dataAccess = getUnifiedDataAccess({ dataSource: 'local' });
            console.log('[DeckService] 非iOS14设备使用本地数据源');
        }

        return this.dataAccess;
    }

    /**
     * 获取所有牌组
     * 
     * Linus-style 设计：iOS14友好的智能数据源选择
     */
    async getAllDecks(): Promise<DeckRow[]> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // 只有明确使用本地数据源时才尝试executeLocal
            if (dataAccess.isUsingLocal() && !isIOS14OrLower()) {
                try {
                    // 检查是否可以使用本地优化
                    const localResult = await dataAccess.executeLocal(async (db) => {
                        return await decks.getAll(db);
                    });

                    if (localResult) {
                        return localResult;
                    }
                } catch (localError) {
                    console.warn('[DeckService] 本地数据库操作失败，使用通用查询:', localError);
                }
            }

            // 使用智能数据源进行查询
            const result = await dataAccess.select<DeckRow>(
                'decks',
                '*',
                {},
                { created_at: 'desc' }
            );

            if (result.error) {
                console.error('[DeckService] 获取牌组列表失败:', result.error);
                return [];
            }

            return result.data || [];
        } catch (error) {
            console.error('[DeckService] getAllDecks 发生错误:', error);
            return [];
        }
    }

    /**
     * 根据ID获取牌组
     * 
     * @param deckId 牌组ID
     */
    async getDeckById(deckId: string): Promise<DeckRow | null> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // 只有明确使用本地数据源时才尝试executeLocal
            if (dataAccess.isUsingLocal() && !isIOS14OrLower()) {
                try {
                    // 尝试使用本地优化实现
                    const localResult = await dataAccess.executeLocal(async (db) => {
                        return await decks.getById(db, deckId);
                    });

                    if (localResult) {
                        return localResult;
                    }
                } catch (localError) {
                    console.warn('[DeckService] 本地数据库操作失败，使用通用查询:', localError);
                }
            }

            // 使用智能数据源进行查询
            const result = await dataAccess.select<DeckRow>(
                'decks',
                '*',
                { id: deckId },
                undefined,
                1
            );

            if (result.error) {
                console.error('[DeckService] 获取牌组失败:', result.error);
                return null;
            }

            return result.data && result.data.length > 0 ? result.data[0] : null;
        } catch (error) {
            console.error('[DeckService] getDeckById 发生错误:', error);
            return null;
        }
    }

    /**
     * 创建新牌组
     * 
     * @param name 牌组名称
     * @param description 牌组描述
     * @param deckType 牌组类型
     */
    async createDeck(
        name: string,
        description?: string,
        deckType: DeckType = 'mixed'
    ): Promise<DeckRow | null> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // 只有明确使用本地数据源时才尝试executeLocal
            if (dataAccess.isUsingLocal() && !isIOS14OrLower()) {
                try {
                    // 尝试使用本地优化实现
                    const localResult = await dataAccess.executeLocal(async (db) => {
                        return await decks.create(db, name, description, deckType);
                    });

                    if (localResult) {
                        return localResult;
                    }
                } catch (localError) {
                    console.warn('[DeckService] 本地数据库操作失败，使用通用查询:', localError);
                }
            }

            // 使用远程数据源
            const deckData: any = {
                id: uuid(),
                name,
                description: description || null,
                deck_type: deckType,
            };

            const result = await dataAccess.insert<DeckRow>('decks', deckData);

            if (result.error) {
                console.error('[DeckService] 创建牌组失败:', result.error);
                return null;
            }

            return result.data;
        } catch (error) {
            console.error('[DeckService] createDeck 发生错误:', error);
            return null;
        }
    }

    /**
     * 更新牌组
     * 
     * @param deckId 牌组ID
     * @param updates 要更新的字段
     */
    async updateDeck(deckId: string, updates: Partial<DeckRow>): Promise<DeckRow | null> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // 只有明确使用本地数据源时才尝试executeLocal
            if (dataAccess.isUsingLocal() && !isIOS14OrLower()) {
                try {
                    // 尝试使用本地优化实现
                    const localResult = await dataAccess.executeLocal(async (db) => {
                        const keys = Object.keys(updates);
                        const setClauses = keys.map((key, i) => `${key} = $${i + 2}`);
                        if (!keys.includes('updated_at')) setClauses.push('updated_at = NOW()');
                        const values = [deckId, ...Object.values(updates)];

                        const result = await db.query<DeckRow>(
                            `UPDATE decks SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
                            values
                        );
                        return result.rows[0] || null;
                    });

                    if (localResult) {
                        return localResult;
                    }
                } catch (localError) {
                    console.warn('[DeckService] 本地数据库操作失败，使用通用查询:', localError);
                }
            }

            // 使用策略决定的数据源
            const result = await dataAccess.update<DeckRow>(
                'decks',
                updates,
                { id: deckId }
            );

            if (result.error) {
                console.error('[DeckService] 更新牌组失败:', result.error);
                return null;
            }

            return result.data;
        } catch (error) {
            console.error('[DeckService] updateDeck 发生错误:', error);
            return null;
        }
    }

    /**
     * 删除牌组
     * 
     * @param deckId 牌组ID
     */
    async deleteDeck(deckId: string): Promise<boolean> {
        try {
            const dataAccess = await this.getDataAccess();
            
            // 只有明确使用本地数据源时才尝试executeLocal
            if (dataAccess.isUsingLocal() && !isIOS14OrLower()) {
                try {
                    // 尝试使用本地优化实现
                    const localResult = await dataAccess.executeLocal(async (db) => {
                        // 级联删除由数据库约束处理，或者我们可以显式删除
                        await db.query('DELETE FROM decks WHERE id = $1', [deckId]);
                        return true;
                    });

                    if (localResult) {
                        return true;
                    }
                } catch (localError) {
                    console.warn('[DeckService] 本地数据库操作失败，使用通用查询:', localError);
                }
            }

            // 使用远程数据源
            // 首先删除该牌组下的所有卡片
            await dataAccess.delete('cards', { deck_id: deckId });

            // 然后删除牌组
            const result = await dataAccess.delete('decks', { id: deckId });

            if (result.error) {
                console.error('[DeckService] 删除牌组失败:', result.error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('[DeckService] deleteDeck 发生错误:', error);
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
        return this.getCardService().getCardCounts(deckId, onlyDue);
    }

    /**
     * 批量获取多个牌组的卡片统计
     * 
     * @param deckIds 牌组ID列表
     * @param onlyDue 是否只统计到期的卡片
     */
    async getBatchCardCounts(
        deckIds: string[],
        onlyDue: boolean = false
    ): Promise<Record<string, { new: number; learning: number; review: number; total: number }>> {
        const result: Record<string, any> = {};

        // 并行获取所有牌组的统计
        await Promise.all(
            deckIds.map(async (deckId) => {
                const counts = await this.getCardCounts(deckId, onlyDue);
                result[deckId] = counts;
            })
        );

        return result;
    }
}

// 单例模式
let defaultDeckService: DeckService | null = null;

/**
 * 获取默认的牌组服务实例
 */
export function getDeckService(cardService?: CardService): DeckService {
    if (!defaultDeckService || cardService) {
        defaultDeckService = new DeckService(cardService);
    }
    return defaultDeckService;
}

/**
 * 创建新的牌组服务实例
 */
export function createDeckService(cardService?: CardService): DeckService {
    return new DeckService(cardService);
}
