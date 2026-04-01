import { db } from './index';
import { dataEncryption, type EncryptedData } from '@/lib/utils/encryption';

export interface SecureMemoryStorageOptions {
  encryptionPassword?: string;
}

export class SecureMemoryStorage {
  private store: LocalForage;
  private password: string;
  private cache: Map<string, any> = new Map();

  constructor(storeName: 'settings' | 'oramasearch' | 'memory' | 'memoryIndex', options: SecureMemoryStorageOptions = {}) {
    this.store = db[storeName];
    this.password = options.encryptionPassword || 'default-password';
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const encrypted = await dataEncryption.encryptObject(value, this.password);
    await this.store.setItem(key, encrypted);
    this.cache.set(key, value);
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const encrypted = await this.store.getItem<EncryptedData>(key);
    
    if (!encrypted) {
      return null;
    }

    const value = await dataEncryption.decryptObject<T>(encrypted, this.password);
    this.cache.set(key, value);
    
    return value;
  }

  async removeItem(key: string): Promise<void> {
    await this.store.removeItem(key);
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    await this.store.clear();
    this.cache.clear();
  }

  async keys(): Promise<string[]> {
    return await this.store.keys();
  }

  async length(): Promise<number> {
    return await this.store.length();
  }

  setPassword(password: string): void {
    this.password = password;
    this.cache.clear();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const secureMemoryStorage = new SecureMemoryStorage('memory', {
  encryptionPassword: process.env.ENCRYPTION_PASSWORD,
});
