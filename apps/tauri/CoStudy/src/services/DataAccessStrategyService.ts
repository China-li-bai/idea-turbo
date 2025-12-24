/**
 * 数据访问策略服务 (Data Access Strategy Service)
 * 
 * 遵循 Linus 编程哲学：
 * 1. "Good Taste" - 消除特殊情况，统一数据访问决策
 * 2. "Never Break Userspace" - 页面不再自动发起网络请求
 * 3. 单一职责 - 专门负责数据源选择决策
 * 4. 简单胜过复杂 - 所有用户统一使用本地数据源
 * 
 * 核心设计原则：
 * - 所有用户：仅使用本地数据库进行页面数据访问
 * - Supabase：仅用于用户主动触发的同步操作
 */

import { getAuthService, type AuthService } from './AuthService';
import { getUserPermissionService, type UserPermissionService } from './UserPermissionService';
import { getUnifiedDataAccess, createUnifiedDataAccess, type UnifiedDataAccess, type DataAccessConfig } from './UnifiedDataAccess';
import { createDefaultDataAccessConfig } from '../config/dataSource';

// 用户访问策略
export interface UserAccessStrategy {
  isLoggedIn: boolean;
  isPremiumUser: boolean;
  shouldUseRemote: boolean;
  shouldUseLocal: boolean;
  dataSource: 'local' | 'supabase';
}

/**
 * 数据访问策略服务类
 * 
 * 这是所有数据访问决策的单一入口点
 * 决定用户应该使用本地数据库还是远程数据库
 */
export class DataAccessStrategyService {
  private authService: AuthService;
  private userPermissionService: UserPermissionService;
  private cachedStrategy: UserAccessStrategy | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  constructor(
    authService?: AuthService,
    userPermissionService?: UserPermissionService
  ) {
    this.authService = authService || getAuthService();
    this.userPermissionService = userPermissionService || getUserPermissionService();
  }

  /**
   * 获取当前用户的访问策略
   * 
   * 重要变更：所有用户统一使用本地数据库
   * Supabase 仅用于手动同步操作，不影响页面数据访问
   * 
   * 策略简化：
   * - 任何用户状态 → 本地数据库
   */
  async getCurrentUserStrategy(): Promise<UserAccessStrategy> {
    // 检查缓存
    const now = Date.now();
    if (this.cachedStrategy && now < this.cacheExpiry) {
      return this.cachedStrategy;
    }

    try {
      // 检查用户登录状态
      const currentUser = await this.authService.getCurrentUser();
      
      // 重要变更：无论用户状态如何，统一使用本地数据库
      // 这符合 Linus "Never Break Userspace" 原则
      const strategy: UserAccessStrategy = {
        isLoggedIn: !!currentUser,
        isPremiumUser: currentUser ? await this.userPermissionService.isPremiumUser(currentUser.id) : false,
        shouldUseRemote: false, // 页面数据访问不再使用远程
        shouldUseLocal: true,   // 所有页面数据来自本地
        dataSource: 'local'     // 统一数据源
      };
      
      this.cacheStrategy(strategy);
      return strategy;
    } catch (error) {
      console.error('[DataAccessStrategyService] 获取用户策略失败:', error);
      
      // 错误时默认使用本地数据库（安全第一）
      const fallbackStrategy: UserAccessStrategy = {
        isLoggedIn: false,
        isPremiumUser: false,
        shouldUseRemote: false,
        shouldUseLocal: true,
        dataSource: 'local'
      };
      
      return fallbackStrategy;
    }
  }

  /**
   * 获取适合当前用户的数据访问实例
   * 
   * 根据用户策略返回配置正确的 UnifiedDataAccess 实例
   */
  async getDataAccessForCurrentUser(): Promise<UnifiedDataAccess> {
    const strategy = await this.getCurrentUserStrategy();
    
    const config: DataAccessConfig = createDefaultDataAccessConfig();
    config.dataSource = strategy.dataSource;
    
    if (import.meta.env?.DEV) {
      console.log('[DataAccessStrategyService] 用户数据访问策略:', {
        isLoggedIn: strategy.isLoggedIn,
        isPremium: strategy.isPremiumUser,
        dataSource: strategy.dataSource
      });
    }
    
    return createUnifiedDataAccess(config);
  }

  /**
   * 检查当前用户是否可以访问远程数据
   * 
   * @returns 是否可以访问远程数据
   */
  async canAccessRemoteData(): Promise<boolean> {
    const strategy = await this.getCurrentUserStrategy();
    return strategy.shouldUseRemote;
  }

  /**
   * 检查当前用户是否只能使用本地数据
   * 
   * @returns 是否只能使用本地数据
   */
  async isLocalOnly(): Promise<boolean> {
    const strategy = await this.getCurrentUserStrategy();
    return strategy.shouldUseLocal && !strategy.shouldUseRemote;
  }

  /**
   * 清除策略缓存
   * 
   * 在用户登录/登出状态变化时调用
   */
  clearCache(): void {
    this.cachedStrategy = null;
    this.cacheExpiry = 0;
  }

  /**
   * 缓存策略结果
   * 
   * @param strategy 要缓存的策略
   */
  private cacheStrategy(strategy: UserAccessStrategy): void {
    this.cachedStrategy = strategy;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }

  /**
   * 当用户登录状态改变时更新策略
   * 
   * @param isLoggedIn 新的登录状态
   */
  onAuthStateChanged(isLoggedIn: boolean): void {
    // 清除缓存，强制重新计算策略
    this.clearCache();
    
    if (import.meta.env?.DEV) {
      console.log('[DataAccessStrategyService] 用户认证状态改变:', { isLoggedIn });
    }
  }

  /**
   * 当用户订阅状态改变时更新策略
   * 
   * @param isPremium 新的订阅状态
   */
  onSubscriptionChanged(isPremium: boolean): void {
    // 清除缓存，强制重新计算策略
    this.clearCache();
    
    if (import.meta.env?.DEV) {
      console.log('[DataAccessStrategyService] 用户订阅状态改变:', { isPremium });
    }
  }
}

// 单例实例
let dataAccessStrategyServiceInstance: DataAccessStrategyService | null = null;

/**
 * 获取数据访问策略服务实例
 * 
 * @param authService 可选的认证服务实例
 * @param userPermissionService 可选的用户权限服务实例
 * @returns 数据访问策略服务实例
 */
export function getDataAccessStrategyService(
  authService?: AuthService,
  userPermissionService?: UserPermissionService
): DataAccessStrategyService {
  if (!dataAccessStrategyServiceInstance || authService || userPermissionService) {
    dataAccessStrategyServiceInstance = new DataAccessStrategyService(
      authService,
      userPermissionService
    );
  }
  return dataAccessStrategyServiceInstance;
}

/**
 * 创建新的数据访问策略服务实例
 * 
 * @param authService 认证服务实例
 * @param userPermissionService 用户权限服务实例
 * @returns 数据访问策略服务实例
 */
export function createDataAccessStrategyService(
  authService: AuthService,
  userPermissionService: UserPermissionService
): DataAccessStrategyService {
  return new DataAccessStrategyService(authService, userPermissionService);
}

// 导出类
export default DataAccessStrategyService;