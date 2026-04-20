const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT = new TextEncoder().encode('ai-calendar-encryption-salt-v1');

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    SALT,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptValue(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  if (typeof window === 'undefined' || !crypto.subtle) return plaintext;

  try {
    const key = await deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      encoded
    );

    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch {
    console.warn('[Crypto] Encryption failed, storing as plaintext');
    return plaintext;
  }
}

export async function decryptValue(encrypted: string): Promise<string> {
  if (!encrypted) return '';
  if (typeof window === 'undefined' || !crypto.subtle) return encrypted;

  try {
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const key = await deriveKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    console.warn('[Crypto] Decryption failed, returning as-is');
    return encrypted;
  }
}

export function isEncrypted(value: string): boolean {
  if (!value) return false;
  try {
    const decoded = Uint8Array.from(atob(value), c => c.charCodeAt(0));
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}
