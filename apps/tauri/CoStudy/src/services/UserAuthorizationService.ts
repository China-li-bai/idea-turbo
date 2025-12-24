/**
 * 用户权限管理服务 (User Authorization Service)
 * 
 * 遵循 Linus × INTJ 编码哲学：
 * 1. 单一事实源 - 权限状态只从 user_profiles 表读取
 * 2. 默认拒绝 - 未登录/免费用户默认不能访问 Supabase
 * 3. 简单胜过复杂 - 统一的权限检查逻辑
 * 4. 无特殊情况 - 一致的权限判断接口
 * 
 * INTJ 反向思考：
 * - 不是给用户权限，而是验证用户是否有权限
 * - 权限状态是计算出来的，不是存储的
 * - 过期检查是实时的，不依赖定时任务
 */

import type { PGlite } from "@electric-sql/pglite";
import { getSupabaseClient } from "@make-gold/lib/supabase-ios14.tsx";
import { getSingletonInitializedPGlite } from "@make-gold/lib/pglite";

// 权限级别枚举（从低到高）
export type AuthorizationLevel = 'none' | 'local' | 'premium';

// 用户订阅类型（对应数据库）
export type SubscriptionType = 'free' | 'premium';

// 用户权限状态（单一事实源）
export interface UserAuthorizationState {
    isLoggedIn: boolean;
    userId: string | null;
    subscriptionType: SubscriptionType | null;
    subscriptionExpiresAt: Date | null;
    authorizationLevel: AuthorizationLevel;
    canAccessSupabase: boolean;
}

// 用户资料行（对应数据库）
interface UserProfileRow {
    id: string;
    email: string;
    display_name: string;
    subscription_type: SubscriptionType;
    subscription_started_at: string | null;
    subscription_expires_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * 用户权限管理服务
 * 
 * 设计原则：
 * - 权限状态是实时计算的，不是缓存的
 * - 所有权限判断都通过这个服务
 * - 支持本地数据库和 Supabase 的用户查询
 */
export class UserAuthorizationService {
    private currentUserId: string | null = null;
    private currentAuthState: UserAuthorizationState | null = null;
    private mockPremiumMode: boolean = false; // 测试模式：模拟高级用户

