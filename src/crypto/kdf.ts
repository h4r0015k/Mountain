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
 * @param extractable - Whether raw key bytes can be exported via crypto.subtle.exportKey. Defaults to false for defense-in-depth against in-memory extraction.
 */
export async function deriveVaultKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = 600_000,
  extractable = false
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
    extractable, // false by default: prevents any in-memory extraction of raw symmetric key bytes
    ["encrypt", "decrypt"]
  );

  return {
    key,
    iterations
  };
}

/**
 * Generates a cryptographically strong random salt using CSPRNG.
 * Default length: 16 bytes (128 bits), compliant with NIST SP 800-132.
 *
 * @param length - Length in bytes (defaults to 16)
 */
export function generateSalt(length = 16): Uint8Array {
  if (length < 16) {
    throw new Error("Salt length must be at least 16 bytes");
  }
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return salt;
}
