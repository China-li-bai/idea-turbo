/**
 * 广告服务实现
 * 
 * 支持多种广告平台，实现观看广告获取奖励功能
 * 遵循单一事实源原则，确保奖励发放的一致性
 */

import { AdReward, AdType, AdPlatform } from '@/types/subscription';
import { IAdService } from './interfaces/ISubscriptionService';

/**
 * 广告平台服务接口
 */
interface IAdPlatformService {
  loadAd(adType: AdType): Promise<string>;
  showAd(adId: string): Promise<boolean>;
  isAdAvailable(adType: AdType): Promise<boolean>;
}

/**
 * AdMob广告服务实现
 */
export class AdMobService implements IAdPlatformService {
  private appId: string;
  private adUnitIds: { [key: string]: string };

  constructor(config: { appId: string; adUnitIds: { [key: string]: string } }) {
    this.appId = config.appId;
    this.adUnitIds = config.adUnitIds;
  }

  async loadAd(adType: AdType): Promise<string> {
    const adUnitId = this.adUnitIds[adType];
    if (!adUnitId) {
      throw new Error(`找不到广告类型 ${adType} 对应的广告单元ID`);
    }

    // 在实际应用中，这里会调用AdMob SDK加载广告
    // 这里简化处理，返回模拟的广告ID
    const adId = `admob_${adType}_${Date.now()}`;
    
    // 模拟加载广告延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return adId;
  }

  async showAd(adId: string): Promise<boolean> {
    // 在实际应用中，这里会调用AdMob SDK显示广告
    // 这里简化处理，模拟广告展示成功
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 模拟用户观看广告完成
    return true;
  }

