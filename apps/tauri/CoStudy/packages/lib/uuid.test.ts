import { describe, it, expect } from 'vitest';
import { uuid } from './uuid';

describe('UUID', () => {
  it('should generate valid UUID', () => {
    const id = uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique UUIDs', () => {
    const id1 = uuid();
    const id2 = uuid();
    expect(id1).not.toBe(id2);
  });

  it('should work in iOS14 environment', () => {
    // 模拟iOS14环境（没有crypto.randomUUID）
    const originalCrypto = global.crypto;
    delete (global as any).crypto;
    
    const id = uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    
    // 恢复原始环境
    global.crypto = originalCrypto;
  });
});