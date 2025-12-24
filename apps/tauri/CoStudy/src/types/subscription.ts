/**
 * 订阅数据模型和类型定义
 * 
 * 遵循单一事实源原则：所有订阅相关数据都来自这里
 * 确保数据库和算法之间的完美映射
 */

// 订阅类型枚举
export enum SubscriptionType {
  FREE = 'free',
  PREMIUM = 'premium',
  PREMIUM_PLUS = 'premium_plus', // 未来扩展
}

// 订阅状态枚举
export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

// 支付方式枚举
export enum PaymentMethod {
  STRIPE = 'stripe',
  ALIPAY = 'alipay',
  WECHAT_PAY = 'wechat_pay',
  AD_REWARD = 'ad_reward', // 广告奖励
}

// 广告类型枚举
export enum AdType {
  BANNER = 'banner',
  INTERSTITIAL = 'interstitial',
  REWARDED_VIDEO = 'rewarded_video',
}

// 广告平台枚举
export enum AdPlatform {
  ADMOB = 'admob',
  IRONSOURCE = 'ironsource',
}

// 广告奖励接口
export interface AdReward {
  rewardType: 'trial_days' | 'premium_feature';
  rewardValue: number;
  description: string;
}

// 订阅计划定义
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: SubscriptionType;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
  isPopular?: boolean;
  supportedPaymentMethods: PaymentMethod[];
}

// 用户订阅信息（单一事实源）
export interface UserSubscription {
  userId: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date | null;
  cancelledAt: Date | null;
  paymentMethod: PaymentMethod | null;
  externalSubscriptionId: string | null; // 外部支付系统ID
  autoRenew: boolean;
  trialUsed: boolean; // 是否已使用试用
  lastPaymentAt: Date | null;
  nextBillingAt: Date | null;
}

// 广告奖励记录
export interface AdRewardRecord {
  id: string;
  userId: string;
  rewardType: 'trial_days' | 'premium_feature';
  rewardValue: number; // 天数或特性标识
  adProvider: string; // 广告提供商
  adUnitId: string; // 广告单元ID
  watchedAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedAt: Date | null;
}

// 支付交易记录
export interface PaymentTransaction {
  id: string;
  userId: string;
  subscriptionType: SubscriptionType;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  externalTransactionId: string | null; // 外部支付系统交易ID
  createdAt: Date;
  completedAt: Date | null;
  failureReason?: string;
}

// 订阅使用限制
export interface SubscriptionLimits {
  maxDecks: number;
  maxCards: number;
  maxDailyReviews: number;
  canSyncToCloud: boolean;
  canAccessAdvancedFeatures: boolean;
  canUseCustomThemes: boolean;
  hasAdFreeExperience: boolean;
}

// 订阅事件类型
export enum SubscriptionEventType {
  SUBSCRIPTION_STARTED = 'subscription_started',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  TRIAL_STARTED = 'trial_started',
  PAYMENT_FAILED = 'payment_failed',
  AD_REWARD_GRANTED = 'ad_reward_granted',
}

// 订阅事件记录
export interface SubscriptionEvent {
  id: string;
  userId: string;
  eventType: SubscriptionEventType;
  eventData: any;
  createdAt: Date;
}

// 订阅状态计算结果
export interface SubscriptionState {
  type: SubscriptionType;
  status: SubscriptionStatus;
  isExpired: boolean;
  isTrial: boolean;
  daysUntilExpiry: number | null;
  canAccessPremium: boolean;
  limits: SubscriptionLimits;
  nextBillingDate: Date | null;
  availablePaymentMethods: PaymentMethod[];
}

// 支付提供商配置
export interface PaymentProviderConfig {
  stripe: {
    publishableKey: string;
    secretKey: string;
    priceIds: {
      [key: string]: string; // planId -> priceId
    };
  };
  alipay: {
    appId: string;
    privateKey: string;
    publicKey: string;
    gatewayUrl: string;
  };
  wechatPay: {
    appId: string;
    mchId: string;
    apiKey: string;
    certPath: string;
  };
}

// 广告提供商配置
export interface AdProviderConfig {
  admob: {
    appId: string;
    rewardAdUnitId: string;
  };
  ironSource: {
    appKey: string;
    rewardAdUnitId: string;
  };
}