const DEVICE_ID_KEY = 'ai-calendar-device-id';
const DEVICE_ID_CREATED_KEY = 'ai-calendar-device-id-created';
const PRIVACY_CONSENT_KEY = 'ai-calendar-privacy-consent';

export interface DeviceFingerprintOptions {
  includeUserAgent?: boolean;
  respectPrivacy?: boolean;
}

export interface PrivacyConsent {
  granted: boolean;
  timestamp: number;
  version: string;
}

export async function getDeviceFingerprint(options?: DeviceFingerprintOptions): Promise<string> {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    const components: string[] = [];
    const respectPrivacy = options?.respectPrivacy ?? true;
    
    if (!respectPrivacy) {
      if (typeof navigator !== 'undefined') {
        components.push(navigator.userAgent);
      }
    }
    
    if (typeof navigator !== 'undefined') {
      components.push(navigator.language);
      components.push(String(navigator.hardwareConcurrency || 0));
    }
    
    if (typeof screen !== 'undefined') {
      components.push(`${screen.width}x${screen.height}`);
      components.push(String(screen.colorDepth));
    }
    
    if (typeof Intl !== 'undefined') {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      components.push(timeZone);
    }
    
    const timestamp = Date.now().toString();
    components.push(timestamp);
    
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    components.push(randomString);
    
    const rawFingerprint = components.join('|');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(rawFingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    localStorage.setItem(DEVICE_ID_CREATED_KEY, timestamp);
  }
  
  return deviceId;
}

export function hasPrivacyConsent(): boolean {
  const consent = localStorage.getItem(PRIVACY_CONSENT_KEY);
  if (!consent) return false;
  
  try {
    const parsed: PrivacyConsent = JSON.parse(consent);
    return parsed.granted && parsed.version === '1.0';
  } catch {
    return false;
  }
}

export function setPrivacyConsent(granted: boolean): void {
  const consent: PrivacyConsent = {
    granted,
    timestamp: Date.now(),
    version: '1.0',
  };
  localStorage.setItem(PRIVACY_CONSENT_KEY, JSON.stringify(consent));
}

export function resetDeviceFingerprint(): { success: boolean; newId?: string } {
  const oldId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!oldId) {
    return { success: true };
  }
  
  const timestamp = Date.now().toString();
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const randomString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const rawData = `${timestamp}:${randomString}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(rawData);
  
  crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const newId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_ID_KEY, newId);
    localStorage.setItem(DEVICE_ID_CREATED_KEY, timestamp);
  });
  
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_ID_CREATED_KEY);
  
  return { success: true };
}

export function getDeviceIdInfo(): { id: string; createdAt: number | null; consentGranted: boolean } {
  const id = localStorage.getItem(DEVICE_ID_KEY) || '';
  const createdAtStr = localStorage.getItem(DEVICE_ID_CREATED_KEY);
  const createdAt = createdAtStr ? parseInt(createdAtStr, 10) : null;
  const consentGranted = hasPrivacyConsent();
  
  return { id, createdAt, consentGranted };
}

export async function generateSecureKey(salt?: string): Promise<string> {
  const deviceId = await getDeviceFingerprint({ respectPrivacy: true });
  const timestamp = Date.now().toString();
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const randomString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  const combined = `${deviceId}:${salt || 'ai-calendar'}:${timestamp}:${randomString}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
