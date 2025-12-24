/**
 * 智能数据库提供者 (Smart Database Provider)
 * 
 * 遵循 Linus 编程哲学的iOS14友好策略：
 * 1. "Never Break Userspace" - iOS14设备绝不尝试初始化PGlite
 * 2. 无特殊情况 - 统一的数据库选择逻辑
 * 3. 透明度 - 明确的数据库初始化规则
 * 4. 实用主义 - 避免iOS14 PGlite兼容性问题
 */

import { ReactNode, useEffect, useState } from 'react';
import { DatabaseProvider } from "@make-gold/lib/database-provider";
import { createSafePGliteInstance } from "@make-gold/lib/pglite";
import { useAuth } from '../../contexts/AuthContext';
import { shouldUseCloudOnlyModeForPlatform, isIOS14OrLower } from '../../services/PlatformDetectionService';
import { getUserAuthorizationService } from '../../services/UserAuthorizationService';

interface SmartDatabaseProviderProps {
  children: ReactNode;
}

/**
 * 智能数据库提供者
 * 
 * 初始化策略（iOS14友好）：
 * - iOS14设备: 永不初始化本地数据库（避免PGlite兼容性问题）
 * - 非iOS14未登录: 不初始化本地数据库
 * - 非iOS14普通用户: 初始化本地数据库
 * - 高级订阅用户: 使用云端数据库
 */
export function SmartDatabaseProvider({ children }: SmartDatabaseProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [shouldInitLocal, setShouldInitLocal] = useState<boolean | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    async function determineDatabaseStrategy() {
      try {
        if (authLoading) {
          return; // 等待认证加载完成
        }

        // 优先检查iOS14设备 - 绝不初始化PGlite
        const isiOS14 = isIOS14OrLower();
        if (isiOS14) {
          setShouldInitLocal(false);
          setDbLoading(false);
          console.log('[SmartDatabaseProvider] iOS14设备，强制使用云端模式（避免PGlite兼容性问题）');
          return;
        }

        // 非iOS14设备的策略
        if (!user) {
          // 未登录用户：不初始化本地数据库
          setShouldInitLocal(false);
          setDbLoading(false);
          console.log('[SmartDatabaseProvider] 非iOS14未登录用户，跳过本地数据库初始化');
          return;
        }

        // 已登录用户：检查是否应该使用云端模式
        try {
          const authService = getUserAuthorizationService();
          const authState = await authService.getUserAuthorizationState();
          const shouldUseCloud = shouldUseCloudOnlyModeForPlatform() || authState.canAccessSupabase;
          
          if (shouldUseCloud) {
            // 高级订阅用户或iOS14设备：使用云端数据库
            setShouldInitLocal(false);
            setDbLoading(false);
            console.log('[SmartDatabaseProvider] 高级订阅用户，使用云端数据库');
          } else {
            // 普通用户：初始化本地数据库
            setShouldInitLocal(true);
            setDbLoading(false);
            console.log('[SmartDatabaseProvider] 普通用户，将初始化本地数据库');
          }
        } catch (authError) {
          console.warn('[SmartDatabaseProvider] 无法获取用户权限状态:', authError);
          // 无法获取权限状态时，默认使用本地数据库（非iOS14设备）
          setShouldInitLocal(true);
          setDbLoading(false);
          console.log('[SmartDatabaseProvider] 权限检查失败，回退到本地数据库');
        }
      } catch (error) {
        console.error('[SmartDatabaseProvider] 数据库策略判断失败:', error);
        
        // 错误处理：iOS14设备永远不初始化本地数据库
        const isiOS14 = isIOS14OrLower();
        if (isiOS14) {
          setShouldInitLocal(false);
          setDbLoading(false);
          console.log('[SmartDatabaseProvider] iOS14设备错误回退，使用云端模式');
        } else {
          // 非iOS14设备才使用本地数据库作为安全策略
          setShouldInitLocal(true);
          setDbLoading(false);
          console.log('[SmartDatabaseProvider] 非iOS14设备错误回退，使用本地数据库');
        }
      }
    }

    determineDatabaseStrategy();
  }, [user, authLoading]);

  // 认证或数据库策略加载中
  if (authLoading || dbLoading || shouldInitLocal === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 不需要本地数据库：直接渲染子组件（使用Supabase）
  if (!shouldInitLocal) {
    return <>{children}</>;
  }

  // 需要本地数据库：使用DatabaseProvider初始化
  // 安全的函数传递，确保只有在实际需要时才调用PGlite
  const createDbSafely = async () => {
    // 使用统一的安全工厂函数，避免iOS14绕过
    return await createSafePGliteInstance();
  };

  return (
    <DatabaseProvider createDb={createDbSafely}>
      {children}
    </DatabaseProvider>
  );
}

/**
 * 数据库状态提供者
 * 为子组件提供数据库初始化状态信息（iOS14友好）
 */
export function useDatabaseStatus() {
  const { user } = useAuth();
  const [isLocalInitialized, setIsLocalInitialized] = useState(false);
  const [isCloudOnly, setIsCloudOnly] = useState(false);

  useEffect(() => {
    async function checkDatabaseStatus() {
      try {
        // 优先检查iOS14设备
        const isiOS14 = isIOS14OrLower();
        if (isiOS14) {
          setIsLocalInitialized(false);
          setIsCloudOnly(true);
          console.log('[useDatabaseStatus] iOS14设备，强制云端模式');
          return;
        }

        if (!user) {
          setIsLocalInitialized(false);
          setIsCloudOnly(false);
          return;
        }

        const authService = getUserAuthorizationService();
        const authState = await authService.getUserAuthorizationState();
        const shouldUseCloud = shouldUseCloudOnlyModeForPlatform() || authState.canAccessSupabase;
        setIsCloudOnly(shouldUseCloud);
        setIsLocalInitialized(!shouldUseCloud);
      } catch (error) {
        console.error('Failed to check database status:', error);
        
        // 错误处理：iOS14设备默认使用云端
        const isiOS14 = isIOS14OrLower();
        if (isiOS14) {
          setIsLocalInitialized(false);
          setIsCloudOnly(true);
        } else {
          setIsLocalInitialized(true); // 非iOS14设备默认使用本地数据库
          setIsCloudOnly(false);
        }
      }
    }

    checkDatabaseStatus();
  }, [user]);

  return {
    isLocalInitialized,
    isCloudOnly,
    hasUser: !!user,
  };
}