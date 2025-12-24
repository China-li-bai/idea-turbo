/**
 * 订阅服务实现
 * 
 * 遵循单一事实源原则：所有订阅相关操作都通过这个服务
 * 确保数据流一致性和算法与数据库的完美映射
 */

import {
  SubscriptionType,
  SubscriptionStatus,
  PaymentMethod,
  SubscriptionPlan,
  UserSubscription,
  AdRewardRecord,
  PaymentTransaction,
  SubscriptionLimits,
  SubscriptionState,
  SubscriptionEventType,
  SubscriptionEvent,
} from '@/types/subscription';
import {
  ISubscriptionService,
  IPaymentService,
  IAdService,
  ISubscriptionDataAccess,
} from './interfaces/ISubscriptionService';

/**
 * 订阅服务实现类
 */
export class SubscriptionService implements ISubscriptionService {
  constructor(
    private dataAccess: ISubscriptionDataAccess,
    private paymentService: IPaymentService,
    private adService: IAdService
  ) {}

  /**
   * 获取用户当前订阅
   */
  async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    return this.dataAccess.getUserSubscription(userId);
  }

  /**
   * 获取用户订阅状态（实时计算）
   * 
   * 这是核心方法，确保单一事实源
   */
  async getSubscriptionState(userId: string): Promise<SubscriptionState> {
    const subscription = await this.getCurrentSubscription(userId);
    const now = new Date();
    
    // 如果没有订阅记录，创建默认免费状态
    if (!subscription) {
      return {
        type: SubscriptionType.FREE,
        status: SubscriptionStatus.ACTIVE,
        isExpired: false,
        isTrial: false,
        daysUntilExpiry: null,
        canAccessPremium: false,
        limits: this.getLimitsForType(SubscriptionType.FREE),
        nextBillingDate: null,
        availablePaymentMethods: this.getAvailablePaymentMethods(),
      };
    }

    // 检查是否有可用的广告奖励
    const adRewards = await this.dataAccess.getUserAdRewards(userId);
    const activeAdReward = adRewards.find(r => !r.isUsed && r.expiresAt > now);
    
    // 计算订阅状态
    let effectiveType = subscription.type;
    let effectiveExpiresAt = subscription.expiresAt;
    
    // 如果有有效的广告奖励，临时提升为高级用户
    if (activeAdReward && activeAdReward.expiresAt > now) {
      effectiveType = SubscriptionType.PREMIUM;
      effectiveExpiresAt = activeAdReward.expiresAt;
    }
    
    // 计算是否过期
    const isExpired = effectiveExpiresAt ? effectiveExpiresAt < now : false;
    const status = isExpired ? SubscriptionStatus.EXPIRED : subscription.status;
    
    // 计算剩余天数
    const daysUntilExpiry = effectiveExpiresAt 
      ? Math.ceil((effectiveExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    return {
      type: effectiveType,
      status,
      isExpired,
      isTrial: subscription.type === SubscriptionType.FREE && effectiveType === SubscriptionType.PREMIUM,
      daysUntilExpiry,
      canAccessPremium: !isExpired && effectiveType !== SubscriptionType.FREE,
      limits: this.getLimitsForType(effectiveType),
      nextBillingDate: subscription.nextBillingAt,
      availablePaymentMethods: this.getAvailablePaymentMethods(),
    };
  }

  /**
   * 检查用户是否为高级用户
   */
  async isPremiumUser(userId: string): Promise<boolean> {
    const state = await this.getSubscriptionState(userId);
    return state.canAccessPremium;
  }

  /**
   * 获取用户订阅限制
   */
  async getSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
    const state = await this.getSubscriptionState(userId);
    return state.limits;
  }

  /**
   * 获取可用的订阅计划
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    return [
      {
        id: 'premium-monthly',
        name: '高级版 - 月付',
        description: '解锁所有高级功能，月度订阅',
        type: SubscriptionType.PREMIUM,
        price: 9.99,
        currency: 'USD',
        durationDays: 30,
        features: [
          '无限卡组和卡片',
          '云端同步',
          '高级学习分析',
          '自定义主题',
          '无广告体验'
        ],
        isPopular: true,
        supportedPaymentMethods: [PaymentMethod.STRIPE, PaymentMethod.ALIPAY, PaymentMethod.WECHAT_PAY],
      },
      {
        id: 'premium-yearly',
        name: '高级版 - 年付',
        description: '解锁所有高级功能，年度订阅，节省20%',
        type: SubscriptionType.PREMIUM,
        price: 95.99,
        currency: 'USD',
        durationDays: 365,
        features: [
          '无限卡组和卡片',
          '云端同步',
          '高级学习分析',
          '自定义主题',
          '无广告体验'
        ],
        supportedPaymentMethods: [PaymentMethod.STRIPE, PaymentMethod.ALIPAY, PaymentMethod.WECHAT_PAY],
      },
    ];
  }

  /**
   * 根据ID获取订阅计划
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const plans = await this.getAvailablePlans();
    return plans.find(plan => plan.id === planId) || null;
  }

  /**
   * 开始订阅
   */
  async startSubscription(
    userId: string, 
    planId: string, 
    paymentMethod: PaymentMethod
  ): Promise<UserSubscription> {
    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new Error(`订阅计划不存在: ${planId}`);
    }

    // 检查支付方式是否支持
    if (!plan.supportedPaymentMethods.includes(paymentMethod)) {
      throw new Error(`该订阅计划不支持支付方式: ${paymentMethod}`);
    }

    // 创建支付交易
    const transaction = await this.initiatePayment(userId, planId, paymentMethod);
    
    // 创建订阅记录
    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    
    const subscription: UserSubscription = {
      userId,
      type: plan.type,
      status: SubscriptionStatus.PENDING,
      startedAt: now,
      expiresAt,
      cancelledAt: null,
      paymentMethod,
      externalSubscriptionId: null,
      autoRenew: true,
      trialUsed: false,
      lastPaymentAt: null,
      nextBillingAt: expiresAt,
    };

    const createdSubscription = await this.dataAccess.createUserSubscription(subscription);
    
    // 记录订阅开始事件
    await this.recordSubscriptionEvent(userId, SubscriptionEventType.SUBSCRIPTION_STARTED, {
      planId,
      paymentMethod,
      transactionId: transaction.id,
    });

    return createdSubscription;
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(userId: string): Promise<UserSubscription> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      throw new Error('用户没有活跃的订阅');
    }

    const updatedSubscription = await this.dataAccess.updateUserSubscription(userId, {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
      autoRenew: false,
    });

    // 记录订阅取消事件
    await this.recordSubscriptionEvent(userId, SubscriptionEventType.SUBSCRIPTION_CANCELLED, {
      subscriptionId: subscription.userId,
    });

    return updatedSubscription;
  }

  /**
   * 续费订阅
   */
  async renewSubscription(userId: string): Promise<UserSubscription> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      throw new Error('用户没有活跃的订阅');
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('只有活跃的订阅才能续费');
    }

    // 获取原计划
    const plan = await this.getPlanById(subscription.type === SubscriptionType.PREMIUM ? 'premium-monthly' : 'premium-yearly');
    if (!plan) {
      throw new Error('无法找到对应的订阅计划');
    }

    // 创建支付交易
    const transaction = await this.initiatePayment(userId, plan.id, subscription.paymentMethod!);
    
    // 更新订阅
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    
    const updatedSubscription = await this.dataAccess.updateUserSubscription(userId, {
      expiresAt: newExpiresAt,
      nextBillingAt: newExpiresAt,
      status: SubscriptionStatus.ACTIVE,
    });

    // 记录订阅续费事件
    await this.recordSubscriptionEvent(userId, SubscriptionEventType.SUBSCRIPTION_RENEWED, {
      planId: plan.id,
      paymentMethod: subscription.paymentMethod,
      transactionId: transaction.id,
    });

    return updatedSubscription;
  }

  /**
   * 更改订阅计划
   */
  async changeSubscriptionPlan(userId: string, newPlanId: string): Promise<UserSubscription> {
    const subscription = await this.getCurrentSubscription(userId);
    if (!subscription) {
      throw new Error('用户没有活跃的订阅');
    }

    const newPlan = await this.getPlanById(newPlanId);
    if (!newPlan) {
      throw new Error(`订阅计划不存在: ${newPlanId}`);
    }

    // 创建支付交易
    const transaction = await this.initiatePayment(userId, newPlanId, subscription.paymentMethod!);
    
    // 更新订阅
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + newPlan.durationDays * 24 * 60 * 60 * 1000);
    
    const updatedSubscription = await this.dataAccess.updateUserSubscription(userId, {
      type: newPlan.type,
      expiresAt: newExpiresAt,
      nextBillingAt: newExpiresAt,
    });

    return updatedSubscription;
  }

  /**
   * 授予广告奖励
   */
  async grantAdReward(
    userId: string, 
    adProvider: string, 
    adUnitId: string
  ): Promise<AdRewardRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3天后过期
    
    const adReward: AdRewardRecord = {
      id: `ad_reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      rewardType: 'trial_days',
      rewardValue: 3,
      adProvider,
      adUnitId,
      watchedAt: now,
      expiresAt,
      isUsed: false,
      usedAt: null,
    };

    const createdReward = await this.dataAccess.createAdReward(adReward);
    
    // 记录广告奖励事件
    await this.recordSubscriptionEvent(userId, SubscriptionEventType.AD_REWARD_GRANTED, {
      rewardId: createdReward.id,
      adProvider,
      adUnitId,
    });

    return createdReward;
  }

  /**
   * 使用广告奖励
   */
  async useAdReward(rewardId: string): Promise<void> {
    const reward = await this.dataAccess.getAdReward(rewardId);
    if (!reward) {
      throw new Error('广告奖励不存在');
    }

    if (reward.isUsed) {
      throw new Error('广告奖励已使用');
    }

    if (reward.expiresAt < new Date()) {
      throw new Error('广告奖励已过期');
    }

    await this.dataAccess.updateAdReward(rewardId, {
      isUsed: true,
      usedAt: new Date(),
    });
  }

  /**
   * 获取用户可用的广告奖励
   */
  async getAvailableAdRewards(userId: string): Promise<AdRewardRecord[]> {
    const rewards = await this.dataAccess.getUserAdRewards(userId);
    const now = new Date();
    
    return rewards.filter(reward => !reward.isUsed && reward.expiresAt > now);
  }

  /**
   * 发起支付
   */
  async initiatePayment(
    userId: string, 
    planId: string, 
    paymentMethod: PaymentMethod
  ): Promise<PaymentTransaction> {
    const plan = await this.getPlanById(planId);
    if (!plan) {
      throw new Error(`订阅计划不存在: ${planId}`);
    }

    const transaction: PaymentTransaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      subscriptionType: plan.type,
      amount: plan.price,
      currency: plan.currency,
      paymentMethod,
      status: 'pending',
      externalTransactionId: null,
      createdAt: new Date(),
      completedAt: null,
    };

    return this.dataAccess.createPaymentTransaction(transaction);
  }

  /**
   * 确认支付
   */
  async confirmPayment(transactionId: string): Promise<PaymentTransaction> {
    const transaction = await this.dataAccess.getPaymentTransaction(transactionId);
    if (!transaction) {
      throw new Error('支付交易不存在');
    }

    if (transaction.status === 'completed') {
      return transaction;
    }

    const updatedTransaction = await this.dataAccess.updatePaymentTransaction(transactionId, {
      status: 'completed',
      completedAt: new Date(),
    });

    // 激活订阅
    const subscription = await this.getCurrentSubscription(transaction.userId);
    if (subscription && subscription.status === SubscriptionStatus.PENDING) {
      await this.dataAccess.updateUserSubscription(transaction.userId, {
        status: SubscriptionStatus.ACTIVE,
        lastPaymentAt: new Date(),
        externalSubscriptionId: transactionId,
      });
    }

    return updatedTransaction;
  }

  /**
   * 处理支付失败
   */
  async handlePaymentFailure(transactionId: string, reason: string): Promise<void> {
    const transaction = await this.dataAccess.getPaymentTransaction(transactionId);
    if (!transaction) {
      throw new Error('支付交易不存在');
    }

    await this.dataAccess.updatePaymentTransaction(transactionId, {
      status: 'failed',
      failureReason: reason,
    });

    // 记录支付失败事件
    await this.recordSubscriptionEvent(transaction.userId, SubscriptionEventType.PAYMENT_FAILED, {
      transactionId,
      reason,
    });

    // 如果是待激活的订阅，将其标记为过期
    const subscription = await this.getCurrentSubscription(transaction.userId);
    if (subscription && subscription.status === SubscriptionStatus.PENDING) {
      await this.dataAccess.updateUserSubscription(transaction.userId, {
        status: SubscriptionStatus.EXPIRED,
      });
    }
  }

  /**
   * 记录订阅事件
   */
  async recordSubscriptionEvent(
    userId: string, 
    eventType: SubscriptionEventType, 
    eventData: any
  ): Promise<void> {
    const event: SubscriptionEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      eventType,
      eventData,
      createdAt: new Date(),
    };

    await this.dataAccess.createSubscriptionEvent(event);
  }

  /**
   * 获取用户订阅历史
   */
  async getSubscriptionHistory(userId: string): Promise<SubscriptionEvent[]> {
    return this.dataAccess.getUserSubscriptionEvents(userId);
  }

  /**
   * 根据订阅类型获取限制
   */
  private getLimitsForType(type: SubscriptionType): SubscriptionLimits {
    switch (type) {
      case SubscriptionType.FREE:
        return {
          maxDecks: 5,
          maxCards: 100,
          maxDailyReviews: 50,
          canSyncToCloud: false,
          canAccessAdvancedFeatures: false,
          canUseCustomThemes: false,
          hasAdFreeExperience: false,
        };
      case SubscriptionType.PREMIUM:
        return {
          maxDecks: -1, // 无限制
          maxCards: -1, // 无限制
          maxDailyReviews: -1, // 无限制
          canSyncToCloud: true,
          canAccessAdvancedFeatures: true,
          canUseCustomThemes: true,
          hasAdFreeExperience: true,
        };
      case SubscriptionType.PREMIUM_PLUS:
        return {
          maxDecks: -1, // 无限制
          maxCards: -1, // 无限制
          maxDailyReviews: -1, // 无限制
          canSyncToCloud: true,
          canAccessAdvancedFeatures: true,
          canUseCustomThemes: true,
          hasAdFreeExperience: true,
        };
      default:
        return this.getLimitsForType(SubscriptionType.FREE);
    }
  }

  /**
   * 获取可用的支付方式
   */
  private getAvailablePaymentMethods(): PaymentMethod[] {
    // 根据用户地区和平台返回不同的支付方式
    // 这里简化处理，实际应用中需要根据用户地区判断
    return [
      PaymentMethod.STRIPE,
      PaymentMethod.ALIPAY,
      PaymentMethod.WECHAT_PAY,
      PaymentMethod.AD_REWARD,
    ];
  }
}