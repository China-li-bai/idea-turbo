/**
 * ReviewService - 复习会话业务逻辑服务
 * 
 * 遵循 Linus 编码哲学：
 * 1. 单一职责 - 只处理复习会话相关业务逻辑
 * 2. 简单胜过复杂 - 集成 FSRS 算法和数据持久化
 * 3. 透明度 - 复习流程清晰可见
 */

import type { CardRow, FsrsRating, ReviewRow } from "@make-gold/lib/schema";
import { getUnifiedDataAccess, type UnifiedDataAccess } from "./UnifiedDataAccess";
import { getCardService, type CardService } from "./CardService";

/**
 * 复习会话数据
 */
export interface ReviewSession {
    deckId: string;
    cards: CardRow[];
    currentIndex: number;
    reviewedCards: Array<{
        cardId: string;
        rating: FsrsRating;
        timestamp: Date;
    }>;
    startTime: Date;
}

/**
 * 复习统计
 */
export interface ReviewStats {
    total: number;
    reviewed: number;
    remaining: number;
    correctCount: number; // good + easy
    incorrectCount: number; // again + hard
    averageTime: number; // ms
}

/**
 * 复习服务类
 * 
 * 提供复习会话管理和复习历史功能
 */
export class ReviewService {
    private dataAccess: UnifiedDataAccess;
    private cardService: CardService;

    constructor(dataAccess?: UnifiedDataAccess, cardService?: CardService) {
        this.dataAccess = dataAccess || getUnifiedDataAccess();
        this.cardService = cardService || getCardService(this.dataAccess);
    }

    /**
     * 开始新的复习会话
     * 
     * @param deckId 牌组ID
     * @param limit 最大卡片数量
     */
    async startReviewSession(deckId: string, limit: number = 20): Promise<ReviewSession | null> {
        try {
            const cards = await this.cardService.getDueCards(deckId, limit);

            if (cards.length === 0) {
                console.log('[ReviewService] 没有到期的卡片');
                return null;
            }

            const session: ReviewSession = {
                deckId,
                cards,
                currentIndex: 0,
                reviewedCards: [],
                startTime: new Date(),
            };

            return session;
        } catch (error) {
            console.error('[ReviewService] startReviewSession 发生错误:', error);
            return null;
        }
    }

    /**
     * 提交评分并更新卡片
     * 
     * @param session 当前复习会话
     * @param rating FSRS 评分
     */
    async submitRating(
        session: ReviewSession,
        rating: FsrsRating
    ): Promise<{ success: boolean; updatedCard: CardRow | null }> {
        try {
            const currentCard = session.cards[session.currentIndex];

            if (!currentCard) {
                console.error('[ReviewService] 当前卡片不存在');
                return { success: false, updatedCard: null };
            }

            // 使用 CardService 复习卡片
            const updatedCard = await this.cardService.reviewCard(currentCard.id, rating);

            if (!updatedCard) {
                return { success: false, updatedCard: null };
            }

            // 记录复习历史
            session.reviewedCards.push({
                cardId: currentCard.id,
                rating,
                timestamp: new Date(),
            });

            // 移动到下一张卡片
            session.currentIndex++;

            return { success: true, updatedCard };
        } catch (error) {
            console.error('[ReviewService] submitRating 发生错误:', error);
            return { success: false, updatedCard: null };
        }
    }

    /**
     * 获取复习会话统计
     * 
     * @param session 复习会话
     */
    getReviewStats(session: ReviewSession): ReviewStats {
        const total = session.cards.length;
        const reviewed = session.reviewedCards.length;
        const remaining = total - reviewed;

        let correctCount = 0;
        let incorrectCount = 0;
        let totalTime = 0;

        for (let i = 0; i < session.reviewedCards.length; i++) {
            const review = session.reviewedCards[i];

            if (review.rating === 'good' || review.rating === 'easy') {
                correctCount++;
            } else {
                incorrectCount++;
            }

            // 计算时间（如果不是第一张卡片）
            if (i > 0) {
                const prevTime = session.reviewedCards[i - 1].timestamp.getTime();
                const currTime = review.timestamp.getTime();
                totalTime += currTime - prevTime;
            }
        }

        const averageTime = reviewed > 1 ? totalTime / (reviewed - 1) : 0;

        return {
            total,
            reviewed,
            remaining,
            correctCount,
            incorrectCount,
            averageTime,
        };
    }

    /**
     * 检查会话是否完成
     * 
     * @param session 复习会话
     */
    isSessionComplete(session: ReviewSession): boolean {
        return session.currentIndex >= session.cards.length;
    }

    /**
     * 获取卡片的复习历史
     * 
     * @param cardId 卡片ID
     */
    async getReviewHistory(cardId: string): Promise<ReviewRow[]> {
        try {
            const result = await this.dataAccess.select<ReviewRow>(
                'review_logs',
                '*',
                { card_id: cardId },
                { review_time: 'desc' }
            );

            if (result.error) {
                console.error('[ReviewService] 获取复习历史失败:', result.error);
                return [];
            }

            return result.data || [];
        } catch (error) {
            console.error('[ReviewService] getReviewHistory 发生错误:', error);
            return [];
        }
    }

    /**
     * 获取复习会话的下一张卡片
     * 
     * @param session 复习会话
     */
    getCurrentCard(session: ReviewSession): CardRow | null {
        if (this.isSessionComplete(session)) {
            return null;
        }
        return session.cards[session.currentIndex];
    }

    /**
     * 获取进度百分比
     * 
     * @param session 复习会话
     */
    getProgress(session: ReviewSession): number {
        if (session.cards.length === 0) return 0;
        return (session.currentIndex / session.cards.length) * 100;
    }
}

// 单例模式
let defaultReviewService: ReviewService | null = null;

/**
 * 获取默认的复习服务实例
 */
export function getReviewService(
    dataAccess?: UnifiedDataAccess,
    cardService?: CardService
): ReviewService {
    if (!defaultReviewService || dataAccess || cardService) {
        defaultReviewService = new ReviewService(dataAccess, cardService);
    }
    return defaultReviewService;
}

/**
 * 创建新的复习服务实例
 */
export function createReviewService(
    dataAccess: UnifiedDataAccess,
    cardService?: CardService
): ReviewService {
    return new ReviewService(dataAccess, cardService);
}
