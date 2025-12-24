/**
 * PlatformDetectionService - 平台检测服务
 * 
 * Linus 编码哲学实现：
 * 1. "Good Taste" - 没有特殊情况，iOS 14 用户就是云端用户
 * 2. 单一职责 - 只检测平台兼容性，不依赖用户状态
 * 3. 实用主义 - 解决真实问题，不解决理论问题
 */

/**
 * 检测是否为 iOS 14 或更低版本
 * 
 * 这些用户无法使用 PGlite，需要纯云端模式
 */
export function isIOS14OrLower(): boolean {
  try {
    // 支持通过URL参数强制iOS14模式进行测试
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force_ios14') === 'true') {
      console.log('[PlatformDetection] 通过URL参数强制iOS14模式');
      return true;
    }
    
    // 检测 iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return false;

    // 提取 iOS 版本
    const match = navigator.userAgent.match(/OS (\d+)_/);
    if (!match) return false;

    const version = parseInt(match[1], 10);
    return version <= 14;
  } catch (error) {
    console.warn('Platform detection failed:', error);
    return false;
  }
}

/**
 * 检测是否应该使用纯云端模式（基于平台，不依赖用户状态）
 * 
 * 简化策略：只检测iOS14设备，用户状态检查由调用方负责
 */
export function shouldUseCloudOnlyModeForPlatform(): boolean {
  // iOS14设备强制云端模式（避免PGlite兼容性问题）
  if (isIOS14OrLower()) {
    console.log('[PlatformDetection] iOS14设备，强制云端模式（避免PGlite兼容性问题）');
    return true;
  }
  
  return false;
}

/**
 * 检测是否应该使用纯云端模式（完整逻辑，包含用户状态）
 * 
 * 注意：这个函数接受用户权限状态作为参数，避免循环依赖
 * 
 * @param hasSupabaseAccess 用户是否有Supabase访问权限
 */
export function shouldUseCloudOnlyMode(hasSupabaseAccess?: boolean): boolean {
  // iOS14设备强制云端模式（无论订阅状态）
  if (isIOS14OrLower()) {
    console.log('[PlatformDetection] iOS14设备，强制云端模式（避免PGlite兼容性问题）');
    return true;
  }
  
  // 非iOS14设备：检查高级订阅状态
  if (hasSupabaseAccess) {
    console.log('[PlatformDetection] 高级订阅用户，使用云端模式');
    return true;
  }
  
  return false;
}

/**
 * 检测 PGlite 是否可用
 */
export async function isPGliteAvailable(): Promise<boolean> {
  if (isIOS14OrLower()) {
    return false;
  }

  try {
    // 尝试动态导入 PGlite
    const { PGlite } = await import('@electric-sql/pglite');
    
    // 尝试创建内存实例
    const testDb = new PGlite();
    await testDb.query('SELECT 1');
    await testDb.close();
    
    return true;
  } catch (error) {
    console.warn('PGlite not available:', error);
    return false;
  }
}