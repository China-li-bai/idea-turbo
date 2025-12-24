/**
 * 设置服务层 (Settings Service)
 *
 * 重要变更：强制只使用本地数据库，不再依赖策略判断
 *
 * 符合 Linus 编程哲学：
 * 1. 简单直接 - 每个方法只做一件事
 * 2. "Never Break Userspace" - 页面加载时不会发起网络请求
 * 3. "Good Taste" - 消除策略判断，直接使用本地数据
 * 4. 实用主义 - 解决实际问题，不过度抽象
 *
 * 这个服务层负责处理所有与设置相关的数据访问逻辑，
 * 所有数据都从本地数据库读写，Supabase 仅用于手动同步。
 */

import { getUnifiedDataAccess } from './UnifiedDataAccess';
import { UserSettingsRow, ThemeType } from '@/packages/lib/schema';
import { isIOS14OrLower } from './PlatformDetectionService';
import { uuid } from "@make-gold/lib/uuid";

// 设置类型定义 (继承自 schema.ts UserSettingsRow)
export interface UserSettings extends UserSettingsRow {}

// FSRS 参数类型
export interface FSRSParameters {
  request_retention: number;
  maximum_interval: number;
  w: number[];
  enable_fuzz: boolean;
  enable_short_term: boolean;
}

// 默认设置值
const DEFAULT_SETTINGS: Partial<UserSettings> = {
  language: 'en',
  theme: 'system',
  daily_reminders: true,
  reminder_time: '09:00',
  fsrs_parameters: {
    request_retention: 0.9,
    maximum_interval: 36500,
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
    enable_fuzz: false,
    enable_short_term: true
  }
};

/**
 * 设置服务类
 * 
 * 遵循 Linus 编码哲学：
 * 1. 单一职责 - 只处理设置相关业务逻辑
 * 2. "Good Taste" - 设置数据完全本地化，不涉及远程同步
 * 3. 简单性 - iOS14用户使用内存/localStorage回退，非iOS14用户使用PGlite
 * 4. 透明度 - 所有数据操作都有明确的返回值和错误处理
 */
class SettingsService {
  private localSettings: Map<string, UserSettings> = new Map();

  /**
   * 获取本地存储的key
   */
  private getStorageKey(userId: string): string {
    return `user_settings_${userId}`;
  }

  /**
   * 从localStorage读取设置
   */
  private getFromLocalStorage(userId: string): UserSettings | null {
    try {
      const stored = localStorage.getItem(this.getStorageKey(userId));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[SettingsService] localStorage读取失败:', error);
    }
    return null;
  }

