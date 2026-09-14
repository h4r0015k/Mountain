/**
 * Mountain Cryptographic Engine - Key Derivation Function (KDF)
 *
 * Implements PBKDF2 with HMAC-SHA-256 to derive a 256-bit AES-GCM encryption key
 * from a master passphrase or BIP-39 mnemonic seed phrase.
 *
 * Standard iterations: 600,000 rounds (OWASP 2023+ recommendation for PBKDF2-HMAC-SHA256).
 */

export interface DerivedKeyBundle {
  key: CryptoKey;
  iterations: number;
}

/**
 * Derives an AES-GCM-256 CryptoKey from a secret passphrase and a 16-byte salt.
 * Uses native WebCrypto API (hardware accelerated in modern browser/Node environments).
 *
 * @param passphrase - The master password or 12-24 word BIP-39 seed string
 * @param salt - Cryptographically random 16-byte Uint8Array salt
 * @param iterations - Computational iteration count (defaults to 600,000 rounds)
 */
export async function deriveVaultKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = 600_000
): Promise<DerivedKeyBundle> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error("Passphrase cannot be empty");
  }
  if (salt.byteLength < 16) {
    throw new Error("Salt must be at least 16 bytes for cryptographic security");
  }

  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // 1. Import the raw passphrase bytes as a PBKDF2 base key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // 2. Derive the 256-bit AES-GCM key
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    true, // extractable for testing/export verification
    ["encrypt", "decrypt"]
  );

  return { key, iterations };
}

/**
 * Generates a cryptographically secure random 16-byte salt using CSPRNG.
 */
export function generateSalt(byteLength = 16): Uint8Array {
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return salt;
}