  async isAdAvailable(adType: AdType): Promise<boolean> {
    // 在实际应用中，这里会检查AdMob是否有可用的广告
    // 这里简化处理，模拟广告可用
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

/**
 * IronSource广告服务实现
 */
export class IronSourceService implements IAdPlatformService {
  private appKey: string;
  private adUnitIds: { [key: string]: string };

  constructor(config: { appKey: string; adUnitIds: { [key: string]: string } }) {
    this.appKey = config.appKey;
    this.adUnitIds = config.adUnitIds;
  }

  async loadAd(adType: AdType): Promise<string> {
    const adUnitId = this.adUnitIds[adType];
    if (!adUnitId) {
      throw new Error(`找不到广告类型 ${adType} 对应的广告单元ID`);
    }

    // 在实际应用中，这里会调用IronSource SDK加载广告
    // 这里简化处理，返回模拟的广告ID
    const adId = `ironsource_${adType}_${Date.now()}`;
    
    // 模拟加载广告延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return adId;
  }

  async showAd(adId: string): Promise<boolean> {
    // 在实际应用中，这里会调用IronSource SDK显示广告
    // 这里简化处理，模拟广告展示成功
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 模拟用户观看广告完成
    return true;
  }

  async isAdAvailable(adType: AdType): Promise<boolean> {
    // 在实际应用中，这里会检查IronSource是否有可用的广告
    // 这里简化处理，模拟广告可用
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

/**
 * 广告奖励服务实现
 */
export class AdRewardService implements IAdService {
  private adMobService: AdMobService;
  private ironSourceService: IronSourceService;
  private rewardDuration: number; // 奖励持续时间（天）

  constructor(
    adMobService: AdMobService,
    ironSourceService: IronSourceService,
    rewardDuration: number = 3
  ) {
    this.adMobService = adMobService;
    this.ironSourceService = ironSourceService;
    this.rewardDuration = rewardDuration;
  }

  /**
   * 显示广告并发放奖励
   */
  async showAdAndGrantReward(
    userId: string, 
    adType: AdType, 
    platform: AdPlatform
  ): Promise<AdReward> {
    // 获取广告服务
    const adService = this.getAdPlatformService(platform);
    
    // 检查广告是否可用
    const isAdAvailable = await adService.isAdAvailable(adType);
    if (!isAdAvailable) {
      throw new Error('当前没有可用的广告');
    }
    
    // 加载广告
    const adId = await adService.loadAd(adType);
    
    // 显示广告
    const adWatched = await adService.showAd(adId);
    if (!adWatched) {
      throw new Error('广告观看未完成');
    }
    
    // 创建奖励记录
    const reward: AdReward = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      adType,
      platform,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + this.rewardDuration * 24 * 60 * 60 * 1000),
      isUsed: false,
    };
    
    // 保存奖励记录到数据库
    await this.saveAdReward(reward);
    
    return reward;
  }

  /**
   * 检查用户是否有有效的广告奖励
   */
  async hasValidAdReward(userId: string): Promise<boolean> {
    // 在实际应用中，这里会查询数据库获取用户的广告奖励记录
    // 这里简化处理，模拟查询结果
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 模拟返回用户有有效奖励
    return Math.random() > 0.5;
  }

  /**
   * 获取用户的广告奖励列表
   */
  async getUserAdRewards(userId: string): Promise<AdReward[]> {
    // 在实际应用中，这里会查询数据库获取用户的广告奖励记录
    // 这里简化处理，返回模拟数据
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const rewards: AdReward[] = [
      {
        id: 'reward_1',
        userId,
        adType: AdType.REWARDED_VIDEO,
        platform: AdPlatform.ADMOB,
        grantedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
        expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后过期
        isUsed: false,
      },
      {
        id: 'reward_2',
        userId,
        adType: AdType.INTERSTITIAL,
        platform: AdPlatform.IRONSOURCE,
        grantedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前已过期
        isUsed: false,
      },
    ];
    
    return rewards;
  }

  /**
   * 标记广告奖励为已使用
   */
  async markAdRewardAsUsed(rewardId: string): Promise<boolean> {
    // 在实际应用中，这里会更新数据库中的奖励记录
    // 这里简化处理，模拟更新成功
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  /**
   * 获取广告平台详情
   */
  async getAdPlatformDetails(platform: AdPlatform): Promise<any> {
    switch (platform) {
      case AdPlatform.ADMOB:
        return {
          name: 'AdMob',
          description: 'Google移动广告平台',
          icon: 'admob',
          supportedAdTypes: [AdType.BANNER, AdType.INTERSTITIAL, AdType.REWARDED_VIDEO],
          supportedRegions: ['ALL'],
        };
      case AdPlatform.IRONSOURCE:
        return {
          name: 'IronSource',
          description: '全球领先的移动广告平台',
          icon: 'ironsource',
          supportedAdTypes: [AdType.INTERSTITIAL, AdType.REWARDED_VIDEO],
          supportedRegions: ['ALL'],
        };
      default:
        throw new Error(`不支持的广告平台: ${platform}`);
    }
  }

  /**
   * 获取广告类型详情
   */
  async getAdTypeDetails(adType: AdType): Promise<any> {
    switch (adType) {
      case AdType.BANNER:
        return {
          name: '横幅广告',
          description: '应用顶部或底部的横幅广告',
          icon: 'banner',
          rewardMultiplier: 0.5, // 奖励倍数
        };
      case AdType.INTERSTITIAL:
        return {
          name: '插页式广告',
          description: '全屏显示的插页式广告',
          icon: 'interstitial',
          rewardMultiplier: 1.0,
        };
      case AdType.REWARDED_VIDEO:
        return {
          name: '激励视频广告',
          description: '用户可选择观看以获取奖励的视频广告',
          icon: 'rewarded-video',
          rewardMultiplier: 1.0,
        };
      default:
        throw new Error(`不支持的广告类型: ${adType}`);
    }
  }

  /**
   * 获取广告平台服务
   */
  private getAdPlatformService(platform: AdPlatform): IAdPlatformService {
    switch (platform) {
      case AdPlatform.ADMOB:
        return this.adMobService;
      case AdPlatform.IRONSOURCE:
        return this.ironSourceService;
      default:
        throw new Error(`不支持的广告平台: ${platform}`);
    }
  }

  /**
   * 保存广告奖励记录
   */
  private async saveAdReward(reward: AdReward): Promise<void> {
    // 在实际应用中，这里会将奖励记录保存到数据库
    // 这里简化处理，模拟保存成功
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * 广告服务工厂
 */
export class AdServiceFactory {
  private static instance: AdRewardService | null = null;

  static getInstance(): AdRewardService {
    if (!this.instance) {
      // 初始化广告服务
      const adMobService = new AdMobService({
        appId: import.meta.env.VITE_ADMOB_APP_ID || '',
        adUnitIds: {
          [AdType.BANNER]: import.meta.env.VITE_ADMOB_BANNER_UNIT_ID || '',
          [AdType.INTERSTITIAL]: import.meta.env.VITE_ADMOB_INTERSTITIAL_UNIT_ID || '',
          [AdType.REWARDED_VIDEO]: import.meta.env.VITE_ADMOB_REWARDED_UNIT_ID || '',
        },
      });

      const ironSourceService = new IronSourceService({
        appKey: import.meta.env.VITE_IRONSOURCE_APP_KEY || '',
        adUnitIds: {
          [AdType.INTERSTITIAL]: import.meta.env.VITE_IRONSOURCE_INTERSTITIAL_UNIT_ID || '',
          [AdType.REWARDED_VIDEO]: import.meta.env.VITE_IRONSOURCE_REWARDED_UNIT_ID || '',
        },
      });

      this.instance = new AdRewardService(adMobService, ironSourceService);
    }

    return this.instance;
  }
}