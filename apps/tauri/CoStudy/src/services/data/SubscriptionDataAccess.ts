/**
 * 订阅数据访问层实现
 * 
 * 确保本地和云端订阅状态同步
 * 遵循单一事实源原则，确保数据的一致性
 */

import { 
  SubscriptionStatus, 
  SubscriptionPlan, 
  SubscriptionTransaction, 
  AdReward,
  UserSubscription 
} from '@/types/subscription';
import { ISubscriptionDataAccess } from './interfaces/ISubscriptionService';

/**
 * 本地数据访问实现
 */
export class LocalSubscriptionDataAccess implements ISubscriptionDataAccess {
  private dbName: string = 'subscription_db';
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * 初始化IndexedDB数据库
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('数据库打开失败:', event);
        reject(new Error('数据库打开失败'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建订阅状态表
        if (!db.objectStoreNames.contains('subscription_status')) {
          const subscriptionStatusStore = db.createObjectStore('subscription_status', { keyPath: 'userId' });
          subscriptionStatusStore.createIndex('userId', 'userId', { unique: true });
        }

        // 创建订阅计划表
        if (!db.objectStoreNames.contains('subscription_plans')) {
          const plansStore = db.createObjectStore('subscription_plans', { keyPath: 'id' });
          plansStore.createIndex('id', 'id', { unique: true });
        }

        // 创建订阅交易表
        if (!db.objectStoreNames.contains('subscription_transactions')) {
          const transactionsStore = db.createObjectStore('subscription_transactions', { keyPath: 'id' });
          transactionsStore.createIndex('userId', 'userId', { unique: false });
        }

        // 创建广告奖励表
        if (!db.objectStoreNames.contains('ad_rewards')) {
          const rewardsStore = db.createObjectStore('ad_rewards', { keyPath: 'id' });
          rewardsStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  /**
   * 获取用户订阅状态
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['subscription_status'], 'readonly');
      const store = transaction.objectStore('subscription_status');
      const request = store.get(userId);

      request.onerror = () => {
        reject(new Error('获取用户订阅状态失败'));
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(result || null);
      };
    });
  }

  /**
   * 保存用户订阅状态
   */
  async saveUserSubscription(subscription: UserSubscription): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['subscription_status'], 'readwrite');
      const store = transaction.objectStore('subscription_status');
      const request = store.put(subscription);

      request.onerror = () => {
        reject(new Error('保存用户订阅状态失败'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 获取订阅计划
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['subscription_plans'], 'readonly');
      const store = transaction.objectStore('subscription_plans');
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('获取订阅计划失败'));
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(result || []);
      };
    });
  }

  /**
   * 保存订阅计划
   */
  async saveSubscriptionPlans(plans: SubscriptionPlan[]): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['subscription_plans'], 'readwrite');
      const store = transaction.objectStore('subscription_plans');

      // 清空现有数据
      const clearRequest = store.clear();
      
      clearRequest.onerror = () => {
        reject(new Error('清空订阅计划失败'));
      };

      clearRequest.onsuccess = () => {
        // 添加新数据
        let completed = 0;
        const total = plans.length;

        if (total === 0) {
          resolve();
          return;
        }

        for (const plan of plans) {
          const request = store.add(plan);

          request.onerror = () => {
            reject(new Error('保存订阅计划失败'));
          };

          request.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
        }
      };
    });
  }

  /**
   * 获取用户订阅交易记录
   */
  async getUserTransactions(userId: string): Promise<SubscriptionTransaction[]> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['subscription_transactions'], 'readonly');
      const store = transaction.objectStore('subscription_transactions');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onerror = () => {
        reject(new Error('获取用户交易记录失败'));
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(result || []);
      };
    });
  }

  /**
   * 保存订阅交易记录
   */
  async saveTransaction(transaction: SubscriptionTransaction): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const dbTransaction = this.db.transaction(['subscription_transactions'], 'readwrite');
      const store = dbTransaction.objectStore('subscription_transactions');
      const request = store.add(transaction);

      request.onerror = () => {
        reject(new Error('保存交易记录失败'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 获取用户广告奖励记录
   */
  async getUserAdRewards(userId: string): Promise<AdReward[]> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['ad_rewards'], 'readonly');
      const store = transaction.objectStore('ad_rewards');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onerror = () => {
        reject(new Error('获取用户广告奖励失败'));
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(result || []);
      };
    });
  }

  /**
   * 保存广告奖励记录
   */
  async saveAdReward(reward: AdReward): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['ad_rewards'], 'readwrite');
      const store = transaction.objectStore('ad_rewards');
      const request = store.add(reward);

      request.onerror = () => {
        reject(new Error('保存广告奖励失败'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 更新广告奖励记录
   */
  async updateAdReward(reward: AdReward): Promise<void> {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('数据库未初始化'));
        return;
      }

      const transaction = this.db.transaction(['ad_rewards'], 'readwrite');
      const store = transaction.objectStore('ad_rewards');
      const request = store.put(reward);

      request.onerror = () => {
        reject(new Error('更新广告奖励失败'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

/**
 * 云端数据访问实现
 */
export class RemoteSubscriptionDataAccess implements ISubscriptionDataAccess {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * 获取用户订阅状态
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/subscription`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`获取用户订阅状态失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.subscription;
    } catch (error) {
      console.error('获取用户订阅状态失败:', error);
      throw error;
    }
  }

  /**
   * 保存用户订阅状态
   */
  async saveUserSubscription(subscription: UserSubscription): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${subscription.userId}/subscription`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        throw new Error(`保存用户订阅状态失败: ${response.statusText}`);
      }
    } catch (error) {
      console.error('保存用户订阅状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取订阅计划
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription-plans`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`获取订阅计划失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.plans;
    } catch (error) {
      console.error('获取订阅计划失败:', error);
      throw error;
    }
  }

  /**
   * 保存订阅计划
   */
  async saveSubscriptionPlans(plans: SubscriptionPlan[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription-plans`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plans }),
      });

      if (!response.ok) {
        throw new Error(`保存订阅计划失败: ${response.statusText}`);
      }
    } catch (error) {
      console.error('保存订阅计划失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户订阅交易记录
   */
  async getUserTransactions(userId: string): Promise<SubscriptionTransaction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/transactions`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`获取用户交易记录失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.transactions;
    } catch (error) {
      console.error('获取用户交易记录失败:', error);
      throw error;
    }
  }

  /**
   * 保存订阅交易记录
   */
  async saveTransaction(transaction: SubscriptionTransaction): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction }),
      });

      if (!response.ok) {
        throw new Error(`保存交易记录失败: ${response.statusText}`);
      }
    } catch (error) {
      console.error('保存交易记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户广告奖励记录
   */
  async getUserAdRewards(userId: string): Promise<AdReward[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}/ad-rewards`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`获取用户广告奖励失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.rewards;
    } catch (error) {
      console.error('获取用户广告奖励失败:', error);
      throw error;
    }
  }

  /**
   * 保存广告奖励记录
   */
  async saveAdReward(reward: AdReward): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/ad-rewards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reward }),
      });

      if (!response.ok) {
        throw new Error(`保存广告奖励失败: ${response.statusText}`);
      }
    } catch (error) {
      console.error('保存广告奖励失败:', error);
      throw error;
    }
  }

  /**
   * 更新广告奖励记录
   */
  async updateAdReward(reward: AdReward): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/ad-rewards/${reward.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reward }),
      });

      if (!response.ok) {
        throw new Error(`更新广告奖励失败: ${response.statusText}`);
      }
    } catch (error) {
      console.error('更新广告奖励失败:', error);
      throw error;
    }
  }
}

