const DEVICE_ID_KEY = 'ai-calendar-device-id';

export async function getDeviceFingerprint(): Promise<string> {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    const components: string[] = [];
    
    if (typeof navigator !== 'undefined') {
      components.push(navigator.userAgent);
      components.push(navigator.language);
      components.push(String(navigator.hardwareConcurrency || 0));
      components.push(String((navigator as any).deviceMemory || 0));
    }
    
    if (typeof screen !== 'undefined') {
      components.push(`${screen.width}x${screen.height}`);
      components.push(String(screen.colorDepth));
    }
    
    if (typeof Intl !== 'undefined') {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      components.push(timeZone);
    }
    
    const rawFingerprint = components.join('|');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(rawFingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

export async function generateSecureKey(salt?: string): Promise<string> {
  const deviceId = await getDeviceFingerprint();
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
