import { describe, it, expect } from 'vitest';
import { generateTOTP, decodeBase32 } from '../src/crypto/totp.js';

describe('Mountain TOTP Two-Factor Authenticator (RFC 6238)', () => {
  it('decodes Base32 strings correctly', () => {
    const bytes = decodeBase32('JBSWY3DPEBLW64TMMQ');
    const text = new TextDecoder().decode(bytes);
    expect(text).toBe('Hello World');
  });

  it('matches RFC 6238 standard test vector at t=59s', async () => {
    // RFC 6238 reference key: '12345678901234567890' (20 bytes)
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const { code, secondsRemaining } = await generateTOTP(secret, 59);
    expect(code).toBe('287082');
    expect(secondsRemaining).toBe(1);
  });

  it('generates a 6-digit code with correct seconds remaining', async () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const { code, secondsRemaining } = await generateTOTP(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(secondsRemaining).toBeGreaterThanOrEqual(1);
    expect(secondsRemaining).toBeLessThanOrEqual(30);
  });

  it('rejects invalid or empty secrets', async () => {
    await expect(generateTOTP('')).rejects.toThrow();
  });
});
