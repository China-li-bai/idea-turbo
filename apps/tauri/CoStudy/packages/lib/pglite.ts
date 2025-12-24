/**
 * Generic PGlite initialization utilities
 *
 * Goals:
 * - Provide pure functions to create and initialize a PGlite instance
 * - Make schema initialization reusable for other apps (non-React as well)
 * - Keep idempotent behavior by relying on schema.sql with IF NOT EXISTS
 * 
 * Linus 变更：支持 iOS 14 降级到内存模式或抛出错误
 */

import { PGlite } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { initializeSchema } from "./schema";

// 检测是否为 iOS 14 或更低版本
function isIOS14OrLower(): boolean {
  try {
    // 支持通过URL参数强制iOS14模式进行测试
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force_ios14') === 'true') {
      return true;
    }
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return false;

    const match = navigator.userAgent.match(/OS (\d+)_/);
    if (!match) return false;

    const version = parseInt(match[1], 10);
    return version <= 14;
  } catch (error) {
    return false;
  }
}

/**
 * Try to read default PGlite URL from env; fallback to IndexedDB storage.
 * Works in Vite/browser; safely falls back in non-Vite environments.
 */
export function getDefaultPGliteUrl(): string {
  let envUrl: string | undefined = undefined;
  try {
    // Vite-style environment variables
    envUrl = (import.meta as any)?.env?.VITE_PGLITE_FS_URL;
  } catch (_) {
    // ignore in non-Vite environments
    envUrl = undefined;
  }
  return envUrl || "idb://make-gold-pg";
}

/**
 * Create a PGlite instance and wait until ready.
 * 
 * iOS 14 兼容性：直接抛出错误，强制使用云端模式
 */
export async function createPGlite(url?: string): Promise<PGlite> {
  // iOS 14 用户不能使用 PGlite
  if (isIOS14OrLower()) {
    throw new Error('PGlite not supported on iOS 14 or lower. Please use cloud mode.');
  }

  const targetUrl = url || getDefaultPGliteUrl();
  // 使用官方建議：對象參數 + live 擴展 + 指定持久化 dataDir
  const pg = await PGlite.create({
    dataDir: targetUrl,
    extensions: { live },
  });
  await pg.waitReady;
  return pg;
}

/**
 * Initialize schema with provided SQL or fall back to the library's schema.sql.
 */
export async function initializeSchemaWithSql(db: PGlite, sql?: string): Promise<void> {
  if (sql && sql.trim().length > 0) {
    await db.exec(sql);
    return;
  }
  await initializeSchema(db);
}

/**
 * Convenience: create and initialize PGlite in one step.
 */
export async function createInitializedPGlite(options?: { url?: string; sql?: string }): Promise<PGlite> {
  const pg = await createPGlite(options?.url);
  await initializeSchemaWithSql(pg, options?.sql);
  return pg;
}

/**
 * iOS14友好的统一数据库工厂函数
 * 这是所有服务应该使用的唯一入口点，确保iOS14兼容性
 * 
 * @param options 数据库配置选项
 * @returns Promise<PGlite> 或抛出iOS14错误
 */
export async function createSafePGliteInstance(options?: { url?: string; sql?: string }): Promise<PGlite> {
  // iOS14检测前置 - 统一入口点，避免任何绕过
  if (isIOS14OrLower()) {
    console.log('[PGlite工厂] iOS14设备检测到，拒绝初始化PGlite');
    throw new Error('PGlite not supported on iOS 14 or lower. Please use cloud mode.');
  }
  
  console.log('[PGlite工厂] 非iOS14设备，继续PGlite初始化');
  return createInitializedPGlite(options);
}

/**
 * Attempt to close the database gracefully (if supported).
 */
export async function closePGlite(db: PGlite): Promise<void> {
  try {
    // PGlite may or may not expose close; guard just in case
    // @ts-ignore
    if (typeof db.close === "function") {
      // @ts-ignore
      await db.close();
    }
  } catch (_) {
    // Swallow errors for portability
  }
}

/**
 * Development-safe singleton for PGlite initialization.
 *
 * React StrictMode 在开发环境会导致组件挂载/卸载/再次挂载，从而触发副作用两次。
 * 这在某些运行时下可能导致 WebAssembly Response 被重复读取报错。
 *
 * 通过在模块级缓存初始化 Promise，确保全局只初始化一次。
 * 
 * iOS 14 兼容性：如果 PGlite 初始化失败，抛出错误让上层切换到云端模式
 */
let __pgSingletonPromise: Promise<PGlite> | null = null;

/**
 * 重置PGlite单例状态
 * 用于测试或特殊场景下清除已缓存的数据库实例
 */
export function resetPGliteSingleton(): void {
  __pgSingletonPromise = null;
  console.log('[PGlite] 单例状态已重置');
}

export async function getSingletonInitializedPGlite(options?: { url?: string; sql?: string }): Promise<PGlite> {
  // iOS14检测前置 - 避免创建任何Promise或初始化逻辑
  if (isIOS14OrLower()) {
    throw new Error('PGlite not supported on iOS 14 or lower. Please use cloud mode.');
  }

  if (!__pgSingletonPromise) {
    __pgSingletonPromise = createInitializedPGlite(options);
  }
  
  try {
    return await __pgSingletonPromise;
  } catch (error) {
    // 重置 Promise 以允许重试
    __pgSingletonPromise = null;
    throw error;
  }
}