/**
 * 混合数据访问实现
 * 结合本地和云端数据访问，实现数据同步
 */
export class HybridSubscriptionDataAccess implements ISubscriptionDataAccess {
  private localAccess: LocalSubscriptionDataAccess;
  private remoteAccess: RemoteSubscriptionDataAccess;
  private syncInProgress: boolean = false;

  constructor(localAccess: LocalSubscriptionDataAccess, remoteAccess: RemoteSubscriptionDataAccess) {
    this.localAccess = localAccess;
    this.remoteAccess = remoteAccess;
  }

  /**
   * 获取用户订阅状态
   * 优先从本地获取，如果本地没有则从远程获取并缓存到本地
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // 先从本地获取
      const localSubscription = await this.localAccess.getUserSubscription(userId);
      
      // 如果本地有数据且未过期，直接返回
      if (localSubscription && this.isDataFresh(localSubscription.lastUpdated)) {
        return localSubscription;
      }
      
      // 从远程获取最新数据
      const remoteSubscription = await this.remoteAccess.getUserSubscription(userId);
      
      // 如果远程有数据，更新本地缓存
      if (remoteSubscription) {
        await this.localAccess.saveUserSubscription(remoteSubscription);
        return remoteSubscription;
      }
      
      // 如果远程也没有数据，返回本地数据（如果有的话）
      return localSubscription;
    } catch (error) {
      console.error('获取用户订阅状态失败:', error);
      
      // 如果远程访问失败，返回本地数据（如果有的话）
      try {
        return await this.localAccess.getUserSubscription(userId);
      } catch (localError) {
        console.error('获取本地用户订阅状态也失败:', localError);
        throw error;
      }
    }
  }

  /**
   * 保存用户订阅状态
   * 同时更新本地和远程数据
   */
  async saveUserSubscription(subscription: UserSubscription): Promise<void> {
    try {
      // 更新本地数据
      await this.localAccess.saveUserSubscription(subscription);
      
      // 更新远程数据
      await this.remoteAccess.saveUserSubscription(subscription);
    } catch (error) {
      console.error('保存用户订阅状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取订阅计划
   * 优先从本地获取，如果本地没有则从远程获取并缓存到本地
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      // 先从本地获取
      const localPlans = await this.localAccess.getSubscriptionPlans();
      
      // 如果本地有数据且未过期，直接返回
      if (localPlans.length > 0 && this.isDataFresh(localPlans[0].lastUpdated)) {
        return localPlans;
      }
      
      // 从远程获取最新数据
      const remotePlans = await this.remoteAccess.getSubscriptionPlans();
      
      // 如果远程有数据，更新本地缓存
      if (remotePlans.length > 0) {
        await this.localAccess.saveSubscriptionPlans(remotePlans);
        return remotePlans;
      }
      
      // 如果远程也没有数据，返回本地数据（如果有的话）
      return localPlans;
    } catch (error) {
      console.error('获取订阅计划失败:', error);
      
      // 如果远程访问失败，返回本地数据（如果有的话）
      try {
        return await this.localAccess.getSubscriptionPlans();
      } catch (localError) {
        console.error('获取本地订阅计划也失败:', localError);
        throw error;
      }
    }
  }

  /**
   * 保存订阅计划
   * 同时更新本地和远程数据
   */
  async saveSubscriptionPlans(plans: SubscriptionPlan[]): Promise<void> {
    try {
      // 更新本地数据
      await this.localAccess.saveSubscriptionPlans(plans);
      
      // 更新远程数据
      await this.remoteAccess.saveSubscriptionPlans(plans);
    } catch (error) {
      console.error('保存订阅计划失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户订阅交易记录
   * 优先从本地获取，如果本地没有则从远程获取并缓存到本地
   */
  async getUserTransactions(userId: string): Promise<SubscriptionTransaction[]> {
    try {
      // 先从本地获取
      const localTransactions = await this.localAccess.getUserTransactions(userId);
      
      // 如果本地有数据且未过期，直接返回
      if (localTransactions.length > 0 && this.isDataFresh(localTransactions[0].lastUpdated)) {
        return localTransactions;
      }
      
      // 从远程获取最新数据
      const remoteTransactions = await this.remoteAccess.getUserTransactions(userId);
      
      // 如果远程有数据，更新本地缓存
      if (remoteTransactions.length > 0) {
        for (const transaction of remoteTransactions) {
          await this.localAccess.saveTransaction(transaction);
        }
        return remoteTransactions;
      }
      
      // 如果远程也没有数据，返回本地数据（如果有的话）
      return localTransactions;
    } catch (error) {
      console.error('获取用户交易记录失败:', error);
      
      // 如果远程访问失败，返回本地数据（如果有的话）
      try {
        return await this.localAccess.getUserTransactions(userId);
      } catch (localError) {
        console.error('获取本地用户交易记录也失败:', localError);
        throw error;
      }
    }
  }

  /**
   * 保存订阅交易记录
   * 同时更新本地和远程数据
   */
  async saveTransaction(transaction: SubscriptionTransaction): Promise<void> {
    try {
      // 更新本地数据
      await this.localAccess.saveTransaction(transaction);
      
      // 更新远程数据
      await this.remoteAccess.saveTransaction(transaction);
    } catch (error) {
      console.error('保存交易记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户广告奖励记录
   * 优先从本地获取，如果本地没有则从远程获取并缓存到本地
   */
  async getUserAdRewards(userId: string): Promise<AdReward[]> {
    try {
      // 先从本地获取
      const localRewards = await this.localAccess.getUserAdRewards(userId);
      
      // 如果本地有数据且未过期，直接返回
      if (localRewards.length > 0 && this.isDataFresh(localRewards[0].lastUpdated)) {
        return localRewards;
      }
      
      // 从远程获取最新数据
      const remoteRewards = await this.remoteAccess.getUserAdRewards(userId);
      
      // 如果远程有数据，更新本地缓存
      if (remoteRewards.length > 0) {
        for (const reward of remoteRewards) {
          await this.localAccess.saveAdReward(reward);
        }
        return remoteRewards;
      }
      
      // 如果远程也没有数据，返回本地数据（如果有的话）
      return localRewards;
    } catch (error) {
      console.error('获取用户广告奖励失败:', error);
      
      // 如果远程访问失败，返回本地数据（如果有的话）
      try {
        return await this.localAccess.getUserAdRewards(userId);
      } catch (localError) {
        console.error('获取本地用户广告奖励也失败:', localError);
        throw error;
      }
    }
  }

  /**
   * 保存广告奖励记录
   * 同时更新本地和远程数据
   */
  async saveAdReward(reward: AdReward): Promise<void> {
    try {
      // 更新本地数据
      await this.localAccess.saveAdReward(reward);
      
      // 更新远程数据
      await this.remoteAccess.saveAdReward(reward);
    } catch (error) {
      console.error('保存广告奖励失败:', error);
      throw error;
    }
  }

  /**
   * 更新广告奖励记录
   * 同时更新本地和远程数据
   */
  async updateAdReward(reward: AdReward): Promise<void> {
    try {
      // 更新本地数据
      await this.localAccess.updateAdReward(reward);
      
      // 更新远程数据
      await this.remoteAccess.updateAdReward(reward);
    } catch (error) {
      console.error('更新广告奖励失败:', error);
      throw error;
    }
  }

  /**
   * 同步数据
   * 将本地数据同步到远程
   */
  async syncData(userId: string): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // 获取本地数据
      const localSubscription = await this.localAccess.getUserSubscription(userId);
      const localTransactions = await this.localAccess.getUserTransactions(userId);
      const localRewards = await this.localAccess.getUserAdRewards(userId);

      // 同步订阅状态
      if (localSubscription) {
        await this.remoteAccess.saveUserSubscription(localSubscription);
      }

      // 同步交易记录
      for (const transaction of localTransactions) {
        await this.remoteAccess.saveTransaction(transaction);
      }

      // 同步广告奖励
      for (const reward of localRewards) {
        if (reward.isUsed) {
          await this.remoteAccess.updateAdReward(reward);
        } else {
          await this.remoteAccess.saveAdReward(reward);
        }
      }
    } catch (error) {
      console.error('同步数据失败:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 检查数据是否新鲜
   */
  private isDataFresh(lastUpdated: Date): boolean {
    const now = new Date();
    const diff = now.getTime() - new Date(lastUpdated).getTime();
    // 数据在5分钟内被认为是新鲜的
    return diff < 5 * 60 * 1000;
  }
}