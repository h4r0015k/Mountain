/**
 * Mountain Cryptographic Engine - Authenticated Vault Encryption
 *
 * Implements AES-256-GCM (Authenticated Encryption with Associated Data).
 * Guarantees both Confidentiality (privacy) and Integrity (tamper detection).
 *
 * Security Invariants:
 * 1. Every encryption operation MUST use a freshly generated 12-byte (96-bit) CSPRNG IV/nonce.
 * 2. Never reuse an IV with the same CryptoKey.
 * 3. The 16-byte GCM authentication tag is automatically appended to ciphertext by WebCrypto.
 */

export interface EncryptedVaultPayload {
  /** Base64 encoded 12-byte Initialization Vector (Nonce) */
  iv: string;
  /** Base64 encoded ciphertext including the 16-byte GCM authentication tag */
  ciphertext: string;
  /** Schema version for future cryptographic algorithm upgrades */
  version: number;
}

/**
 * Encrypts any JSON-serializable vault item using AES-256-GCM.
 *
 * @param data - The plaintext JavaScript object or vault record
 * @param key - The 256-bit AES-GCM CryptoKey derived from master credentials
 */
export async function encryptVaultRecord<T>(
  data: T,
  key: CryptoKey
): Promise<EncryptedVaultPayload> {
  if (!data) {
    throw new Error("Cannot encrypt empty or null data");
  }
  if (!key || key.algorithm.name !== "AES-GCM") {
    throw new Error("A valid AES-GCM CryptoKey is required for encryption");
  }

  // 1. Serialize data to UTF-8 bytes
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(JSON.stringify(data));

  // 2. Generate a cryptographically random 12-byte (96-bit) Nonce / IV
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // 3. Encrypt via native hardware-accelerated WebCrypto AES-GCM
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plaintextBytes
  );

  // 4. Return clean Base64 encoded payload
  return {
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(ciphertextBuffer).toString("base64"),
    version: 1,
  };
}

/**
 * Decrypts an EncryptedVaultPayload using AES-256-GCM.
 * Rejects and throws an error if ciphertext or IV has been tampered with or corrupted.
 *
 * @param payload - The encrypted Base64 IV and ciphertext bundle
 * @param key - The 256-bit AES-GCM CryptoKey derived from master credentials
 */
export async function decryptVaultRecord<T>(
  payload: EncryptedVaultPayload,
  key: CryptoKey
): Promise<T> {
  if (!payload || !payload.iv || !payload.ciphertext) {
    throw new Error("Invalid encrypted payload structure");
  }
  if (!key || key.algorithm.name !== "AES-GCM") {
    throw new Error("A valid AES-GCM CryptoKey is required for decryption");
  }

  // 1. Decode Base64 strings to Uint8Array byte buffers
  const iv = new Uint8Array(Buffer.from(payload.iv, "base64"));
  const ciphertextBytes = new Uint8Array(Buffer.from(payload.ciphertext, "base64"));

  if (iv.byteLength !== 12) {
    throw new Error("Invalid IV length: AES-GCM requires a 12-byte initialization vector");
  }

  // 2. Decrypt and verify authentication tag via WebCrypto
  // Throws OperationError automatically if authentication tag verification fails
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertextBytes
  );

  // 3. Parse UTF-8 bytes back to original JSON object
  const decoder = new TextDecoder();
  const plaintextJson = decoder.decode(decryptedBuffer);

  return JSON.parse(plaintextJson) as T;
}
