import { describe, it, expect } from 'vitest';
import {
  hashPassword, verifyPassword,
  signJwt, verifyJwt,
  generateTrackingCode, hashTrackingCode, verifyTrackingCode,
  generateRefreshToken, hashRefreshToken,
  encryptForR2, decryptFromR2,
} from '../src/lib/crypto';

const PEPPER = 'test-pepper';
const JWT_SECRET = 'test-jwt-secret-32-bytes-of-randomness';

describe('passwords', () => {
  it('verifies correct password', () => {
    const h = hashPassword('CorrectHorseBattery!1', PEPPER);
    expect(verifyPassword('CorrectHorseBattery!1', h, PEPPER)).toBe(true);
  });
  it('rejects wrong password', () => {
    const h = hashPassword('CorrectHorseBattery!1', PEPPER);
    expect(verifyPassword('wrong', h, PEPPER)).toBe(false);
  });
  it('rejects pepper substitution', () => {
    const h = hashPassword('Pwd123!Pwd123!', PEPPER);
    expect(verifyPassword('Pwd123!Pwd123!', h, 'different-pepper')).toBe(false);
  });
});

describe('JWT', () => {
  it('round-trips', async () => {
    const t = await signJwt({ sub: 'u1', email: 'a@b.c', role: 'staff' }, JWT_SECRET, 60);
    const p = await verifyJwt(t, JWT_SECRET);
    expect(p?.sub).toBe('u1');
  });
  it('rejects tampered token', async () => {
    const t = await signJwt({ sub: 'u1', email: 'a@b.c', role: 'staff' }, JWT_SECRET, 60);
    const parts = t.split('.');
    const tampered = parts[0] + '.' + parts[1] + 'X.' + parts[2];
    expect(await verifyJwt(tampered, JWT_SECRET)).toBe(null);
  });
  it('rejects expired token', async () => {
    const t = await signJwt({ sub: 'u1', email: 'a@b.c', role: 'staff' }, JWT_SECRET, -1);
    expect(await verifyJwt(t, JWT_SECRET)).toBe(null);
  });
});

describe('tracking codes', () => {
  it('verifies a real code and rejects others', () => {
    const code = generateTrackingCode();
    const hash = hashTrackingCode(code, PEPPER);
    expect(verifyTrackingCode(code, hash, PEPPER)).toBe(true);
    expect(verifyTrackingCode('AAAA-BBBB-CCCC', hash, PEPPER)).toBe(false);
  });
  it('is case-insensitive and ignores dashes', () => {
    const code = generateTrackingCode();
    const hash = hashTrackingCode(code, PEPPER);
    expect(verifyTrackingCode(code.toLowerCase().replace(/-/g, ''), hash, PEPPER)).toBe(true);
  });
});

describe('refresh tokens', () => {
  it('produces stable hash for same input', () => {
    const t = generateRefreshToken();
    expect(hashRefreshToken(t, PEPPER)).toBe(hashRefreshToken(t, PEPPER));
  });
  it('differs across tokens', () => {
    expect(hashRefreshToken(generateRefreshToken(), PEPPER))
      .not.toBe(hashRefreshToken(generateRefreshToken(), PEPPER));
  });
});

describe('document envelope encryption', () => {
  const MASTER = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  it('round-trips', async () => {
    const pt = new TextEncoder().encode('Top secret SOP');
    const { ciphertext, iv, wrappedKey } = await encryptForR2(pt, MASTER);
    const back = await decryptFromR2(ciphertext, iv, wrappedKey, MASTER);
    expect(new TextDecoder().decode(back)).toBe('Top secret SOP');
  });
});
