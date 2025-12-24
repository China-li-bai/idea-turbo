/**
 * 认证服务层 (Authentication Service)
 * 
 * 符合 Linus 编程哲学：
 * 1. 简单直接 - 每个方法只做一件事
 * 2. 无特殊情况 - 统一的错误处理和数据访问模式
 * 3. 透明度 - 清晰的数据流向
 * 4. 实用主义 - 解决实际问题，不过度抽象
 * 
 * 这个服务层负责处理所有与认证相关的数据访问逻辑，
 * 包括用户注册、登录、密码重置等。
 */

import { getUnifiedDataAccess, UnifiedDataAccess, checkAndUpdateDataSource } from './UnifiedDataAccess';
import { getSupabaseClient } from '@make-gold/lib/supabase-ios14';

// 用户配置文件类型
export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  full_name?: string;
  avatar_url?: string;
  avatar_color?: string;
  preferred_session_duration?: number;
  daily_goal?: number;
  total_study_time?: number;
  current_streak?: number;
  longest_streak?: number;
  created_at: string;
  updated_at: string;
}

// 认证结果类型
export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

// 密码重置结果类型
export interface PasswordResetResult {
  success: boolean;
  error?: string;
}

// 魔法链接结果类型
export interface MagicLinkResult {
  success: boolean;
  error?: string;
}

/**
 * 认证服务类
 * 
 * 提供所有认证相关的数据访问方法，
 * 使用统一数据访问层进行实际的数据操作。
 */
class AuthService {
  private dataAccess: UnifiedDataAccess;
  private supabaseClient = getSupabaseClient();

  constructor(dataAccess?: UnifiedDataAccess) {
    this.dataAccess = dataAccess || getUnifiedDataAccess();
  }

  /**
   * 用户登录
   * 
   * @param email 邮箱
   * @param password 密码
   * @returns 登录结果
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // 登录成功后，确保用户配置文件存在
      if (data.user) {
        await this.ensureUserProfile(data.user.id, email);
        
        // 检查并更新数据源配置（iOS 14 高级订阅用户）
        await checkAndUpdateDataSource();
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('登录失败:', error);
      return {
        success: false,
        error: '登录失败，请重试'
      };
    }
  }

  /**
   * 用户注册
   * 
   * @param email 邮箱
   * @param password 密码
   * @returns 注册结果
   */
  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabaseClient.auth.signUp({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // 不立即创建 user_profiles
      // 原因：Supabase 可能启用了邮件确认，此时 data.user.identities 为空
      // 用户配置文件将在首次登录时通过 signIn 方法中的 ensureUserProfile 创建

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('注册失败:', error);
      return {
        success: false,
        error: '注册失败，请重试'
      };
    }
  }

  /**
   * 使用魔法链接登录
   * 
   * @param email 邮箱
   * @returns 魔法链接发送结果
   */
  async signInWithOtp(email: string): Promise<MagicLinkResult> {
    try {
      const { error } = await this.supabaseClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('发送魔法链接失败:', error);
      return {
        success: false,
        error: '发送魔法链接失败，请重试'
      };
    }
  }

  /**
   * 重置密码
   * 
   * @param email 邮箱
   * @returns 密码重置结果
   */
  async resetPassword(email: string): Promise<PasswordResetResult> {
    try {
      const { error } = await this.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('重置密码失败:', error);
      return {
        success: false,
        error: '重置密码失败，请重试'
      };
    }
  }

  /**
   * 更新密码
   * 
   * @param newPassword 新密码
   * @returns 更新结果
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('更新密码失败:', error);
      return {
        success: false,
        error: '更新密码失败，请重试'
      };
    }
  }

  /**
   * 登出
   * 
   * @returns 登出结果
   */
  async signOut(): Promise<AuthResult> {
    try {
      const { error } = await this.supabaseClient.auth.signOut();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('登出失败:', error);
      return {
        success: false,
        error: '登出失败，请重试'
      };
    }
  }

  /**
   * 获取当前用户
   * 
   * @returns 当前用户或null
   */
  async getCurrentUser(): Promise<any | null> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      return user;
    } catch (error) {
      console.error('获取当前用户失败:', error);
      return null;
    }
  }

  /**
   * 获取用户配置文件
   * 
   * @param userId 用户ID
   * @returns 用户配置文件或null
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await this.dataAccess.select<UserProfile>(
        'user_profiles',
        '*',
        { id: userId }
      );

      if (result.error) {
        throw result.error;
      }

      if (result.data && result.data.length > 0) {
        return result.data[0];
      }

      return null;
    } catch (error) {
      console.error('获取用户配置文件失败:', error);
      return null;
    }
  }

  /**
   * 创建用户配置文件
   * 
   * @param userId 用户ID
   * @param email 邮箱
   * @returns 创建的用户配置文件
   */
  private async createUserProfile(userId: string, email: string): Promise<UserProfile> {
    try {
      const newProfile = {
        id: userId,
        email,
        display_name: email.split('@')[0], // 默认使用邮箱用户名部分作为显示名称
        subscription_type: 'free' as const, // 新用户默认为免费账户
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await this.dataAccess.insert<UserProfile>('user_profiles', newProfile);

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error('创建用户配置文件失败');
      }

      return result.data;
    } catch (error) {
      console.error('创建用户配置文件失败:', error);
      throw error;
    }
  }

  /**
   * 确保用户配置文件存在
   * 
   * @param userId 用户ID
   * @param email 邮箱
   * @returns 用户配置文件
   */
  private async ensureUserProfile(userId: string, email: string): Promise<UserProfile> {
    try {
      // 尝试获取现有配置文件
      let profile = await this.getUserProfile(userId);

      // 如果配置文件不存在，创建一个新的
      if (!profile) {
        profile = await this.createUserProfile(userId, email);
      }

      return profile;
    } catch (error) {
      console.error('确保用户配置文件存在失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户配置文件
   * 
   * @param userId 用户ID
   * @param profileData 要更新的配置文件数据
   * @returns 更新后的用户配置文件
   */
  async updateUserProfile(
    userId: string,
    profileData: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      // 添加更新时间
      const updateData = {
        ...profileData,
        updated_at: new Date().toISOString()
      };

      const result = await this.dataAccess.update<UserProfile>(
        'user_profiles',
        updateData,
        { id: userId }
      );

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        throw new Error('更新用户配置文件失败');
      }

      return result.data;
    } catch (error) {
      console.error('更新用户配置文件失败:', error);
      throw error;
    }
  }
}

// 创建默认实例
let defaultInstance: AuthService | null = null;

/**
 * 获取默认的认证服务实例
 * 
 * @param dataAccess 可选的数据访问实例
 * @returns AuthService 实例
 */
export function getAuthService(dataAccess?: UnifiedDataAccess): AuthService {
  if (!defaultInstance || dataAccess) {
    defaultInstance = new AuthService(dataAccess);
  }
  return defaultInstance;
}

/**
 * 创建新的认证服务实例
 * 
 * @param dataAccess 数据访问实例
 * @returns AuthService 实例
 */
export function createAuthService(dataAccess: UnifiedDataAccess): AuthService {
  return new AuthService(dataAccess);
}

// 导出类和类型
export { AuthService };
export default AuthService;