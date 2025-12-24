/**
 * PhilosophyPage Service
 * 
 * 遵循 Linus 编程哲学：
 * - 好品味：消除特殊情况，使正常情况处理变得简单
 * - 不破坏用户空间：确保向后兼容性
 * - 实用主义：解决实际问题，而不是理论问题
 * - 简洁性：函数应该简短，只做一件事
 */

import { UnifiedDataAccess } from './UnifiedDataAccess';
import type { SupabaseClient } from '@supabase/supabase-js';

// 类型定义
export interface PhilosophySettings {
  id: string;
  user_id: string;
  preferred_mode: 'campfire' | 'starry';
  auto_join_room: boolean;
  show_debug_info: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhilosophySession {
  id: string;
  user_id: string;
  mode: 'campfire' | 'starry';
  room_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  peer_count?: number;
  pulses_sent?: number;
  pulses_received?: number;
}

export interface PhilosophyPulse {
  id: string;
  session_id: string;
  sender_id: string;
  receiver_id?: string;
  intensity: 'low' | 'medium' | 'high' | 'good';
  created_at: string;
}

export interface PhilosophyStats {
  total_sessions: number;
  total_minutes: number;
  favorite_mode: 'campfire' | 'starry' | null;
  average_session_length: number;
  total_pulses_sent: number;
  total_pulses_received: number;
  most_active_day: string | null;
}

// 默认设置
const DEFAULT_PHILOSOPHY_SETTINGS: Partial<PhilosophySettings> = {
  preferred_mode: 'campfire',
  auto_join_room: true,
  show_debug_info: false
};

export class PhilosophyPageService {
  private dataAccess: UnifiedDataAccess;

  constructor(supabase: SupabaseClient) {
    this.dataAccess = new UnifiedDataAccess(supabase);
  }

  // 获取用户哲学设置
  async getPhilosophySettings(userId: string): Promise<PhilosophySettings | null> {
    try {
      return await this.dataAccess.getById<PhilosophySettings>(
        'philosophy_settings',
        userId,
        'user_id'
      );
    } catch (error) {
      console.error('Error getting philosophy settings:', error);
      return null;
    }
  }

