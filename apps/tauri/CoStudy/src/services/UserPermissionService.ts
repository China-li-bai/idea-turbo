/**
 * 用户权限服务 (User Permission Service)
 *
 * 负责处理用户权限和订阅状态相关的业务逻辑
 * 包括检查用户是否可以创建新卡组或卡片
 */

import {
  getUnifiedDataAccess,
  type UnifiedDataAccess,
} from "./UnifiedDataAccess";
export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  avatar_color?: string;

  // 订阅信息
  subscription_type: "free" | "premium";
  subscription_started_at?: string;
  subscription_expires_at?: string;

  // 学习偏好
  preferred_session_duration?: number;
  daily_goal?: number;

  // 统计数据
  total_study_time?: number;
  current_streak?: number;
  longest_streak?: number;

  created_at: string;
  updated_at: string;
}

export interface UserLimitsView {
  id: string;
  email: string;
  subscription_type: "free" | "premium";
  deck_count: number;
  card_count: number;
  deck_limit: number;
  card_limit: number;
  deck_limit_reached: boolean;
  card_limit_reached: boolean;
  last_updated: string;
}
/**
 * 用户权限服务类
 */
export class UserPermissionService {
  private dataAccess: UnifiedDataAccess;

  constructor(dataAccess?: UnifiedDataAccess) {
    this.dataAccess = dataAccess || getUnifiedDataAccess();
  }

  /**
   * 获取用户信息
   *
   * @param userId 用户ID
   * @returns 用户信息或null
   */
  async getUserById(userId: string): Promise<UserRow | null> {
    try {
      const result = await this.dataAccess.select<UserRow>(
        "user_profiles",
        "*",
        { id: userId },
        undefined,
        1
      );

      if (result.error) {
        console.error(
          "[UserPermissionService] 获取用户信息失败:",
          result.error
        );
        return null;
      }

      return result.data && result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error("[UserPermissionService] getUserById 发生错误:", error);
      return null;
    }
  }

  /**
   * 获取用户使用量限制信息
   *
   * @param userId 用户ID
   * @returns 用户限制信息或null
   */
  async getUserLimits(userId: string): Promise<UserLimitsView | null> {
    try {
      const result = await this.dataAccess.select<UserLimitsView>(
        "user_limits",
        "*",
        { id: userId },
        undefined,
        1
      );

      if (result.error) {
        console.error(
          "[UserPermissionService] 获取用户限制信息失败:",
          result.error
        );
        return null;
      }

      return result.data && result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error("[UserPermissionService] getUserLimits 发生错误:", error);
      return null;
    }
  }

  /**
   * 检查用户是否可以创建新卡组
   *
   * @param userId 用户ID
   * @returns 是否可以创建新卡组及原因
   */
  async canCreateDeck(
    userId: string
  ): Promise<{ canCreate: boolean; reason?: string }> {
    try {
      const userLimits = await this.getUserLimits(userId);

      if (!userLimits) {
        // 如果用户限制信息不存在，可能是新用户，允许创建
        return { canCreate: true };
      }

      if (userLimits.deck_limit_reached) {
        return {
          canCreate: false,
          reason: `已达到免费用户卡组限制 (${userLimits.deck_limit}/${userLimits.deck_limit})。升级到高级版以创建更多卡组。`,
        };
      }

      return { canCreate: true };
    } catch (error) {
      console.error("[UserPermissionService] canCreateDeck 发生错误:", error);
      // 出错时默认允许创建，避免阻止用户操作
      return { canCreate: true };
    }
  }

