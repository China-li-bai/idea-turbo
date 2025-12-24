/**
 * 订阅页面响应式UI组件
 * 
 * 确保Web与移动端的自适应交互
 * 遵循单一事实源原则，确保UI与数据的一致性
 */

import React, { useState, useEffect } from 'react';
import { 
  SubscriptionPlan, 
  SubscriptionType, 
  PaymentMethod, 
  AdPlatform, 
  AdType,
  SubscriptionStatus 
} from '@/types/subscription';
import { SubscriptionService } from '@/services/SubscriptionService';
import { PaymentServiceFactory } from '@/services/PaymentService';
import { AdServiceFactory } from '@/services/AdService';

interface SubscriptionPageProps {
  userId: string;
}

/**
 * 订阅计划卡片组件
 */
const SubscriptionPlanCard: React.FC<{
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  isLoading: boolean;
}> = ({ plan, isCurrentPlan, onSelectPlan, isLoading }) => {
  return (
    <div className={`subscription-plan-card ${isCurrentPlan ? 'current-plan' : ''}`}>
      <div className="plan-header">
        <h3 className="plan-name">{plan.name}</h3>
        <div className="plan-price">
          <span className="price-amount">{plan.price}</span>
          <span className="price-period">/{plan.period}</span>
        </div>
      </div>
      
      <div className="plan-features">
        <ul>
          {plan.features.map((feature, index) => (
            <li key={index} className="feature-item">
              <span className="feature-icon">✓</span>
              <span className="feature-text">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="plan-actions">
        {isCurrentPlan ? (
          <button className="btn btn-current-plan" disabled>
            当前计划
          </button>
        ) : (
          <button 
            className="btn btn-select-plan" 
            onClick={() => onSelectPlan(plan)}
            disabled={isLoading}
          >
            {isLoading ? '处理中...' : '选择计划'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * 支付方式选择组件
 */
const PaymentMethodSelector: React.FC<{
  availableMethods: PaymentMethod[];
  selectedMethod: PaymentMethod | null;
  onMethodChange: (method: PaymentMethod) => void;
}> = ({ availableMethods, selectedMethod, onMethodChange }) => {
  const [methodDetails, setMethodDetails] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const fetchMethodDetails = async () => {
      const paymentService = PaymentServiceFactory.getInstance();
      const details: { [key: string]: any } = {};
      
      for (const method of availableMethods) {
        try {
          details[method] = await paymentService.getPaymentMethodDetails(method);
        } catch (error) {
          console.error(`获取支付方式 ${method} 详情失败:`, error);
        }
      }
      
      setMethodDetails(details);
    };

    fetchMethodDetails();
  }, [availableMethods]);

  return (
    <div className="payment-method-selector">
      <h4>选择支付方式</h4>
      <div className="payment-methods">
        {availableMethods.map((method) => (
          <div 
            key={method} 
            className={`payment-method ${selectedMethod === method ? 'selected' : ''}`}
            onClick={() => onMethodChange(method)}
          >
            <div className="method-icon">
              {methodDetails[method]?.icon && (
                <span className={`icon-${methodDetails[method].icon}`}></span>
              )}
            </div>
            <div className="method-info">
              <div className="method-name">{methodDetails[method]?.name || method}</div>
              <div className="method-description">
                {methodDetails[method]?.description || ''}
              </div>
            </div>
            <div className="method-selector">
              <input 
                type="radio" 
                name="payment-method" 
                checked={selectedMethod === method}
                onChange={() => onMethodChange(method)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 广告奖励组件
 */
const AdRewardSection: React.FC<{
  userId: string;
  onRewardGranted: () => void;
}> = ({ userId, onRewardGranted }) => {
  const [adRewards, setAdRewards] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<AdPlatform>(AdPlatform.ADMOB);
  const [selectedAdType, setSelectedAdType] = useState<AdType>(AdType.REWARDED_VIDEO);
  const [isLoading, setIsLoading] = useState(false);
  const [platformDetails, setPlatformDetails] = useState<{ [key: string]: any }>({});
  const [adTypeDetails, setAdTypeDetails] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    const fetchData = async () => {
      const adService = AdServiceFactory.getInstance();
      
      // 获取用户的广告奖励
      const rewards = await adService.getUserAdRewards(userId);
      setAdRewards(rewards);
      
      // 获取平台详情
      const platforms = [AdPlatform.ADMOB, AdPlatform.IRONSOURCE];
      const platformDetailsData: { [key: string]: any } = {};
      
      for (const platform of platforms) {
        try {
          platformDetailsData[platform] = await adService.getAdPlatformDetails(platform);
        } catch (error) {
          console.error(`获取广告平台 ${platform} 详情失败:`, error);
        }
      }
      
      setPlatformDetails(platformDetailsData);
      
      // 获取广告类型详情
      const adTypes = [AdType.BANNER, AdType.INTERSTITIAL, AdType.REWARDED_VIDEO];
      const adTypeDetailsData: { [key: string]: any } = {};
      
      for (const adType of adTypes) {
        try {
          adTypeDetailsData[adType] = await adService.getAdTypeDetails(adType);
        } catch (error) {
          console.error(`获取广告类型 ${adType} 详情失败:`, error);
        }
      }
      
      setAdTypeDetails(adTypeDetailsData);
    };

    fetchData();
  }, [userId]);

  const handleWatchAd = async () => {
    setIsLoading(true);
    
    try {
      const adService = AdServiceFactory.getInstance();
      await adService.showAdAndGrantReward(userId, selectedAdType, selectedPlatform);
      
      // 刷新奖励列表
      const rewards = await adService.getUserAdRewards(userId);
      setAdRewards(rewards);
      
      onRewardGranted();
    } catch (error) {
      console.error('观看广告失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ad-reward-section">
      <h4>广告奖励</h4>
      <p>观看广告可获得3天免费高级功能</p>
      
      <div className="ad-reward-options">
        <div className="ad-platform-selector">
          <label>广告平台:</label>
          <select 
            value={selectedPlatform} 
            onChange={(e) => setSelectedPlatform(e.target.value as AdPlatform)}
          >
            {Object.entries(platformDetails).map(([key, details]) => (
              <option key={key} value={key}>
                {details.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="ad-type-selector">
          <label>广告类型:</label>
          <select 
            value={selectedAdType} 
            onChange={(e) => setSelectedAdType(e.target.value as AdType)}
          >
            {Object.entries(adTypeDetails).map(([key, details]) => (
              <option key={key} value={key}>
                {details.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <button 
        className="btn btn-watch-ad" 
        onClick={handleWatchAd}
        disabled={isLoading}
      >
        {isLoading ? '加载中...' : '观看广告'}
      </button>
      
      {adRewards.length > 0 && (
        <div className="ad-rewards-list">
          <h5>我的广告奖励</h5>
          <ul>
            {adRewards.map((reward) => (
              <li key={reward.id} className={`reward-item ${reward.isUsed ? 'used' : ''}`}>
                <div className="reward-info">
                  <span className="reward-platform">
                    {platformDetails[reward.platform]?.name || reward.platform}
                  </span>
                  <span className="reward-type">
                    {adTypeDetails[reward.adType]?.name || reward.adType}
                  </span>
                </div>
                <div className="reward-status">
                  {new Date(reward.expiresAt) > new Date() && !reward.isUsed ? (
                    <span className="status-active">有效</span>
                  ) : (
                    <span className="status-expired">已过期</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * 订阅页面主组件
 */
export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ userId }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const subscriptionService = SubscriptionService.getInstance();
      
      try {
        // 获取用户订阅状态
        const status = await subscriptionService.getSubscriptionStatus(userId);
        setSubscriptionStatus(status);
        
        // 获取可用计划
        const plans = await subscriptionService.getAvailablePlans();
        setAvailablePlans(plans);
      } catch (err) {
        console.error('获取订阅信息失败:', err);
        setError('获取订阅信息失败，请稍后再试');
      }
    };

    fetchData();
  }, [userId]);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !selectedPaymentMethod) {
      setError('请选择计划和支付方式');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const subscriptionService = SubscriptionService.getInstance();
      const paymentService = PaymentServiceFactory.getInstance();
      
      if (selectedPaymentMethod === PaymentMethod.AD_REWARD) {
        // 处理广告奖励
        const adService = AdServiceFactory.getInstance();
        await adService.showAdAndGrantReward(userId, AdType.REWARDED_VIDEO, AdPlatform.ADMOB);
        
        // 刷新订阅状态
        const status = await subscriptionService.getSubscriptionStatus(userId);
        setSubscriptionStatus(status);
        
        setShowPaymentForm(false);
      } else {
        // 处理其他支付方式
        const returnUrl = `${window.location.origin}/subscription/success`;
        const cancelUrl = `${window.location.origin}/subscription/cancel`;
        
        const paymentSessionId = await paymentService.createPaymentSession(
          userId,
          selectedPlan.id,
          returnUrl,
          cancelUrl
        );
        
        // 在实际应用中，这里会重定向到支付页面
        console.log('支付会话ID:', paymentSessionId);
        alert('支付功能演示：支付会话已创建');
      }
    } catch (err) {
      console.error('订阅失败:', err);
      setError('订阅失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRewardGranted = async () => {
    // 刷新订阅状态
    const subscriptionService = SubscriptionService.getInstance();
    const status = await subscriptionService.getSubscriptionStatus(userId);
    setSubscriptionStatus(status);
  };

  return (
    <div className="subscription-page">
      <div className="page-header">
        <h1>订阅计划</h1>
        <p>选择适合您的计划，解锁更多功能</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {subscriptionStatus && (
        <div className="current-subscription">
          <h2>当前订阅状态</h2>
          <div className="subscription-info">
            <div className="subscription-type">
              <span className="label">订阅类型:</span>
              <span className="value">{subscriptionStatus.type}</span>
            </div>
            <div className="subscription-status">
              <span className="label">状态:</span>
              <span className={`value status-${subscriptionStatus.status}`}>
                {subscriptionStatus.status}
              </span>
            </div>
            {subscriptionStatus.expiresAt && (
              <div className="subscription-expiry">
                <span className="label">到期时间:</span>
                <span className="value">
                  {new Date(subscriptionStatus.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="subscription-plans">
        <h2>可用计划</h2>
        <div className="plans-grid">
          {availablePlans.map((plan) => (
            <SubscriptionPlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={subscriptionStatus?.planId === plan.id}
              onSelectPlan={handleSelectPlan}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {showPaymentForm && selectedPlan && (
        <div className="payment-form">
          <h2>完成订阅</h2>
          <div className="selected-plan">
            <h3>已选择的计划: {selectedPlan.name}</h3>
            <div className="plan-price">
              {selectedPlan.price}/{selectedPlan.period}
            </div>
          </div>

          <PaymentMethodSelector
            availableMethods={[
              PaymentMethod.STRIPE,
              PaymentMethod.ALIPAY,
              PaymentMethod.WECHAT_PAY,
              PaymentMethod.AD_REWARD,
            ]}
            selectedMethod={selectedPaymentMethod}
            onMethodChange={setSelectedPaymentMethod}
          />

          {selectedPaymentMethod === PaymentMethod.AD_REWARD && (
            <AdRewardSection
              userId={userId}
              onRewardGranted={handleRewardGranted}
            />
          )}

          <div className="payment-actions">
            <button 
              className="btn btn-cancel" 
              onClick={() => setShowPaymentForm(false)}
            >
              取消
            </button>
            <button 
              className="btn btn-subscribe" 
              onClick={handleSubscribe}
              disabled={!selectedPaymentMethod || isLoading}
            >
              {isLoading ? '处理中...' : '确认订阅'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};