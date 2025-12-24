/**
 * 数据访问策略服务测试
 * 
 * 验证用户权限和数据源选择逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataAccessStrategyService } from '@/services/DataAccessStrategyService';
import type { AuthService } from '@/services/AuthService';
import type { UserPermissionService } from '@/services/UserPermissionService';

// Mock services
const mockAuthService = {
  getCurrentUser: vi.fn(),
} as Partial<AuthService> as AuthService;

const mockUserPermissionService = {
  isPremiumUser: vi.fn(),
} as Partial<UserPermissionService> as UserPermissionService;

describe('DataAccessStrategyService', () => {
  let strategyService: DataAccessStrategyService;

  beforeEach(() => {
    // 重置所有 mocks
    vi.clearAllMocks();
    
    // 创建新的策略服务实例
    strategyService = new DataAccessStrategyService(
      mockAuthService,
      mockUserPermissionService
    );
    
    // 清除缓存
    strategyService.clearCache();
  });

  describe('未登录用户', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue(null);
    });

    it('应该返回本地数据源策略', async () => {
      const strategy = await strategyService.getCurrentUserStrategy();
      
      expect(strategy).toEqual({
        isLoggedIn: false,
        isPremiumUser: false,
        shouldUseRemote: false,
        shouldUseLocal: true,
        dataSource: 'local'
      });
    });

    it('应该禁止访问远程数据', async () => {
      const canAccessRemote = await strategyService.canAccessRemoteData();
      expect(canAccessRemote).toBe(false);
    });

    it('应该只能使用本地数据', async () => {
      const isLocalOnly = await strategyService.isLocalOnly();
      expect(isLocalOnly).toBe(true);
    });
  });

  describe('免费用户', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user123' });
      mockUserPermissionService.isPremiumUser.mockResolvedValue(false);
    });

    it('应该返回本地数据源策略', async () => {
      const strategy = await strategyService.getCurrentUserStrategy();
      
      expect(strategy).toEqual({
        isLoggedIn: true,
        isPremiumUser: false,
        shouldUseRemote: false,
        shouldUseLocal: true,
        dataSource: 'local'
      });
    });

    it('应该禁止访问远程数据', async () => {
      const canAccessRemote = await strategyService.canAccessRemoteData();
      expect(canAccessRemote).toBe(false);
    });

    it('应该只能使用本地数据', async () => {
      const isLocalOnly = await strategyService.isLocalOnly();
      expect(isLocalOnly).toBe(true);
    });
  });

  describe('高级用户', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'premium_user123' });
      mockUserPermissionService.isPremiumUser.mockResolvedValue(true);
    });

    it('应该返回远程数据源策略', async () => {
      const strategy = await strategyService.getCurrentUserStrategy();
      
      expect(strategy).toEqual({
        isLoggedIn: true,
        isPremiumUser: true,
        shouldUseRemote: true,
        shouldUseLocal: false,
        dataSource: 'supabase'
      });
    });

    it('应该允许访问远程数据', async () => {
      const canAccessRemote = await strategyService.canAccessRemoteData();
      expect(canAccessRemote).toBe(true);
    });

    it('应该不限于本地数据', async () => {
      const isLocalOnly = await strategyService.isLocalOnly();
      expect(isLocalOnly).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('认证服务错误时应该回退到本地数据源', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('Auth failed'));
      
      const strategy = await strategyService.getCurrentUserStrategy();
      
      expect(strategy).toEqual({
        isLoggedIn: false,
        isPremiumUser: false,
        shouldUseRemote: false,
        shouldUseLocal: true,
        dataSource: 'local'
      });
    });

    it('权限服务错误时应该回退到本地数据源', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user123' });
      mockUserPermissionService.isPremiumUser.mockRejectedValue(new Error('Permission check failed'));
      
      const strategy = await strategyService.getCurrentUserStrategy();
      
      expect(strategy).toEqual({
        isLoggedIn: false,
        isPremiumUser: false,
        shouldUseRemote: false,
        shouldUseLocal: true,
        dataSource: 'local'
      });
    });
  });

  describe('缓存机制', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user123' });
      mockUserPermissionService.isPremiumUser.mockResolvedValue(false);
    });

    it('应该缓存策略结果', async () => {
      // 第一次调用
      await strategyService.getCurrentUserStrategy();
      
      // 第二次调用应该使用缓存
      await strategyService.getCurrentUserStrategy();
      
      // AuthService 应该只被调用一次
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('清除缓存后应该重新计算策略', async () => {
      // 第一次调用
      await strategyService.getCurrentUserStrategy();
      
      // 清除缓存
      strategyService.clearCache();
      
      // 第二次调用应该重新计算
      await strategyService.getCurrentUserStrategy();
      
      // AuthService 应该被调用两次
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('状态变化通知', () => {
    beforeEach(() => {
      mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user123' });
      mockUserPermissionService.isPremiumUser.mockResolvedValue(false);
    });

    it('认证状态改变时应该清除缓存', async () => {
      // 建立缓存
      await strategyService.getCurrentUserStrategy();
      
      // 触发认证状态变化
      strategyService.onAuthStateChanged(false);
      
      // 下次调用应该重新计算
      await strategyService.getCurrentUserStrategy();
      
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(2);
    });

    it('订阅状态改变时应该清除缓存', async () => {
      // 建立缓存
      await strategyService.getCurrentUserStrategy();
      
      // 触发订阅状态变化
      strategyService.onSubscriptionChanged(true);
      
      // 下次调用应该重新计算
      await strategyService.getCurrentUserStrategy();
      
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledTimes(2);
    });
  });
});