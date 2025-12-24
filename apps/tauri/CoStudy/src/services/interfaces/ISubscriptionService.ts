/**
 * 订阅服务接口
 * 
 * 遵循单一事实源原则：所有订阅相关操作都通过这个接口
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
  PaymentProviderConfig,
  AdProviderConfig,
} from '@/types/subscription';

/**
 * 订阅服务接口
 * 定义所有订阅相关操作的契约
 */
export interface ISubscriptionService {
  // 订阅状态查询
  getCurrentSubscription(userId: string): Promise<UserSubscription | null>;
  getSubscriptionState(userId: string): Promise<SubscriptionState>;
  isPremiumUser(userId: string): Promise<boolean>;
  getSubscriptionLimits(userId: string): Promise<SubscriptionLimits>;
  
  // 订阅计划管理
  getAvailablePlans(): Promise<SubscriptionPlan[]>;
  getPlanById(planId: string): Promise<SubscriptionPlan | null>;
  
  // 订阅操作
  startSubscription(userId: string, planId: string, paymentMethod: PaymentMethod): Promise<UserSubscription>;
  cancelSubscription(userId: string): Promise<UserSubscription>;
  renewSubscription(userId: string): Promise<UserSubscription>;
  changeSubscriptionPlan(userId: string, newPlanId: string): Promise<UserSubscription>;
  
  // 广告奖励系统
  grantAdReward(userId: string, adProvider: string, adUnitId: string): Promise<AdRewardRecord>;
  useAdReward(rewardId: string): Promise<void>;
  getAvailableAdRewards(userId: string): Promise<AdRewardRecord[]>;
  
  // 支付处理
  initiatePayment(userId: string, planId: string, paymentMethod: PaymentMethod): Promise<PaymentTransaction>;
  confirmPayment(transactionId: string): Promise<PaymentTransaction>;
  handlePaymentFailure(transactionId: string, reason: string): Promise<void>;
  
  // 事件记录
  recordSubscriptionEvent(userId: string, eventType: SubscriptionEventType, eventData: any): Promise<void>;
  getSubscriptionHistory(userId: string): Promise<SubscriptionEvent[]>;
}

/**
 * 支付服务接口
 * 定义各种支付方式的统一接口
 */
export interface IPaymentService {
  // 创建支付会话
  createPaymentSession(userId: string, planId: string, returnUrl: string, cancelUrl: string): Promise<string>;
  
  // 验证支付
  verifyPayment(sessionId: string): Promise<boolean>;
  
  // 获取支付方式详情
  getPaymentMethodDetails(paymentMethod: PaymentMethod): Promise<any>;
  
  // 处理退款
  processRefund(transactionId: string, amount?: number): Promise<boolean>;
}

/**
 * 广告服务接口
 * 定义广告奖励系统的统一接口
 */
export interface IAdService {
  // 显示激励广告
  showRewardAd(userId: string, adUnitId: string): Promise<boolean>;
  
  // 验证广告观看
  verifyAdView(adRewardId: string): Promise<boolean>;
  
  // 获取可用广告
  getAvailableAds(userId: string): Promise<any[]>;
  
  // 广告配置
  configureAdProvider(config: AdProviderConfig): void;
}

/**
 * 订阅数据访问接口
 * 定义订阅数据的统一访问接口
 */
export interface ISubscriptionDataAccess {
  // 用户订阅数据
  getUserSubscription(userId: string): Promise<UserSubscription | null>;
  createUserSubscription(subscription: UserSubscription): Promise<UserSubscription>;
  updateUserSubscription(userId: string, updates: Partial<UserSubscription>): Promise<UserSubscription>;
  
  // 广告奖励数据
  getAdReward(rewardId: string): Promise<AdRewardRecord | null>;
  createAdReward(reward: AdRewardRecord): Promise<AdRewardRecord>;
  updateAdReward(rewardId: string, updates: Partial<AdRewardRecord>): Promise<AdRewardRecord>;
  getUserAdRewards(userId: string): Promise<AdRewardRecord[]>;
  
  // 支付交易数据
  getPaymentTransaction(transactionId: string): Promise<PaymentTransaction | null>;
  createPaymentTransaction(transaction: PaymentTransaction): Promise<PaymentTransaction>;
  updatePaymentTransaction(transactionId: string, updates: Partial<PaymentTransaction>): Promise<PaymentTransaction>;
  getUserPaymentTransactions(userId: string): Promise<PaymentTransaction[]>;
  
  // 订阅事件数据
  createSubscriptionEvent(event: SubscriptionEvent): Promise<SubscriptionEvent>;
  getUserSubscriptionEvents(userId: string): Promise<SubscriptionEvent[]>;
}