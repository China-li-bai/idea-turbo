/**
 * SyncService - 手动同步服务
 * 
 * Linus 编码哲学实现：
 * 1. "Never Break Userspace" - 仅用户触发时才进行网络请求
 * 2. "Good Taste" - 无特殊情况，简单的同步策略
 * 3. 单一职责 - 专注本地数据与 Supabase 的同步
 * 4. 透明度 - 明确的同步状态和进度反馈
 */

import { getSupabaseClient } from "@make-gold/lib/supabase-ios14.tsx";
import { getSingletonInitializedPGlite } from "@make-gold/lib/pglite";
import { getAuthService } from "./AuthService";
import { isIOS14OrLower } from "./PlatformDetectionService";

/**
 * 同步状态
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * 同步结果
 */
export interface SyncResult {
  status: SyncStatus;
  message: string;
  uploadCount?: number;
  downloadCount?: number;
  error?: Error;
}

/**
 * 同步服务类
 * 
 * 负责本地数据与 Supabase 的双向同步
 * 仅在用户明确触发时执行，不影响正常的页面数据访问
 */
export class SyncService {
  private supabaseClient = getSupabaseClient();
  private currentStatus: SyncStatus = 'idle';
  private listeners: ((status: SyncStatus) => void)[] = [];

  /**
   * 获取当前同步状态
   */
  getStatus(): SyncStatus {
    return this.currentStatus;
  }

