/**
 * 订阅系统集成示例
 * 
 * 展示如何在现有应用中集成订阅服务
 * 确保单一事实源和数据流一致性
 */

import React, { useEffect, useState } from 'react';
import { SubscriptionManager } from '../services/SubscriptionManager';
import { SubscriptionStatus, PaymentMethod, AdPlatform, AdType } from '../types/subscription';

/**
 * 应用订阅状态管理示例组件
 */
export const AppSubscriptionExample: React.FC = () => {
  const [subscriptionManager] = useState(() => SubscriptionManager.getInstance());
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      try {
        setIsLoading(true);
        const status = await subscriptionManager.getCurrentSubscriptionStatus();
        setSubscriptionStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription status');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionStatus();

    // 监听订阅状态变化
    const unsubscribe = subscriptionManager.addEventListener('subscriptionStatusChanged', (event) => {
      setSubscriptionStatus(event.data);
    });

    return () => {
      unsubscribe();
    };
  }, [subscriptionManager]);

  const handleSubscribe = async (planId: string) => {
    try {
      setError(null);
      const result = await subscriptionManager.subscribe(planId, PaymentMethod.STRIPE);
      if (result.success) {
        console.log('Subscription successful:', result.data);
      } else {
        setError(result.error?.message || 'Subscription failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed');
    }
  };

  const handleWatchAd = async (platform: AdPlatform, type: AdType) => {
    try {
      setError(null);
      const result = await subscriptionManager.watchAd(platform, type);
      if (result.success) {
        console.log('Ad reward granted:', result.data);
      } else {
        setError(result.error?.message || 'Failed to grant ad reward');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant ad reward');
    }
  };

  if (isLoading) {
    return <div>Loading subscription status...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!subscriptionStatus) {
    return <div>No subscription data available</div>;
  }

  return (
    <div>
      <h1>Subscription Status</h1>
      <p>Status: {subscriptionStatus.status}</p>
      <p>Expires: {subscriptionStatus.expiresAt?.toLocaleString()}</p>
      <p>Is Premium: {subscriptionStatus.isPremium ? 'Yes' : 'No'}</p>
      
      <h2>Available Actions</h2>
      <button onClick={() => handleSubscribe('premium-monthly')}>
        Subscribe to Premium Monthly
      </button>
      
      <button onClick={() => handleWatchAd(AdPlatform.ADMOB, AdType.REWARDED)}>
        Watch Ad for 3 Days Premium
      </button>
    </div>
  );
};

/**
 * 应用功能权限检查示例
 */
export const FeaturePermissionExample: React.FC = () => {
  const [subscriptionManager] = useState(() => SubscriptionManager.getInstance());
  const [canCreateDeck, setCanCreateDeck] = useState(false);
  const [canCreateCard, setCanCreateCard] = useState(false);
  const [maxDecks, setMaxDecks] = useState(0);
  const [maxCards, setMaxCards] = useState(0);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const limits = await subscriptionManager.getUserLimits();
        setCanCreateDeck(limits.canCreateDeck);
        setCanCreateCard(limits.canCreateCard);
        setMaxDecks(limits.maxDecks);
        setMaxCards(limits.maxCards);
      } catch (err) {
        console.error('Failed to check permissions:', err);
      }
    };

    checkPermissions();

    // 监听权限变化
    const unsubscribe = subscriptionManager.addEventListener('permissionChanged', (event) => {
      const { canCreateDeck, canCreateCard, maxDecks, maxCards } = event.data;
      setCanCreateDeck(canCreateDeck);
      setCanCreateCard(canCreateCard);
      setMaxDecks(maxDecks);
      setMaxCards(maxCards);
    });

    return () => {
      unsubscribe();
    };
  }, [subscriptionManager]);

  return (
    <div>
      <h1>Feature Permissions</h1>
      <p>Can Create Deck: {canCreateDeck ? 'Yes' : 'No'}</p>
      <p>Can Create Card: {canCreateCard ? 'Yes' : 'No'}</p>
      <p>Max Decks: {maxDecks}</p>
      <p>Max Cards: {maxCards}</p>
    </div>
  );
};

/**
 * 应用初始化示例
 * 展示如何在应用启动时初始化订阅服务
 */
export const initializeSubscriptionServices = async (): Promise<void> => {
  try {
    // 获取订阅管理器实例
    const subscriptionManager = SubscriptionManager.getInstance();
    
    // 初始化服务
    await subscriptionManager.initialize();
    
    // 检查当前订阅状态
    const status = await subscriptionManager.getCurrentSubscriptionStatus();
    console.log('Current subscription status:', status);
    
    // 检查用户权限
    const limits = await subscriptionManager.getUserLimits();
    console.log('User limits:', limits);
    
    // 检查广告奖励
    const rewards = await subscriptionManager.getAdRewards();
    console.log('Ad rewards:', rewards);
    
    console.log('Subscription services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize subscription services:', error);
    throw error;
  }
};

/**
 * 应用路由保护示例
 * 展示如何根据订阅状态保护某些功能
 */
export const useSubscriptionProtection = (requiredFeature: 'premium' | 'deck' | 'card') => {
  const [subscriptionManager] = useState(() => SubscriptionManager.getInstance());
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);
        
        switch (requiredFeature) {
          case 'premium':
            const isPremium = await subscriptionManager.isPremiumUser();
            setHasAccess(isPremium);
            break;
            
          case 'deck':
            const limits = await subscriptionManager.getUserLimits();
            setHasAccess(limits.canCreateDeck);
            break;
            
          case 'card':
            const cardLimits = await subscriptionManager.getUserLimits();
            setHasAccess(cardLimits.canCreateCard);
            break;
            
          default:
            setHasAccess(false);
        }
      } catch (error) {
        console.error('Failed to check access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();

    // 监听权限变化
    const unsubscribe = subscriptionManager.addEventListener('permissionChanged', (event) => {
      checkAccess();
    });

    return () => {
      unsubscribe();
    };
  }, [subscriptionManager, requiredFeature]);

  return { hasAccess, isLoading };
};

/**
 * 高级功能组件示例
 * 展示如何保护高级功能
 */
export const PremiumFeatureExample: React.FC = () => {
  const { hasAccess, isLoading } = useSubscriptionProtection('premium');

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <div>
        <h1>Premium Feature</h1>
        <p>This is a premium feature. Please upgrade to premium to access it.</p>
        <button onClick={() => window.location.href = '/subscription'}>
          Upgrade to Premium
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Premium Feature</h1>
      <p>Welcome to this premium feature! You have access to all premium content.</p>
      {/* Premium feature content goes here */}
    </div>
  );
};

/**
 * 卡片创建组件示例
 * 展示如何根据用户限制保护卡片创建功能
 */
export const CardCreationExample: React.FC = () => {
  const { hasAccess, isLoading } = useSubscriptionProtection('card');

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <div>
        <h1>Create Card</h1>
        <p>You have reached your card creation limit. Please upgrade to premium to create more cards.</p>
        <button onClick={() => window.location.href = '/subscription'}>
          Upgrade to Premium
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Create Card</h1>
      <p>You can create a new card.</p>
      {/* Card creation form goes here */}
    </div>
  );
};

/**
 * 应用退出时清理示例
 * 展示如何在应用退出时清理订阅服务
 */
export const cleanupSubscriptionServices = async (): Promise<void> => {
  try {
    const subscriptionManager = SubscriptionManager.getInstance();
    await subscriptionManager.cleanup();
    console.log('Subscription services cleaned up successfully');
  } catch (error) {
    console.error('Failed to cleanup subscription services:', error);
  }
};