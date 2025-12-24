/**
 * iOS14兼容的UUID生成工具
 * crypto.randomUUID在iOS14中不存在，使用fallback实现
 */

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 跨平台UUID生成函数
 * 优先使用原生crypto.randomUUID，iOS14降级到自实现
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return generateUUID();
}