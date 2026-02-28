/**
 * 设备 ID 生成和管理工具
 * 用于速率限制和用户识别
 */

class DeviceIdManager {
  private static readonly STORAGE_KEY = 'device_id';
  private static readonly COOKIE_NAME = 'device_id';
  private static readonly COOKIE_DAYS = 365;

  /**
   * 获取或生成设备 ID
   */
  static getDeviceId(): string {
    let deviceId = this.getDeviceIdFromCookie();
    if (deviceId) return deviceId;

    deviceId = this.getDeviceIdFromLocalStorage();
    if (deviceId) return deviceId;

    deviceId = this.generateDeviceId();
    this.saveDeviceId(deviceId);
    return deviceId;
  }

  /**
   * 从 Cookie 获取设备 ID
   */
  private static getDeviceIdFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.COOKIE_NAME) {
        return value;
      }
    }
    return null;
  }

  /**
   * 从 LocalStorage 获取设备 ID
   */
  private static getDeviceIdFromLocalStorage(): string | null {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * 生成新的设备 ID
   */
  private static generateDeviceId(): string {
    return `dev_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 保存设备 ID 到 Cookie 和 LocalStorage
   */
  private static saveDeviceId(deviceId: string): void {
    this.saveDeviceIdToCookie(deviceId);
    this.saveDeviceIdToLocalStorage(deviceId);
  }

  /**
   * 保存设备 ID 到 Cookie
   */
  private static saveDeviceIdToCookie(deviceId: string): void {
    const expires = new Date();
    expires.setDate(expires.getDate() + this.COOKIE_DAYS);
    
    document.cookie = `${this.COOKIE_NAME}=${deviceId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }

  /**
   * 保存设备 ID 到 LocalStorage
   */
  private static saveDeviceIdToLocalStorage(deviceId: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, deviceId);
    } catch {
      console.warn('Failed to save device ID to localStorage');
    }
  }

  /**
   * 获取包含设备 ID 的请求头
   */
  static getHeadersWithDeviceId(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const deviceId = this.getDeviceId();
    return {
      'X-Device-ID': deviceId,
      ...additionalHeaders
    };
  }

  /**
   * 重置设备 ID（仅在需要时使用）
   */
  static resetDeviceId(): string {
    const newDeviceId = this.generateDeviceId();
    this.saveDeviceId(newDeviceId);
    return newDeviceId;
  }
}

export default DeviceIdManager;