  /**
   * 保存设置到localStorage
   */
  private saveToLocalStorage(userId: string, settings: UserSettings): void {
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(settings));
    } catch (error) {
      console.warn('[SettingsService] localStorage保存失败:', error);
    }
  }

  /**
   * 创建默认设置
   */
  private createDefaultSettings(userId: string): UserSettings {
    return {
      id: `local_${userId}`,
      user_id: userId,
      language: DEFAULT_SETTINGS.language || 'en',
      theme: DEFAULT_SETTINGS.theme || 'system',
      daily_reminders: DEFAULT_SETTINGS.daily_reminders || true,
      reminder_time: DEFAULT_SETTINGS.reminder_time || '09:00',
      fsrs_parameters: DEFAULT_SETTINGS.fsrs_parameters || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * 获取用户设置 - 纯本地实现
   * 
   * @param userId 用户ID
   * @returns 用户设置或默认设置
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      // 1. 先检查内存缓存
      const cached = this.localSettings.get(userId);
      if (cached) {
        return cached;
      }

      // 2. 从localStorage读取
      const fromStorage = this.getFromLocalStorage(userId);
      if (fromStorage) {
        this.localSettings.set(userId, fromStorage);
        return fromStorage;
      }

      // 3. 尝试从本地PGlite读取（非iOS14用户）
      if (!isIOS14OrLower()) {
        try {
          const dataAccess = getUnifiedDataAccess({ dataSource: 'local' });
          const result = await dataAccess.select<UserSettings>(
            'user_settings',
            '*',
            { user_id: userId }
          );

          if (!result.error && result.data && result.data.length > 0) {
            const settings = result.data[0];
            this.localSettings.set(userId, settings);
            this.saveToLocalStorage(userId, settings);
            return settings;
          }
        } catch (error) {
          console.warn('[SettingsService] PGlite读取失败，使用默认设置:', error);
        }
      }

      // 4. 创建并保存默认设置
      const defaultSettings = this.createDefaultSettings(userId);
      this.localSettings.set(userId, defaultSettings);
      this.saveToLocalStorage(userId, defaultSettings);
      
      // 5. 如果可能，也保存到PGlite
      if (!isIOS14OrLower()) {
        try {
          const dataAccess = getUnifiedDataAccess({ dataSource: 'local' });
          await dataAccess.insert<UserSettings>('user_settings', {
            ...defaultSettings,
            id: uuid() // 为数据库生成新的UUID
          });
        } catch (error) {
          console.warn('[SettingsService] PGlite保存失败（不影响功能）:', error);
        }
      }

      return defaultSettings;
    } catch (error) {
      console.error('[SettingsService] getUserSettings失败，返回默认设置:', error);
      return this.createDefaultSettings(userId);
    }
  }

  /**
   * 更新用户设置 - 纯本地实现
   * 
   * @param userId 用户ID
   * @param settings 要更新的设置
   * @returns 更新后的用户设置
   */
  async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings> {
    try {
      // 1. 先获取现有设置
      const currentSettings = await this.getUserSettings(userId);
      
      // 2. 合并更新
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        updated_at: new Date().toISOString()
      };

      // 3. 保存到内存缓存
      this.localSettings.set(userId, updatedSettings);

      // 4. 保存到localStorage
      this.saveToLocalStorage(userId, updatedSettings);

      // 5. 如果可能，也更新PGlite
      if (!isIOS14OrLower()) {
        try {
          const dataAccess = getUnifiedDataAccess({ dataSource: 'local' });
          await dataAccess.update<UserSettings>(
            'user_settings',
            settings,
            { user_id: userId }
          );
        } catch (error) {
          console.warn('[SettingsService] PGlite更新失败（不影响功能）:', error);
        }
      }

      return updatedSettings;
    } catch (error) {
      console.error('[SettingsService] updateUserSettings失败:', error);
      throw error;
    }
  }

  /**
   * 更新语言设置
   * 
   * @param userId 用户ID
   * @param language 语言代码
   * @returns 更新后的用户设置
   */
  async updateLanguage(userId: string, language: string): Promise<UserSettings> {
    return this.updateUserSettings(userId, { language });
  }

  /**
   * 更新主题设置
   *
   * @param userId 用户ID
   * @param theme 主题
   * @returns 更新后的用户设置
   */
  async updateTheme(userId: string, theme: ThemeType): Promise<UserSettings> {
    return this.updateUserSettings(userId, { theme });
  }

  /**
   * 更新每日提醒设置
   * 
   * @param userId 用户ID
   * @param dailyReminders 是否启用每日提醒
   * @returns 更新后的用户设置
   */
  async updateDailyReminders(userId: string, dailyReminders: boolean): Promise<UserSettings> {
    return this.updateUserSettings(userId, { daily_reminders: dailyReminders });
  }

  /**
   * 更新提醒时间
   * 
   * @param userId 用户ID
   * @param reminderTime 提醒时间
   * @returns 更新后的用户设置
   */
  async updateReminderTime(userId: string, reminderTime: string): Promise<UserSettings> {
    return this.updateUserSettings(userId, { reminder_time: reminderTime });
  }

  /**
   * 更新FSRS参数
   * 
   * @param userId 用户ID
   * @param fsrsParameters FSRS参数
   * @returns 更新后的用户设置
   */
  async updateFSRSParameters(userId: string, fsrsParameters: FSRSParameters): Promise<UserSettings> {
    return this.updateUserSettings(userId, { fsrs_parameters: fsrsParameters });
  }

  /**
   * 重置FSRS参数为默认值
   * 
   * @param userId 用户ID
   * @returns 更新后的用户设置
   */
  async resetFSRSParameters(userId: string): Promise<UserSettings> {
    return this.updateUserSettings(userId, {
      fsrs_parameters: DEFAULT_SETTINGS.fsrs_parameters
    });
  }

  /**
   * 获取FSRS参数
   * 
   * @param userId 用户ID
   * @returns FSRS参数
   */
  async getFSRSParameters(userId: string): Promise<FSRSParameters> {
    const settings = await this.getUserSettings(userId);
    return settings.fsrs_parameters as FSRSParameters;
  }

  /**
   * 检查是否启用每日提醒
   * 
   * @param userId 用户ID
   * @returns 是否启用每日提醒
   */
  async isDailyRemindersEnabled(userId: string): Promise<boolean> {
    const settings = await this.getUserSettings(userId);
    return settings.daily_reminders;
  }

  /**
   * 获取提醒时间
   * 
   * @param userId 用户ID
   * @returns 提醒时间
   */
  async getReminderTime(userId: string): Promise<string> {
    const settings = await this.getUserSettings(userId);
    return settings.reminder_time;
  }

  /**
   * 获取语言设置
   * 
   * @param userId 用户ID
   * @returns 语言代码
   */
  async getLanguage(userId: string): Promise<string> {
    const settings = await this.getUserSettings(userId);
    return settings.language;
  }

  /**
   * 获取主题设置
   *
   * @param userId 用户ID
   * @returns 主题
   */
  async getTheme(userId: string): Promise<ThemeType> {
    const settings = await this.getUserSettings(userId);
    return settings.theme;
  }
}

// 创建默认实例
let defaultInstance: SettingsService | null = null;

/**
 * 获取默认的设置服务实例
 * 
 * @returns SettingsService 实例
 */
export function getSettingsService(): SettingsService {
  if (!defaultInstance) {
    defaultInstance = new SettingsService();
  }
  return defaultInstance;
}

/**
 * 创建新的设置服务实例
 * 
 * @returns SettingsService 实例
 */
export function createSettingsService(): SettingsService {
  return new SettingsService();
}

// 导出类和类型
export { SettingsService };
export default SettingsService;