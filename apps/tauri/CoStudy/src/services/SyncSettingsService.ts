/**
 * Sync Settings Service
 * 
 * Handles all sync settings related data operations.
 * 遵循 Linus 编码哲学：
 * 1. "Never Break Userspace" - 未登录用户不会访问远程数据
 * 2. "Good Taste" - 通过策略服务统一数据访问决策
 * 3. 简单直接，透明清晰
 */

import { getDataAccessStrategyService, type DataAccessStrategyService } from './DataAccessStrategyService';
import { type UnifiedDataAccess } from './UnifiedDataAccess';

// Sync settings types
export interface SyncSettings {
  id?: string;
  user_id: string;
  auto_sync: boolean;
  sync_decks: boolean;
  sync_cards: boolean;
  sync_progress: boolean;
  sync_interval: number; // in minutes
  last_sync_time?: number;
  sync_method: 'local' | 'supabase' | 'hybrid';
  created_at?: string;
  updated_at?: string;
}

export interface SyncStatus {
  is_syncing: boolean;
  last_sync_time: number | null;
  sync_method: 'local' | 'supabase' | 'hybrid';
  error?: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
  timestamp?: number;
}

// Default sync settings
export const DEFAULT_SYNC_SETTINGS: Omit<SyncSettings, 'user_id'> = {
  auto_sync: false,
  sync_decks: true,
  sync_cards: true,
  sync_progress: true,
  sync_interval: 30, // 30 minutes
  sync_method: 'hybrid'
};

class SyncSettingsService {
  private strategyService: DataAccessStrategyService;
  private tableName = 'sync_settings';

  constructor(strategyService?: DataAccessStrategyService) {
    this.strategyService = strategyService || getDataAccessStrategyService();
  }

  /**
   * 获取当前用户适用的数据访问实例
   */
  private async getDataAccess(): Promise<UnifiedDataAccess> {
    return await this.strategyService.getDataAccessForCurrentUser();
  }

  /**
   * Get sync settings for a user
   */
  async getSyncSettings(userId: string): Promise<SyncSettings | null> {
    try {
      const dataAccess = await this.getDataAccess();
      const result = await dataAccess.select<SyncSettings>(
        this.tableName,
        '*',
        { user_id: userId },
        undefined,
        1
      );

      if (result.error) {
        throw result.error;
      }

      return result.data && result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('Error getting sync settings:', error);
      return null;
    }
  }

  /**
   * Create sync settings for a user
   */
  async createSyncSettings(userId: string): Promise<SyncResult> {
    try {
      const dataAccess = await this.getDataAccess();
      const settings: Omit<SyncSettings, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        ...DEFAULT_SYNC_SETTINGS
      };

      const result = await dataAccess.insert<SyncSettings>(this.tableName, settings);

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        data: result.data,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error creating sync settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update sync settings
   */
  async updateSyncSettings(userId: string, settings: Partial<SyncSettings>): Promise<SyncResult> {
    try {
      const dataAccess = await this.getDataAccess();
      const result = await dataAccess.update<SyncSettings>(
        this.tableName,
        settings,
        { user_id: userId }
      );

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        data: result.data,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error updating sync settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get or create sync settings for a user
   */
  async getOrCreateSyncSettings(userId: string): Promise<SyncSettings> {
    let settings = await this.getSyncSettings(userId);
    
    if (!settings) {
      await this.createSyncSettings(userId);
      settings = await this.getSyncSettings(userId);
    }
    
    return settings as SyncSettings;
  }

  /**
   * Toggle auto sync
   */
  async toggleAutoSync(userId: string, enabled: boolean): Promise<SyncResult> {
    return this.updateSyncSettings(userId, { auto_sync: enabled });
  }

  /**
   * Update sync interval
   */
  async updateSyncInterval(userId: string, interval: number): Promise<SyncResult> {
    return this.updateSyncSettings(userId, { sync_interval: interval });
  }

  /**
   * Update sync method
   */
  async updateSyncMethod(userId: string, method: 'local' | 'supabase' | 'hybrid'): Promise<SyncResult> {
    return this.updateSyncSettings(userId, { sync_method: method });
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    try {
      const settings = await this.getSyncSettings(userId);
      
      if (!settings) {
        return {
          is_syncing: false,
          last_sync_time: null,
          sync_method: 'hybrid',
          error: 'Sync settings not found'
        };
      }

      return {
        is_syncing: false, // This would be determined by actual sync process
        last_sync_time: settings.last_sync_time || null,
        sync_method: settings.sync_method
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        is_syncing: false,
        last_sync_time: null,
        sync_method: 'hybrid',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update last sync time
   */
  async updateLastSyncTime(userId: string): Promise<SyncResult> {
    return this.updateSyncSettings(userId, { 
      last_sync_time: Date.now() 
    });
  }

  /**
   * Check if device is iOS 14 or below
   */
  isIOS14orBelow(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(userAgent);
    
    if (!iOS) return false;
    
    // Extract iOS version
    const match = /OS (\d+)_(\d+)/.exec(userAgent);
    if (!match) return false;
    
    const majorVersion = parseInt(match[1], 10);
    return majorVersion <= 14;
  }

  /**
   * Get optimal sync method for current device
   */
  getOptimalSyncMethod(): 'local' | 'supabase' | 'hybrid' {
    return this.isIOS14orBelow() ? 'supabase' : 'hybrid';
  }

  /**
   * Format last sync time for display
   */
  formatLastSync(timestamp: number | null): string {
    if (!timestamp) return '从未同步';
    
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get data source info based on sync method
   */
  getDataSourceInfo(syncMethod: 'local' | 'supabase' | 'hybrid') {
    if (syncMethod === 'supabase') {
      return {
        icon: 'Wifi',
        title: '远程数据源',
        description: '使用Supabase远程数据库',
        subtitle: '数据存储在云端，本地缓存提升性能',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20'
      };
    }
    
    return {
      icon: 'Database',
      title: '本地优先',
      description: '使用PGlite本地数据库，数据始终可用',
      subtitle: '数据存储在本地设备，无需网络即可使用',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    };
  }
}

// Singleton instance
let syncSettingsServiceInstance: SyncSettingsService | null = null;

export function getSyncSettingsService(): SyncSettingsService {
  if (!syncSettingsServiceInstance) {
    syncSettingsServiceInstance = new SyncSettingsService();
  }
  return syncSettingsServiceInstance;
}

export { SyncSettingsService };