  // 创建或更新用户哲学设置
  async upsertPhilosophySettings(userId: string, settings: Partial<PhilosophySettings>): Promise<PhilosophySettings> {
    try {
      const existingSettings = await this.getPhilosophySettings(userId);
      
      if (existingSettings) {
        // 更新现有设置
        const updatedSettings = {
          ...existingSettings,
          ...settings,
          updated_at: new Date().toISOString()
        };
        
        return await this.dataAccess.update<PhilosophySettings>(
          'philosophy_settings',
          updatedSettings.id,
          updatedSettings
        );
      } else {
        // 创建新设置
        const newSettings: PhilosophySettings = {
          id: this.dataAccess.generateId(),
          user_id: userId,
          preferred_mode: settings.preferred_mode || DEFAULT_PHILOSOPHY_SETTINGS.preferred_mode || 'campfire',
          auto_join_room: settings.auto_join_room ?? DEFAULT_PHILOSOPHY_SETTINGS.auto_join_room ?? true,
          show_debug_info: settings.show_debug_info ?? DEFAULT_PHILOSOPHY_SETTINGS.show_debug_info ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return await this.dataAccess.create<PhilosophySettings>(
          'philosophy_settings',
          newSettings
        );
      }
    } catch (error) {
      console.error('Error upserting philosophy settings:', error);
      throw error;
    }
  }

  // 开始哲学会话
  async startPhilosophySession(userId: string, mode: 'campfire' | 'starry', roomId: string): Promise<PhilosophySession> {
    try {
      const session: PhilosophySession = {
        id: this.dataAccess.generateId(),
        user_id: userId,
        mode,
        room_id: roomId,
        started_at: new Date().toISOString()
      };
      
      return await this.dataAccess.create<PhilosophySession>(
        'philosophy_sessions',
        session
      );
    } catch (error) {
      console.error('Error starting philosophy session:', error);
      throw error;
    }
  }

  // 结束哲学会话
  async endPhilosophySession(sessionId: string, peerCount: number): Promise<PhilosophySession> {
    try {
      const session = await this.dataAccess.getById<PhilosophySession>(
        'philosophy_sessions',
        sessionId
      );
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      const endTime = new Date();
      const startTime = new Date(session.started_at);
      const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      const updatedSession: PhilosophySession = {
        ...session,
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
        peer_count: peerCount
      };
      
      return await this.dataAccess.update<PhilosophySession>(
        'philosophy_sessions',
        sessionId,
        updatedSession
      );
    } catch (error) {
      console.error('Error ending philosophy session:', error);
      throw error;
    }
  }

  // 记录哲学脉冲
  async recordPhilosophyPulse(sessionId: string, senderId: string, intensity: 'low' | 'medium' | 'high' | 'good', receiverId?: string): Promise<PhilosophyPulse> {
    try {
      const pulse: PhilosophyPulse = {
        id: this.dataAccess.generateId(),
        session_id: sessionId,
        sender_id: senderId,
        receiver_id,
        intensity,
        created_at: new Date().toISOString()
      };
      
      // 更新会话中的脉冲计数
      const session = await this.dataAccess.getById<PhilosophySession>(
        'philosophy_sessions',
        sessionId
      );
      
      if (session) {
        await this.dataAccess.update<PhilosophySession>(
          'philosophy_sessions',
          sessionId,
          {
            pulses_sent: (session.pulses_sent || 0) + 1
          }
        );
      }
      
      return await this.dataAccess.create<PhilosophyPulse>(
        'philosophy_pulses',
        pulse
      );
    } catch (error) {
      console.error('Error recording philosophy pulse:', error);
      throw error;
    }
  }

  // 获取用户哲学统计
  async getPhilosophyStats(userId: string): Promise<PhilosophyStats> {
    try {
      // 获取所有会话
      const sessions = await this.dataAccess.query<PhilosophySession>(
        'philosophy_sessions',
        (query) => query.eq('user_id', userId)
      );
      
      // 获取所有发送的脉冲
      const sentPulses = await this.dataAccess.query<PhilosophyPulse>(
        'philosophy_pulses',
        (query) => query.eq('sender_id', userId)
      );
      
      // 获取所有接收的脉冲
      const receivedPulses = await this.dataAccess.query<PhilosophyPulse>(
        'philosophy_pulses',
        (query) => query.eq('receiver_id', userId)
      );
      
      // 计算统计数据
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
      const averageSessionLength = totalSessions > 0 ? totalMinutes / totalSessions : 0;
      
      // 计算最喜欢的模式
      const campfireCount = sessions.filter(s => s.mode === 'campfire').length;
      const starryCount = sessions.filter(s => s.mode === 'starry').length;
      const favoriteMode = campfireCount > starryCount ? 'campfire' : starryCount > campfireCount ? 'starry' : null;
      
      // 找出最活跃的一天
      const dayCounts: Record<string, number> = {};
      sessions.forEach(session => {
        const day = session.started_at.split('T')[0];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      
      const mostActiveDay = Object.keys(dayCounts).reduce((a, b) => 
        dayCounts[a] > dayCounts[b] ? a : b, '');
      
      return {
        total_sessions: totalSessions,
        total_minutes: totalMinutes,
        favorite_mode: favoriteMode,
        average_session_length: averageSessionLength,
        total_pulses_sent: sentPulses.length,
        total_pulses_received: receivedPulses.length,
        most_active_day: mostActiveDay || null
      };
    } catch (error) {
      console.error('Error getting philosophy stats:', error);
      throw error;
    }
  }

  // 获取最近的会话
  async getRecentSessions(userId: string, limit: number = 10): Promise<PhilosophySession[]> {
    try {
      return await this.dataAccess.query<PhilosophySession>(
        'philosophy_sessions',
        (query) => 
          query
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(limit)
      );
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      return [];
    }
  }

  // 获取活跃房间列表
  async getActiveRooms(): Promise<Array<{ room_id: string; user_count: number }>> {
    try {
      // 这里需要实现获取活跃房间的逻辑
      // 由于 Supabase 可能没有实时房间统计，我们可以从最近的会话中推断
      const recentSessions = await this.dataAccess.query<PhilosophySession>(
        'philosophy_sessions',
        (query) => 
          query
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(100)
      );
      
      // 统计每个房间的活跃用户数
      const roomCounts: Record<string, Set<string>> = {};
      
      recentSessions.forEach(session => {
        if (!roomCounts[session.room_id]) {
          roomCounts[session.room_id] = new Set();
        }
        roomCounts[session.room_id].add(session.user_id);
      });
      
      return Object.entries(roomCounts).map(([room_id, users]) => ({
        room_id,
        user_count: users.size
      }));
    } catch (error) {
      console.error('Error getting active rooms:', error);
      return [];
    }
  }
}

// 单例模式获取服务实例
let philosophyPageServiceInstance: PhilosophyPageService | null = null;

export function getPhilosophyPageService(): PhilosophyPageService {
  if (!philosophyPageServiceInstance) {
    throw new Error('PhilosophyPageService not initialized. Call initializePhilosophyPageService first.');
  }
  
  return philosophyPageServiceInstance;
}

export function initializePhilosophyPageService(supabase: SupabaseClient): PhilosophyPageService {
  philosophyPageServiceInstance = new PhilosophyPageService(supabase);
  return philosophyPageServiceInstance;
}