export interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
  version: number;
}

export interface EncryptionOptions {
  algorithm?: string;
  keyLength?: number;
  iterations?: number;
  salt?: string;
}

export class DataEncryption {
  private static readonly DEFAULT_ALGORITHM = 'AES-GCM';
  private static readonly DEFAULT_KEY_LENGTH = 256;
  private static readonly DEFAULT_ITERATIONS = 100000;
  private static readonly VERSION = 1;

  static async generateKey(password: string, salt?: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const saltBytes = salt ? encoder.encode(salt) : crypto.getRandomValues(new Uint8Array(16));
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: this.DEFAULT_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.DEFAULT_ALGORITHM, length: this.DEFAULT_KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
    
    return key;
  }

  static async encrypt(
    data: string,
    password: string,
    options: EncryptionOptions = {}
  ): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    
    const salt = options.salt || this.generateSalt();
    const key = await this.generateKey(password, salt);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: options.algorithm || this.DEFAULT_ALGORITHM,
        iv,
      },
      key,
      dataBytes
    );
    
    return {
      ciphertext: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer),
      salt,
      version: this.VERSION,
    };
  }

  static async decrypt(
    encryptedData: EncryptedData,
    password: string
  ): Promise<string> {
    const key = await this.generateKey(password, encryptedData.salt);
    
    const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.DEFAULT_ALGORITHM,
        iv,
      },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  static async encryptObject<T>(
    obj: T,
    password: string,
    options?: EncryptionOptions
  ): Promise<EncryptedData> {
    const json = JSON.stringify(obj);
    return await this.encrypt(json, password, options);
  }

  static async decryptObject<T>(
    encryptedData: EncryptedData,
    password: string
  ): Promise<T> {
    const json = await this.decrypt(encryptedData, password);
    return JSON.parse(json);
  }

  static generateSalt(): string {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    return this.arrayBufferToBase64(saltBytes.buffer);
  }

  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToBase64(hashBuffer);
  }

  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return bytes.buffer;
  }
}

export const dataEncryption = DataEncryption;
