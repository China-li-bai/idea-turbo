/**
 * 订阅系统统一入口
 * 
 * 整合所有订阅相关服务，提供统一的API接口
 * 遵循单一事实源原则，确保系统的一致性
 */

import { 
  SubscriptionPlan, 
  SubscriptionType, 
  PaymentMethod, 
  AdPlatform, 
  AdType,
  SubscriptionStatus,
  UserSubscription,
  SubscriptionTransaction,
  AdReward
} from '@/types/subscription';
import { SubscriptionService } from './SubscriptionService';
import { PaymentServiceFactory } from './PaymentService';
import { AdServiceFactory } from './AdService';
import { HybridSubscriptionDataAccess } from './data/SubscriptionDataAccess';
import { LocalSubscriptionDataAccess } from './data/SubscriptionDataAccess';
import { RemoteSubscriptionDataAccess } from './data/SubscriptionDataAccess';

/**
 * 订阅系统管理器
 * 提供统一的API接口，整合所有订阅相关服务
 */
export class SubscriptionManager {
  private static instance: SubscriptionManager | null = null;
  private subscriptionService: SubscriptionService;
  private paymentService: any;
  private adService: any;
  private dataAccess: HybridSubscriptionDataAccess;

  private constructor() {
    // 初始化数据访问层
    const localAccess = new LocalSubscriptionDataAccess();
    const remoteAccess = new RemoteSubscriptionDataAccess(
      import.meta.env.VITE_API_BASE_URL || 'https://api.example.com',
      import.meta.env.VITE_API_KEY || ''
    );
    this.dataAccess = new HybridSubscriptionDataAccess(localAccess, remoteAccess);

    // 初始化服务
    this.subscriptionService = SubscriptionService.getInstance();
    this.paymentService = PaymentServiceFactory.getInstance();
    this.adService = AdServiceFactory.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SubscriptionManager {
    if (!this.instance) {
      this.instance = new SubscriptionManager();
    }
    return this.instance;
  }

  /**
   * 初始化订阅系统
   */
  async initialize(): Promise<void> {
    try {
      // 初始化数据访问层
      // 这里可以执行一些初始化操作，如创建数据库表等

      // 同步订阅计划
      await this.syncSubscriptionPlans();

      console.log('订阅系统初始化完成');
    } catch (error) {
      console.error('订阅系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户订阅状态
   */
  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    return this.subscriptionService.getSubscriptionStatus(userId);
  }

  /**
   * 获取可用订阅计划
   */
  async getAvailableSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.getAvailablePlans();
  }

  /**
   * 创建订阅
   */
  async createSubscription(
    userId: string, 
    planId: string, 
    paymentMethod: PaymentMethod
  ): Promise<string> {
    if (paymentMethod === PaymentMethod.AD_REWARD) {
      // 处理广告奖励订阅
      return this.handleAdRewardSubscription(userId);
    } else {
      // 处理付费订阅
      return this.handlePaidSubscription(userId, planId, paymentMethod);
    }
  }

  /**
   * 处理广告奖励订阅
   */
  private async handleAdRewardSubscription(userId: string): Promise<string> {
    try {
      // 显示广告并发放奖励
      const reward = await this.adService.showAdAndGrantReward(
        userId, 
        AdType.REWARDED_VIDEO, 
        AdPlatform.ADMOB
      );

      // 更新用户订阅状态
      await this.subscriptionService.grantAdRewardSubscription(userId, reward);

      return reward.id;
    } catch (error) {
      console.error('处理广告奖励订阅失败:', error);
      throw error;
    }
  }

  /**
   * 处理付费订阅
   */
  private async handlePaidSubscription(
    userId: string, 
    planId: string, 
    paymentMethod: PaymentMethod
  ): Promise<string> {
    try {
      // 创建支付会话
      const returnUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/subscription/cancel`;
      
      const paymentSessionId = await this.paymentService.createPaymentSession(
        userId, 
        planId, 
        returnUrl, 
        cancelUrl
      );

      return paymentSessionId;
    } catch (error) {
      console.error('处理付费订阅失败:', error);
      throw error;
    }
  }

  /**
   * 验证支付并激活订阅
   */
  async verifyPaymentAndActivateSubscription(
    userId: string, 
    paymentSessionId: string
  ): Promise<boolean> {
    try {
      // 验证支付
      const isPaymentValid = await this.paymentService.verifyPayment(paymentSessionId);
      
      if (isPaymentValid) {
        // 激活订阅
        await this.subscriptionService.activateSubscription(userId, paymentSessionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('验证支付并激活订阅失败:', error);
      throw error;
    }
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      return this.subscriptionService.cancelSubscription(userId);
    } catch (error) {
      console.error('取消订阅失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户订阅交易记录
   */
  async getUserTransactions(userId: string): Promise<SubscriptionTransaction[]> {
    return this.dataAccess.getUserTransactions(userId);
  }

  /**
   * 获取用户广告奖励记录
   */
  async getUserAdRewards(userId: string): Promise<AdReward[]> {
    return this.dataAccess.getUserAdRewards(userId);
  }

  /**
   * 获取支付方式详情
   */
  async getPaymentMethodDetails(paymentMethod: PaymentMethod): Promise<any> {
    return this.paymentService.getPaymentMethodDetails(paymentMethod);
  }

  /**
   * 获取广告平台详情
   */
  async getAdPlatformDetails(platform: AdPlatform): Promise<any> {
    return this.adService.getAdPlatformDetails(platform);
  }

  /**
   * 获取广告类型详情
   */
  async getAdTypeDetails(adType: AdType): Promise<any> {
    return this.adService.getAdTypeDetails(adType);
  }

  /**
   * 同步订阅计划
   */
  private async syncSubscriptionPlans(): Promise<void> {
    try {
      // 从远程获取最新的订阅计划
      const remotePlans = await this.dataAccess.getSubscriptionPlans();
      
      // 如果远程有计划，保存到本地
      if (remotePlans.length > 0) {
        await this.dataAccess.saveSubscriptionPlans(remotePlans);
      }
    } catch (error) {
      console.error('同步订阅计划失败:', error);
      // 不抛出错误，允许系统继续运行
    }
  }

  /**
   * 同步用户数据
   */
  async syncUserData(userId: string): Promise<void> {
    try {
      await this.dataAccess.syncData(userId);
    } catch (error) {
      console.error('同步用户数据失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否有特定功能的访问权限
   */
  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    try {
      const subscriptionStatus = await this.getUserSubscriptionStatus(userId);
      return this.subscriptionService.hasFeatureAccess(subscriptionStatus, feature);
    } catch (error) {
      console.error('检查功能访问权限失败:', error);
      return false;
    }
  }

  /**
   * 获取用户限制信息
   */
  async getUserLimits(userId: string): Promise<any> {
    try {
      const subscriptionStatus = await this.getUserSubscriptionStatus(userId);
      return this.subscriptionService.getUserLimits(subscriptionStatus);
    } catch (error) {
      console.error('获取用户限制信息失败:', error);
      throw error;
    }
  }
}

/**
 * 订阅系统React Hook
 * 提供React组件使用的订阅系统接口
 */
export const useSubscription = (userId: string) => {
  const [subscriptionManager] = useState(() => SubscriptionManager.getInstance());
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 获取用户订阅状态
        const status = await subscriptionManager.getUserSubscriptionStatus(userId);
        setSubscriptionStatus(status);

        // 获取可用计划
        const plans = await subscriptionManager.getAvailableSubscriptionPlans();
        setAvailablePlans(plans);
      } catch (err) {
        console.error('获取订阅信息失败:', err);
        setError('获取订阅信息失败，请稍后再试');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId, subscriptionManager]);

  const createSubscription = async (planId: string, paymentMethod: PaymentMethod) => {
    try {
      setError(null);
      const result = await subscriptionManager.createSubscription(userId, planId, paymentMethod);
      return result;
    } catch (err) {
      console.error('创建订阅失败:', err);
      setError('创建订阅失败，请稍后再试');
      throw err;
    }
  };

  const verifyPaymentAndActivateSubscription = async (paymentSessionId: string) => {
    try {
      setError(null);
      const result = await subscriptionManager.verifyPaymentAndActivateSubscription(userId, paymentSessionId);
      
      // 刷新订阅状态
      const status = await subscriptionManager.getUserSubscriptionStatus(userId);
      setSubscriptionStatus(status);
      
      return result;
    } catch (err) {
      console.error('验证支付并激活订阅失败:', err);
      setError('验证支付失败，请稍后再试');
      throw err;
    }
  };

  const cancelSubscription = async () => {
    try {
      setError(null);
      const result = await subscriptionManager.cancelSubscription(userId);
      
      // 刷新订阅状态
      const status = await subscriptionManager.getUserSubscriptionStatus(userId);
      setSubscriptionStatus(status);
      
      return result;
    } catch (err) {
      console.error('取消订阅失败:', err);
      setError('取消订阅失败，请稍后再试');
      throw err;
    }
  };

  const checkFeatureAccess = async (feature: string) => {
    try {
      return await subscriptionManager.checkFeatureAccess(userId, feature);
    } catch (err) {
      console.error('检查功能访问权限失败:', err);
      return false;
    }
  };

  const getUserLimits = async () => {
    try {
      return await subscriptionManager.getUserLimits(userId);
    } catch (err) {
      console.error('获取用户限制信息失败:', err);
      throw err;
    }
  };

  const getUserTransactions = async () => {
    try {
      return await subscriptionManager.getUserTransactions(userId);
    } catch (err) {
      console.error('获取用户交易记录失败:', err);
      throw err;
    }
  };

  const getUserAdRewards = async () => {
    try {
      return await subscriptionManager.getUserAdRewards(userId);
    } catch (err) {
      console.error('获取用户广告奖励失败:', err);
      throw err;
    }
  };

  const getPaymentMethodDetails = async (paymentMethod: PaymentMethod) => {
    try {
      return await subscriptionManager.getPaymentMethodDetails(paymentMethod);
    } catch (err) {
      console.error('获取支付方式详情失败:', err);
      throw err;
    }
  };

  const getAdPlatformDetails = async (platform: AdPlatform) => {
    try {
      return await subscriptionManager.getAdPlatformDetails(platform);
    } catch (err) {
      console.error('获取广告平台详情失败:', err);
      throw err;
    }
  };

  const getAdTypeDetails = async (adType: AdType) => {
    try {
      return await subscriptionManager.getAdTypeDetails(adType);
    } catch (err) {
      console.error('获取广告类型详情失败:', err);
      throw err;
    }
  };

  return {
    subscriptionStatus,
    availablePlans,
    isLoading,
    error,
    createSubscription,
    verifyPaymentAndActivateSubscription,
    cancelSubscription,
    checkFeatureAccess,
    getUserLimits,
    getUserTransactions,
    getUserAdRewards,
    getPaymentMethodDetails,
    getAdPlatformDetails,
    getAdTypeDetails,
  };
};

// 导入React hooks
import { useState, useEffect } from 'react';