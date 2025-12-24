# 订阅系统设计与实现

## 概述

本文档描述了一个完整的订阅系统的设计与实现，该系统遵循单一事实源原则，确保数据流一致性，并支持Web与移动端的响应式自适应交互。

## 设计原则

### 1. 单一事实源 (Single Source of Truth)

整个订阅系统基于数据库中的`user_profiles`表作为单一事实源，所有订阅状态和权限都基于此表实时计算，而不是存储冗余的状态信息。

```sql
-- user_profiles表作为订阅状态的单一事实源
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,
  subscription_type TEXT NOT NULL DEFAULT 'free', -- free, premium, trial
  subscription_started_at TIMESTAMP,
  subscription_expires_at TIMESTAMP,
  -- 其他字段...
);
```

### 2. 数据流一致性

所有服务都通过统一的数据访问层与数据库交互，确保数据的一致性。订阅状态始终基于最新数据计算，而不是依赖缓存或过时的状态。

### 3. 抽象与封装

通过接口抽象核心功能，使系统模块化且易于扩展。主要接口包括：
- `ISubscriptionService`: 订阅管理核心功能
- `IPaymentService`: 支付处理
- `IAdService`: 广告奖励系统
- `ISubscriptionDataAccess`: 数据访问层

## 系统架构

### 核心组件

1. **SubscriptionManager**: 订阅系统的统一入口点，管理所有订阅相关服务
2. **SubscriptionService**: 实现订阅管理的核心逻辑
3. **PaymentService**: 处理多种支付方式
4. **AdService**: 管理广告奖励系统
5. **SubscriptionDataAccess**: 提供本地和远程数据访问

### 数据模型

```typescript
// 订阅状态枚举
enum SubscriptionType {
  FREE = 'free',
  PREMIUM = 'premium',
  TRIAL = 'trial'
}

// 订阅状态接口
interface SubscriptionStatus {
  userId: string;
  type: SubscriptionType;
  status: 'active' | 'expired' | 'cancelled';
  startedAt?: Date;
  expiresAt?: Date;
  isPremium: boolean;
  daysUntilExpiry?: number;
}

// 用户权限限制
interface UserLimits {
  canCreateDeck: boolean;
  canCreateCard: boolean;
  maxDecks: number;
  maxCards: number;
  maxReviewsPerDay: number;
  hasAdvancedFeatures: boolean;
}
```

## 功能特性

### 1. 订阅管理

- 支持免费、试用和高级订阅类型
- 实时计算订阅状态和权限
- 订阅过期自动处理

### 2. 支付系统

- 支持多种支付方式：Stripe、支付宝、微信支付
- 统一的支付接口和工厂模式
- 支付验证和回调处理

### 3. 广告奖励系统

- 支持多种广告平台：AdMob、IronSource
- 观看广告获取短期高级权限
- 广告奖励记录和管理

### 4. 响应式UI

- 移动优先的设计原则
- 自适应Web和移动端界面
- 深色模式支持

## 实现细节

### 订阅状态计算

订阅状态始终基于`user_profiles`表实时计算：

```typescript
private calculateSubscriptionStatus(profile: UserProfileRow): SubscriptionStatus {
  const now = new Date();
  const isExpired = profile.subscription_expires_at 
    ? new Date(profile.subscription_expires_at) < now 
    : false;
    
  const status = isExpired ? 'expired' : 'active';
  const isPremium = profile.subscription_type === 'premium' && !isExpired;
  
  return {
    userId: profile.id,
    type: profile.subscription_type,
    status,
    startedAt: profile.subscription_started_at ? new Date(profile.subscription_started_at) : undefined,
    expiresAt: profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : undefined,
    isPremium,
    daysUntilExpiry: profile.subscription_expires_at 
      ? Math.ceil((new Date(profile.subscription_expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : undefined
  };
}
```

### 权限检查

用户权限基于订阅状态实时计算：

```typescript
private calculateUserLimits(status: SubscriptionStatus): UserLimits {
  const isPremium = status.isPremium;
  
  return {
    canCreateDeck: isPremium || this.countUserDecks(status.userId) < 3,
    canCreateCard: isPremium || this.countUserCards(status.userId) < 50,
    maxDecks: isPremium ? 1000 : 3,
    maxCards: isPremium ? 10000 : 50,
    maxReviewsPerDay: isPremium ? 1000 : 100,
    hasAdvancedFeatures: isPremium
  };
}
```