    /**
     * 设置测试模式：模拟高级用户
     * 仅用于开发和测试
     */
    setMockPremiumMode(enabled: boolean): void {
        this.mockPremiumMode = enabled;
        this.currentAuthState = null; // 清除缓存
        console.log(`[UserAuthorization] 模拟高级用户模式: ${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 设置当前用户ID（通常在登录时调用）
     */
    setCurrentUser(userId: string | null): void {
        if (this.currentUserId !== userId) {
            this.currentUserId = userId;
            this.currentAuthState = null; // 清除缓存，强制重新计算
        }
    }

    /**
     * 获取当前用户ID
     */
    getCurrentUserId(): string | null {
        return this.currentUserId;
    }

    /**
     * 获取用户权限状态（实时计算）
     * 
     * 优先级：测试模式 > 本地数据库 > Supabase > 未登录状态
     */
    async getUserAuthorizationState(): Promise<UserAuthorizationState> {
        // 如果没有用户ID，直接返回未登录状态
        if (!this.currentUserId) {
            return this.createUnauthorizedState();
        }

        // 测试模式：模拟高级用户
        if (this.mockPremiumMode) {
            return this.createMockPremiumState();
        }

        try {
            // 尝试从本地数据库查询用户信息
            const localProfile = await this.getUserProfileFromLocal(this.currentUserId);
            if (localProfile) {
                return this.computeAuthorizationState(localProfile);
            }

            // 回退到 Supabase 查询
            const supabaseProfile = await this.getUserProfileFromSupabase(this.currentUserId);
            if (supabaseProfile) {
                return this.computeAuthorizationState(supabaseProfile);
            }

            // 用户不存在
            console.warn('[UserAuthorization] 用户不存在:', this.currentUserId);
            return this.createUnauthorizedState();

        } catch (error) {
            console.error('[UserAuthorization] 获取用户权限状态失败:', error);
            return this.createUnauthorizedState();
        }
    }

    /**
     * 检查用户是否可以访问 Supabase
     * 
     * 条件：已登录 && 高级订阅 && 订阅未过期
     */
    async canAccessSupabase(): Promise<boolean> {
        const state = await this.getUserAuthorizationState();
        return state.canAccessSupabase;
    }

    /**
     * 检查用户是否有指定权限级别
     */
    async hasAuthorizationLevel(requiredLevel: AuthorizationLevel): Promise<boolean> {
        const state = await this.getUserAuthorizationState();
        return this.compareAuthorizationLevel(state.authorizationLevel, requiredLevel);
    }

    /**
     * 强制刷新权限状态（清除缓存）
     */
    refreshAuthorizationState(): void {
        this.currentAuthState = null;
    }

    /**
     * 从本地数据库查询用户资料
     * iOS14设备跳过本地查询
     */
    private async getUserProfileFromLocal(userId: string): Promise<UserProfileRow | null> {
        try {
            // iOS14设备检查 - 无本地数据库，直接返回null
            const { isIOS14OrLower } = await import('./PlatformDetectionService');
            if (isIOS14OrLower()) {
                console.log('[UserAuthorization] iOS14设备，跳过本地数据库查询');
                return null;
            }
            
            const db = await getSingletonInitializedPGlite();
            const result = await db.query<UserProfileRow>(
                'SELECT * FROM user_profiles WHERE id = $1 LIMIT 1',
                [userId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.warn('[UserAuthorization] 本地数据库查询失败:', error);
            return null;
        }
    }

    /**
     * 从 Supabase 查询用户资料
     */
    private async getUserProfileFromSupabase(userId: string): Promise<UserProfileRow | null> {
        try {
            const client = getSupabaseClient();
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('[UserAuthorization] Supabase查询失败:', error);
                return null;
            }

            return data as UserProfileRow;
        } catch (error) {
            console.warn('[UserAuthorization] Supabase连接失败:', error);
            return null;
        }
    }

    /**
     * 根据用户资料计算权限状态
     */
    private computeAuthorizationState(profile: UserProfileRow): UserAuthorizationState {
        const now = new Date();
        const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
        
        // 检查订阅是否有效
        const isPremium = profile.subscription_type === 'premium';
        const isSubscriptionValid = !expiresAt || expiresAt > now;
        const hasValidPremium = isPremium && isSubscriptionValid;

        return {
            isLoggedIn: true,
            userId: profile.id,
            subscriptionType: profile.subscription_type,
            subscriptionExpiresAt: expiresAt,
            authorizationLevel: hasValidPremium ? 'premium' : 'local',
            canAccessSupabase: hasValidPremium,
        };
    }

    /**
     * 创建模拟高级用户状态（仅用于测试）
     */
    private createMockPremiumState(): UserAuthorizationState {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1); // 一年后过期
        
        return {
            isLoggedIn: true,
            userId: this.currentUserId,
            subscriptionType: 'premium',
            subscriptionExpiresAt: futureDate,
            authorizationLevel: 'premium',
            canAccessSupabase: true,
        };
    }

    /**
     * 创建未授权状态
     */
    private createUnauthorizedState(): UserAuthorizationState {
        return {
            isLoggedIn: false,
            userId: null,
            subscriptionType: null,
            subscriptionExpiresAt: null,
            authorizationLevel: 'none',
            canAccessSupabase: false,
        };
    }

    /**
     * 比较权限级别
     */
    private compareAuthorizationLevel(current: AuthorizationLevel, required: AuthorizationLevel): boolean {
        const levels: Record<AuthorizationLevel, number> = {
            'none': 0,
            'local': 1,
            'premium': 2,
        };
        return levels[current] >= levels[required];
    }
}

// 全局单例实例
let defaultAuthService: UserAuthorizationService | null = null;

/**
 * 获取默认的用户权限管理服务实例
 */
export function getUserAuthorizationService(): UserAuthorizationService {
    if (!defaultAuthService) {
        defaultAuthService = new UserAuthorizationService();
    }
    return defaultAuthService;
}

/**
 * 创建新的用户权限管理服务实例
 */
export function createUserAuthorizationService(): UserAuthorizationService {
    return new UserAuthorizationService();
}

/**
 * 便捷函数：检查当前用户是否可以访问 Supabase
 */
export async function canCurrentUserAccessSupabase(): Promise<boolean> {
    const service = getUserAuthorizationService();
    return await service.canAccessSupabase();
}

/**
 * 便捷函数：获取当前用户权限状态
 */
export async function getCurrentUserAuthorizationState(): Promise<UserAuthorizationState> {
    const service = getUserAuthorizationService();
    return await service.getUserAuthorizationState();
}