  /**
   * 检查用户是否可以创建新卡片
   *
   * @param userId 用户ID
   * @returns 是否可以创建新卡片及原因
   */
  async canCreateCard(
    userId: string
  ): Promise<{ canCreate: boolean; reason?: string }> {
    try {
      const userLimits = await this.getUserLimits(userId);

      if (!userLimits) {
        // 如果用户限制信息不存在，可能是新用户，允许创建
        return { canCreate: true };
      }

      if (userLimits.card_limit_reached) {
        return {
          canCreate: false,
          reason: `已达到免费用户卡片限制 (${userLimits.card_count}/${userLimits.card_limit})。升级到高级版以创建更多卡片。`,
        };
      }

      return { canCreate: true };
    } catch (error) {
      console.error("[UserPermissionService] canCreateCard 发生错误:", error);
      // 出错时默认允许创建，避免阻止用户操作
      return { canCreate: true };
    }
  }

  /**
   * 检查用户是否为高级用户
   *
   * @param userId 用户ID
   * @returns 是否为高级用户
   */
  async isPremiumUser(userId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);

      if (!user) {
        return false;
      }

      // 检查订阅类型和有效期
      if (user.subscription_type === "premium") {
        // 如果有订阅过期时间，检查是否仍然有效
        if (user.subscription_expires_at) {
          const now = new Date();
          const expiresAt = new Date(user.subscription_expires_at);
          return expiresAt > now;
        }

        // 没有过期时间，认为是永久高级用户
        return true;
      }

      return false;
    } catch (error) {
      console.error("[UserPermissionService] isPremiumUser 发生错误:", error);
      return false;
    }
  }

  /**
   * 升级用户到高级版
   *
   * @param userId 用户ID
   * @param expiresAt 可选的订阅过期时间
   * @returns 是否升级成功
   */
  async upgradeToPremium(userId: string, expiresAt?: string): Promise<boolean> {
    try {
      const result = await this.dataAccess.update<UserRow>(
        "user_profiles",
        {
          subscription_type: "premium",
          subscription_started_at: new Date().toISOString(),
          subscription_expires_at: expiresAt || null,
          updated_at: new Date().toISOString(),
        },
        { id: userId }
      );

      if (result.error) {
        console.error("[UserPermissionService] 升级用户失败:", result.error);
        return false;
      }

      // 更新使用量限制
      await this.dataAccess.update(
        "user_usage_stats",
        {
          deck_limit: 999999, // 高级用户无限制
          card_limit: 999999, // 高级用户无限制
          last_updated: new Date().toISOString(),
        },
        { user_id: userId }
      );

      return true;
    } catch (error) {
      console.error(
        "[UserPermissionService] upgradeToPremium 发生错误:",
        error
      );
      return false;
    }
  }

  /**
   * 降级用户到免费版
   *
   * @param userId 用户ID
   * @returns 是否降级成功
   */
  async downgradeToFree(userId: string): Promise<boolean> {
    try {
      const result = await this.dataAccess.update<UserRow>(
        "user_profiles",
        {
          subscription_type: "free",
          subscription_expires_at: null,
          updated_at: new Date().toISOString(),
        },
        { id: userId }
      );

      if (result.error) {
        console.error("[UserPermissionService] 降级用户失败:", result.error);
        return false;
      }

      // 更新使用量限制
      await this.dataAccess.update(
        "user_usage_stats",
        {
          deck_limit: 5, // 免费用户限制5个卡组
          card_limit: 100, // 免费用户限制100个卡片
          last_updated: new Date().toISOString(),
        },
        { user_id: userId }
      );

      return true;
    } catch (error) {
      console.error("[UserPermissionService] downgradeToFree 发生错误:", error);
      return false;
    }
  }
}

// 单例实例
let userPermissionServiceInstance: UserPermissionService | null = null;

/**
 * 获取用户权限服务实例
 *
 * @param dataAccess 可选的数据访问层实例
 * @returns 用户权限服务实例
 */
export function getUserPermissionService(
  dataAccess?: UnifiedDataAccess
): UserPermissionService {
  if (!userPermissionServiceInstance) {
    userPermissionServiceInstance = new UserPermissionService(dataAccess);
  }
  return userPermissionServiceInstance;
}
