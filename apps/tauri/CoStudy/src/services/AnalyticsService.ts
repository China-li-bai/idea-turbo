/**
 * AnalyticsService - 分析统计业务逻辑服务
 * 
 * 遵循 Linus 编码哲学的智能数据源策略：
 * 1. 单一职责 - 只处理统计分析相关业务逻辑
 * 2. "Good Taste" - 根据数据库初始化状态智能选择数据源
 * 3. 透明度 - 优先本地数据，回退到云端数据
 * 4. 实用主义 - 确保iOS14高级用户能正常获取数据
 */

import type { CardRow, ReviewRow } from "@make-gold/lib/schema";
import { getUnifiedDataAccess, type UnifiedDataAccess } from "./UnifiedDataAccess";
import { shouldUseCloudOnlyModeForPlatform, isIOS14OrLower } from "./PlatformDetectionService";

/**
 * 仪表板指标
 */
export interface DashboardMetrics {
    totalCards: number;
    dueCards: number;
    newCards: number;
    reviewedToday: number;
    todayMinutes: number;
    todayStates: {
        new: number;
        learning: number;
        review: number;
        relearning: number;
    };
    timeline7d: {
        date: string;
        count: number;
        minutes: number;
    }[];
    gradeDist7d: {
        again: number;
        hard: number;
        good: number;
        easy: number;
    };
}

/**
 * RSD 总结（Retention, Stability, Difficulty）
 */
export interface RSDSummary {
    retention: number;
    stabilityAvg: number;
    difficultyAvg: number;
}

/**
 * 留存率数据
 */
export interface RetentionData {
    date: string;
    retention: number;
}

/**
 * 分析服务类
 * 
 * 智能数据源策略：
 * - 优先使用本地数据库（如果已初始化）
 * - 回退到云端数据库（iOS14高级用户或本地数据库不可用时）
 */
export class AnalyticsService {
    private dataAccess: UnifiedDataAccess | null = null;

    /**
     * 获取数据访问实例（iOS14友好的智能选择数据源）
     */
    private async getDataAccess(): Promise<UnifiedDataAccess> {
        if (this.dataAccess) {
            return this.dataAccess;
        }

        try {
            // 优先检查iOS14设备 - 直接使用云端数据库，避免PGlite兼容性问题
            if (isIOS14OrLower()) {
                this.dataAccess = getUnifiedDataAccess({ dataSource: 'supabase' });
                console.log('[AnalyticsService] iOS14设备，强制使用云端数据源（避免PGlite兼容性问题）');
                return this.dataAccess;
            }

            // 非iOS14设备的策略 - 尝试使用本地数据库，失败时回退到云端
            try {
                this.dataAccess = getUnifiedDataAccess({ dataSource: 'local' });
                
                // 测试本地数据库连接
                await this.dataAccess.select('cards', 'COUNT(*) as count', {}, {}, 1);
                console.log('[AnalyticsService] 使用本地数据源');
            } catch (localError) {
                console.warn('[AnalyticsService] 本地数据库不可用，回退到云端:', localError);
                this.dataAccess = getUnifiedDataAccess({ dataSource: 'supabase' });
                console.log('[AnalyticsService] 回退到云端数据源');
            }
        } catch (error) {
            console.error('[AnalyticsService] 数据源选择失败，使用云端配置作为安全策略:', error);
            // 错误时使用云端数据库作为最终回退
            this.dataAccess = getUnifiedDataAccess({ dataSource: 'supabase' });
        }

        return this.dataAccess;
    }

