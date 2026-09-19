/**
 * Mountain Cryptographic Engine - Two-Factor Authentication (RFC 6238 TOTP)
 *
 * Implements standard Time-based One-Time Password generation using WebCrypto HMAC-SHA-1.
 * Compatible with Google Authenticator, 1Password, Authy, and Bitwarden.
 * Zero external dependencies.
 */

/**
 * Decodes an RFC 4648 Base32 string (case-insensitive, ignoring spaces and padding).
 */
export function decodeBase32(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  const output = new Uint8Array(((clean.length * 5) / 8) | 0);
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Calculates a 6-digit TOTP code and the seconds remaining in the current 30s window.
 *
 * @param secret - Base32 encoded TOTP shared secret key
 * @param epochSeconds - Optional timestamp in seconds (defaults to Date.now() / 1000)
 */
export async function generateTOTP(
  secret: string,
  epochSeconds: number = Math.floor(Date.now() / 1000)
): Promise<{ code: string; secondsRemaining: number }> {
  const keyBytes = decodeBase32(secret);
  if (keyBytes.length === 0) {
    throw new Error('Invalid Base32 TOTP secret');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const timeStep = Math.floor(epochSeconds / 30);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setBigUint64(0, BigInt(timeStep));

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
  const hmac = new Uint8Array(signature);

  const offset = hmac[19] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const codeNumber = binary % 1000000;
  const code = codeNumber.toString().padStart(6, '0');
  const secondsRemaining = 30 - (epochSeconds % 30);

  return { code, secondsRemaining };
}