### 广告奖励实现

广告奖励通过创建临时订阅记录实现：

```typescript
async grantAdReward(userId: string, platform: AdPlatform, type: AdType): Promise<AdReward> {
  const rewardId = generateId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3天后过期
  
  // 创建广告奖励记录
  const reward: AdReward = {
    id: rewardId,
    userId,
    platform,
    type,
    grantedAt: now,
    expiresAt,
    isUsed: false
  };
  
  await this.dataAccess.createAdReward(reward);
  
  // 更新用户订阅状态
  await this.updateSubscriptionForAdReward(userId, expiresAt);
  
  return reward;
}
```

## 使用示例

### 初始化订阅系统

```typescript
import { SubscriptionManager } from './services/SubscriptionManager';

// 在应用启动时初始化
const subscriptionManager = SubscriptionManager.getInstance();
await subscriptionManager.initialize();
```

### 检查订阅状态

```typescript
const status = await subscriptionManager.getCurrentSubscriptionStatus();
console.log('Subscription status:', status);
```

### 检查用户权限

```typescript
const limits = await subscriptionManager.getUserLimits();
if (limits.canCreateDeck) {
  // 允许创建卡片组
} else {
  // 显示升级提示
}
```

### 处理订阅

```typescript
// 创建订阅
const result = await subscriptionManager.subscribe('premium-monthly', PaymentMethod.STRIPE);
if (result.success) {
  // 订阅成功
} else {
  // 处理错误
}

// 取消订阅
await subscriptionManager.cancelSubscription();
```

### 广告奖励

```typescript
// 观看广告获取奖励
const result = await subscriptionManager.watchAd(AdPlatform.ADMOB, AdType.REWARDED);
if (result.success) {
  // 奖励已发放
}
```

## 响应式UI设计

订阅页面采用移动优先的响应式设计，确保在各种设备上都有良好的用户体验：

- **移动端** (< 480px): 单列布局，简化UI元素
- **平板端** (480px - 768px): 适当增加间距和字体大小
- **桌面端** (> 768px): 多列布局，充分利用屏幕空间

## 数据同步策略

系统采用混合数据同步策略：

1. **本地优先**: 所有操作首先更新本地数据库，提供即时反馈
2. **后台同步**: 本地更改在后台同步到远程服务器
3. **冲突解决**: 使用时间戳和优先级规则解决冲突
4. **离线支持**: 支持离线操作，网络恢复后自动同步

## 安全考虑

1. **支付安全**: 所有支付操作通过安全的支付网关处理，不存储敏感支付信息
2. **权限验证**: 所有敏感操作在服务端验证用户权限
3. **数据加密**: 敏感数据在传输和存储时进行加密
4. **审计日志**: 记录所有关键操作以便审计

## 扩展性

系统设计具有良好的扩展性：

1. **新支付方式**: 通过实现`IPaymentService`接口轻松添加新支付方式
2. **新广告平台**: 通过实现`IAdService`接口支持新广告平台
3. **新订阅类型**: 通过扩展枚举和更新计算逻辑支持新订阅类型
4. **新功能权限**: 通过更新`UserLimits`接口和计算逻辑支持新功能权限

## 性能优化

1. **缓存策略**: 对频繁访问的数据进行适当缓存
2. **批量操作**: 对数据库操作进行批量处理
3. **懒加载**: 按需加载非关键数据
4. **索引优化**: 为数据库表创建适当的索引

## 测试策略

1. **单元测试**: 对所有核心逻辑进行单元测试
2. **集成测试**: 测试各组件之间的交互
3. **端到端测试**: 测试完整的用户流程
4. **性能测试**: 测试系统在高负载下的表现

## 部署注意事项

1. **环境变量**: 确保所有敏感配置通过环境变量设置
2. **数据库迁移**: 提供数据库结构迁移脚本
3. **监控**: 设置适当的监控和告警
4. **备份**: 定期备份重要数据

## 总结

本订阅系统遵循单一事实源原则，确保数据流一致性，并提供了完整的订阅管理、支付处理和广告奖励功能。系统设计具有良好的扩展性和可维护性，能够满足Web和移动端的响应式自适应交互需求。