    /**
     * 获取仪表板指标
     */
    async getDashboardMetrics(): Promise<DashboardMetrics> {
        try {
            const dataAccess = await this.getDataAccess();
            
            const cardsResult = await dataAccess.select<CardRow>('cards', '*');
            const cards = cardsResult.data || [];

            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const sevenDaysAgo = new Date(todayStart);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

            // 1. 基础计数
            const totalCards = cards.length;
            const dueCards = cards.filter(card => new Date(card.due) <= now).length;
            const newCards = cards.filter(card => card.state === 'new').length;

            // 2. 获取复习记录
            const reviewsResult = await dataAccess.select<ReviewRow>(
                'review_logs',
                '*',
                {},
                { review_time: 'desc' }
            );
            const reviews = reviewsResult.data || [];

            // 3. 今日复习统计
            const todayReviews = reviews.filter(review =>
                new Date(review.review_time) >= todayStart
            );
            const reviewedToday = todayReviews.length;
            const todayMinutes = Math.round(todayReviews.reduce((sum, r) => sum + (r.duration || 0), 0) / 60000);

            // 4. 今日状态分布 (基于卡片当前状态)
            // 注意：这只是当前快照，不是"今日"的变化，但通常用于展示当前工作量分布
            const todayStates = {
                new: cards.filter(c => c.state === 'new').length,
                learning: cards.filter(c => c.state === 'learning').length,
                review: cards.filter(c => c.state === 'review').length,
                relearning: cards.filter(c => c.state === 'relearning').length,
            };

            // 5. 7天时间线
            const timeline7d = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(todayStart);
                d.setDate(d.getDate() - i);
                const dayStart = d.getTime();
                const dayEnd = dayStart + 86400000;

                const dayReviews = reviews.filter(r => {
                    const t = new Date(r.review_time).getTime();
                    return t >= dayStart && t < dayEnd;
                });

                timeline7d.push({
                    date: d.toISOString().split('T')[0],
                    count: dayReviews.length,
                    minutes: Math.round(dayReviews.reduce((sum, r) => sum + (r.duration || 0), 0) / 60000)
                });
            }

            // 6. 7天评分分布
            const recentReviews = reviews.filter(r =>
                new Date(r.review_time) >= sevenDaysAgo
            );

            const gradeDist7d = {
                again: recentReviews.filter(r => r.rating === 'again').length,
                hard: recentReviews.filter(r => r.rating === 'hard').length,
                good: recentReviews.filter(r => r.rating === 'good').length,
                easy: recentReviews.filter(r => r.rating === 'easy').length,
            };

            return {
                totalCards,
                dueCards,
                newCards,
                reviewedToday,
                todayMinutes,
                todayStates,
                timeline7d,
                gradeDist7d
            };
        } catch (error) {
            console.error('[AnalyticsService] getDashboardMetrics 发生错误:', error);
            return {
                totalCards: 0,
                dueCards: 0,
                newCards: 0,
                reviewedToday: 0,
                todayMinutes: 0,
                todayStates: { new: 0, learning: 0, review: 0, relearning: 0 },
                timeline7d: [],
                gradeDist7d: { again: 0, hard: 0, good: 0, easy: 0 }
            };
        }
    }

    /**
     * 获取 RSD 总结
     */
    async getRsdSummary(): Promise<RSDSummary> {
        try {
            const dataAccess = await this.getDataAccess();
            
            const cardsResult = await dataAccess.select<CardRow>('cards', '*');
            const cards = cardsResult.data || [];

            if (cards.length === 0) {
                return {
                    retention: 0,
                    stabilityAvg: 0,
                    difficultyAvg: 0,
                };
            }

            // 计算平均值
            const totalStability = cards.reduce((sum, card) => sum + (card.stability || 0), 0);
            const totalDifficulty = cards.reduce((sum, card) => sum + (card.difficulty || 0), 0);

            // 简化的留存率计算：基于稳定性
            const stabilityAvg = totalStability / cards.length;
            const difficultyAvg = totalDifficulty / cards.length;
            const retention = Math.min(100, (stabilityAvg / 10) * 100); // 简化计算

            return {
                retention,
                stabilityAvg,
                difficultyAvg,
            };
        } catch (error) {
            console.error('[AnalyticsService] getRsdSummary 发生错误:', error);
            return {
                retention: 0,
                stabilityAvg: 0,
                difficultyAvg: 0,
            };
        }
    }

    /**
     * 获取当前留存率
     */
    async getRetentionNow(): Promise<RetentionData[]> {
        try {
            const dataAccess = await this.getDataAccess();
            
            const cardsResult = await dataAccess.select<CardRow>('cards', '*');
            const cards = cardsResult.data || [];

            // 简化实现：返回最近7天的留存率
            const data: RetentionData[] = [];
            const now = new Date();

            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                // 简化计算：基于卡片状态
                const totalCards = cards.length;
                const activeCards = cards.filter(card =>
                    card.state !== 'new' && new Date(card.last_review || 0) <= date
                ).length;

                const retention = totalCards > 0 ? (activeCards / totalCards) * 100 : 0;

                data.push({
                    date: dateStr,
                    retention,
                });
            }

            return data;
        } catch (error) {
            console.error('[AnalyticsService] getRetentionNow 发生错误:', error);
            return [];
        }
    }
}

// 单例模式
let defaultAnalyticsService: AnalyticsService | null = null;

/**
 * 获取默认的分析服务实例
 */
export function getAnalyticsService(): AnalyticsService {
    if (!defaultAnalyticsService) {
        defaultAnalyticsService = new AnalyticsService();
    }
    return defaultAnalyticsService;
}

/**
 * 创建新的分析服务实例
 */
export function createAnalyticsService(): AnalyticsService {
    return new AnalyticsService();
}
