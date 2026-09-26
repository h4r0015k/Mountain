/**
 * Common Helpers for Import Parsers
 */

/**
 * Extracts raw Base32 TOTP secret from either:
 * - A raw secret string ("JBSWY3DPEHPK3PXP")
 * - An otpauth://totp/ URI ("otpauth://totp/Google:user@gmail.com?secret=JBSWY3DPEHPK3PXP&issuer=Google")
 */
export function extractTotpSecret(input?: string): string | undefined {
  if (!input || !input.trim()) return undefined;
  const clean = input.trim();

  if (clean.toLowerCase().startsWith('otpauth://')) {
    try {
      // Extract secret param via regex or URL
      const match = clean.match(/[?&]secret=([A-Za-z2-7]+)/i);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    } catch {
      // Fallback
    }
  }

  // Strip spaces/hyphens in raw Base32 strings
  const sanitized = clean.replace(/[\s-]+/g, '').toUpperCase();
  // Valid Base32 alphabet is A-Z and 2-7
  if (/^[A-Z2-7]{8,}$/.test(sanitized)) {
    return sanitized;
  }

  return clean;
}

/**
 * Clean and normalize a website URL.
 */
export function normalizeUrl(url?: string): string | undefined {
  if (!url || !url.trim()) return undefined;
  const clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return `https://${clean}`;
  }
  return clean;
}
