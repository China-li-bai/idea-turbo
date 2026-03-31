const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: CryptoKey | null = null;
  private masterPassword: string | null = null;

  private constructor() {}

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  async initialize(password: string): Promise<void> {
    this.masterPassword = password;
    this.encryptionKey = await this.deriveKey(password);
  }

  private async deriveKey(password: string, salt?: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: KEY_DERIVATION_ALGORITHM },
      false,
      ['deriveBits', 'deriveKey']
    );

    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    
    return crypto.subtle.deriveKey(
      {
        name: KEY_DERIVATION_ALGORITHM,
        salt: actualSalt.buffer as ArrayBuffer,
        iterations: ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(plaintext: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('SecureStorage not initialized. Call initialize() first.');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const key = await this.deriveKey(this.masterPassword!, salt);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv.buffer as ArrayBuffer
      },
      key,
      data
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return this.arrayBufferToBase64(combined.buffer);
  }

  async decrypt(ciphertext: string): Promise<string> {
    if (!this.masterPassword) {
      throw new Error('SecureStorage not initialized. Call initialize() first.');
    }

    const combined = this.base64ToArrayBuffer(ciphertext);
    const combinedArray = new Uint8Array(combined);
    
    const salt = combinedArray.slice(0, SALT_LENGTH);
    const iv = combinedArray.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combinedArray.slice(SALT_LENGTH + IV_LENGTH);
    
    const key = await this.deriveKey(this.masterPassword, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv.buffer as ArrayBuffer
      },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  async saveSecurely(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(value);
    localStorage.setItem(`secure_${key}`, encrypted);
  }

  async loadSecurely(key: string): Promise<string | null> {
    const encrypted = localStorage.getItem(`secure_${key}`);
    if (!encrypted) return null;
    
    try {
      return await this.decrypt(encrypted);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return null;
    }
  }

  async removeSecurely(key: string): Promise<void> {
    localStorage.removeItem(`secure_${key}`);
  }

  clearMasterPassword(): void {
    this.masterPassword = null;
    this.encryptionKey = null;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const secureStorage = SecureStorage.getInstance();