  /**
   * 监听同步状态变化
   */
  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 设置同步状态
   */
  private setStatus(status: SyncStatus): void {
    this.currentStatus = status;
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * 上传本地数据到 Supabase
   * 
   * 只有登录用户才能上传
   * iOS14设备跳过上传（无本地数据库）
   */
  async uploadToSupabase(): Promise<SyncResult> {
    try {
      this.setStatus('syncing');

      // iOS14设备检查 - 无本地数据库，跳过上传
      if (isIOS14OrLower()) {
        return {
          status: 'success',
          message: 'iOS14设备已跳过上传（使用云端数据库）',
          uploadCount: 0
        };
      }

      // 检查用户登录状态
      const authService = getAuthService();
      const user = await authService.getCurrentUser();
      if (!user) {
        return {
          status: 'error',
          message: '需要登录才能同步到云端',
          error: new Error('User not authenticated')
        };
      }

      const db = await getSingletonInitializedPGlite();
      let uploadCount = 0;

      // 1. 同步牌组数据
      const decksResult = await db.query(`
        SELECT * FROM decks 
        WHERE user_id = $1 OR user_id IS NULL
        ORDER BY updated_at DESC
      `, [user.id]);

      for (const deck of decksResult.rows) {
        const { error } = await this.supabaseClient
          .from('decks')
          .upsert({
            ...deck,
            user_id: user.id
          });

        if (error) {
          console.error('Failed to upload deck:', error);
          continue;
        }
        uploadCount++;
      }

      // 2. 同步卡片数据
      const cardsResult = await db.query(`
        SELECT c.* FROM cards c
        JOIN decks d ON c.deck_id = d.id
        WHERE d.user_id = $1 OR d.user_id IS NULL
        ORDER BY c.updated_at DESC
      `, [user.id]);

      for (const card of cardsResult.rows) {
        const { error } = await this.supabaseClient
          .from('cards')
          .upsert(card);

        if (error) {
          console.error('Failed to upload card:', error);
          continue;
        }
        uploadCount++;
      }

      this.setStatus('success');
      return {
        status: 'success',
        message: `成功上传 ${uploadCount} 条数据到云端`,
        uploadCount
      };

    } catch (error) {
      this.setStatus('error');
      return {
        status: 'error',
        message: '上传失败: ' + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 从 Supabase 下载数据到本地
   * 
   * 只有登录用户才能下载
   * iOS14设备跳过下载（无本地数据库）
   */
  async downloadFromSupabase(): Promise<SyncResult> {
    try {
      this.setStatus('syncing');

      // iOS14设备检查 - 无本地数据库，跳过下载
      if (isIOS14OrLower()) {
        return {
          status: 'success',
          message: 'iOS14设备已跳过下载（使用云端数据库）',
          downloadCount: 0
        };
      }

      // 检查用户登录状态
      const authService = getAuthService();
      const user = await authService.getCurrentUser();
      if (!user) {
        return {
          status: 'error',
          message: '需要登录才能从云端同步',
          error: new Error('User not authenticated')
        };
      }

      const db = await getSingletonInitializedPGlite();
      let downloadCount = 0;

      // 1. 下载牌组数据
      const { data: remoteDecks, error: decksError } = await this.supabaseClient
        .from('decks')
        .select('*')
        .eq('user_id', user.id);

      if (decksError) throw decksError;

      for (const deck of remoteDecks || []) {
        await db.query(`
          INSERT INTO decks (id, name, description, deck_type, user_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            deck_type = EXCLUDED.deck_type,
            updated_at = EXCLUDED.updated_at
          WHERE decks.updated_at < EXCLUDED.updated_at
        `, [
          deck.id,
          deck.name,
          deck.description,
          deck.deck_type,
          deck.user_id,
          deck.created_at,
          deck.updated_at
        ]);
        downloadCount++;
      }

      // 2. 下载卡片数据
      const { data: remoteCards, error: cardsError } = await this.supabaseClient
        .from('cards')
        .select(`
          *,
          deck:deck_id!inner(user_id)
        `)
        .eq('deck.user_id', user.id);

      if (cardsError) throw cardsError;

      for (const card of remoteCards || []) {
        await db.query(`
          INSERT INTO cards (
            id, deck_id, front, back, due, stability, difficulty,
            elapsed_days, scheduled_days, reps, lapses, learning_steps,
            state, last_review, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO UPDATE SET
            front = EXCLUDED.front,
            back = EXCLUDED.back,
            due = EXCLUDED.due,
            stability = EXCLUDED.stability,
            difficulty = EXCLUDED.difficulty,
            elapsed_days = EXCLUDED.elapsed_days,
            scheduled_days = EXCLUDED.scheduled_days,
            reps = EXCLUDED.reps,
            lapses = EXCLUDED.lapses,
            learning_steps = EXCLUDED.learning_steps,
            state = EXCLUDED.state,
            last_review = EXCLUDED.last_review,
            updated_at = EXCLUDED.updated_at
          WHERE cards.updated_at < EXCLUDED.updated_at
        `, [
          card.id,
          card.deck_id,
          card.front,
          card.back,
          card.due,
          card.stability,
          card.difficulty,
          card.elapsed_days,
          card.scheduled_days,
          card.reps,
          card.lapses,
          card.learning_steps,
          card.state,
          card.last_review,
          card.created_at,
          card.updated_at
        ]);
        downloadCount++;
      }

      this.setStatus('success');
      return {
        status: 'success',
        message: `成功从云端下载 ${downloadCount} 条数据`,
        downloadCount
      };

    } catch (error) {
      this.setStatus('error');
      return {
        status: 'error',
        message: '下载失败: ' + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * 完整的双向同步
   * 
   * 先上传本地数据，再下载远程数据
   */
  async fullSync(): Promise<SyncResult> {
    try {
      this.setStatus('syncing');

      const uploadResult = await this.uploadToSupabase();
      if (uploadResult.status === 'error') {
        return uploadResult;
      }

      const downloadResult = await this.downloadFromSupabase();
      if (downloadResult.status === 'error') {
        return downloadResult;
      }

      this.setStatus('success');
      return {
        status: 'success',
        message: `同步完成: 上传 ${uploadResult.uploadCount || 0} 条，下载 ${downloadResult.downloadCount || 0} 条`,
        uploadCount: uploadResult.uploadCount,
        downloadCount: downloadResult.downloadCount
      };

    } catch (error) {
      this.setStatus('error');
      return {
        status: 'error',
        message: '同步失败: ' + (error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}

// 单例模式
let defaultSyncService: SyncService | null = null;

/**
 * 获取默认的同步服务实例
 */
export function getSyncService(): SyncService {
  if (!defaultSyncService) {
    defaultSyncService = new SyncService();
  }
  return defaultSyncService;
}

/**
 * 创建新的同步服务实例
 */
export function createSyncService(): SyncService {
  return new SyncService();
}