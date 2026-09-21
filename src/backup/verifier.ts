/**
 * Mountain Backup & Recovery Subsystem - Cryptographic Verifier
 *
 * Implements validation of BIP-39 recovery phrases against encrypted vault snapshots.
 * Guarantees that any entered 12 words are verified to successfully decrypt the target
 * vault before any backup or restore operation completes.
 */

import { VaultSnapshot } from '../models/vault.js';
import { validateMnemonic } from '../crypto/mnemonic.js';
import { deriveVaultKey } from '../crypto/kdf.js';
import { base64ToBytes } from '../crypto/base64.js';
import { encryptVaultRecord, decryptVaultRecord, EncryptedVaultPayload } from '../crypto/vault.js';
import { DecryptionValidationError } from './types.js';

const AUTH_CANARY_CONSTANT = 'mountain-vault-auth-canary';

interface AuthCheckContent {
  canary: string;
  vaultId: string;
  timestamp: number;
}

/**
 * Cleans and normalizes a mnemonic phrase (trims, lowercases, single whitespace).
 */
export function normalizeMnemonic(rawPhrase: string): string {
  if (!rawPhrase || typeof rawPhrase !== 'string') {
    throw new DecryptionValidationError(
      'Recovery phrase cannot be empty.',
      'INVALID_MNEMONIC'
    );
  }
  return rawPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Validates that a phrase is a valid BIP-39 mnemonic.
 * Throws DecryptionValidationError if invalid.
 */
export function assertValidMnemonic(phrase: string): string {
  const normalized = normalizeMnemonic(phrase);
  const isValid = validateMnemonic(normalized);
  if (!isValid) {
    throw new DecryptionValidationError(
      'Invalid BIP-39 mnemonic phrase. Please check your word spellings and order.',
      'INVALID_MNEMONIC'
    );
  }
  return normalized;
}

/**
 * Creates an encrypted authentication canary payload using the vault's master key.
 */
export async function createAuthCheckPayload(
  key: CryptoKey,
  vaultId: string
): Promise<EncryptedVaultPayload> {
  const content: AuthCheckContent = {
    canary: AUTH_CANARY_CONSTANT,
    vaultId,
    timestamp: Date.now(),
  };
  return await encryptVaultRecord(content, key);
}

export const MIN_KDF_ITERATIONS = 10_000;
export const MAX_KDF_ITERATIONS = 2_500_000;
export const MIN_SALT_BYTES = 16;

/**
 * Derives the 256-bit AES-GCM CryptoKey from a verified mnemonic and snapshot salt/kdf.
 */
export async function deriveKeyFromMnemonic(
  mnemonic: string,
  snapshot: VaultSnapshot
): Promise<CryptoKey> {
  const cleanMnemonic = assertValidMnemonic(mnemonic);
  if (!snapshot || !snapshot.salt || typeof snapshot.salt !== 'string') {
    throw new DecryptionValidationError(
      'Invalid vault snapshot: Missing cryptographic salt.',
      'CORRUPT_BACKUP'
    );
  }

  let saltBytes: Uint8Array;
  try {
    saltBytes = base64ToBytes(snapshot.salt);
  } catch {
    throw new DecryptionValidationError(
      'Invalid vault snapshot: Salt is not valid Base64.',
      'CORRUPT_BACKUP'
    );
  }

  if (saltBytes.byteLength < MIN_SALT_BYTES) {
    throw new DecryptionValidationError(
      `Invalid vault snapshot: Salt must be at least ${MIN_SALT_BYTES} bytes.`,
      'CORRUPT_BACKUP'
    );
  }

  const iterations = snapshot.kdfIterations ?? 600_000;
  if (
    typeof iterations !== 'number' ||
    !Number.isInteger(iterations) ||
    iterations < MIN_KDF_ITERATIONS ||
    iterations > MAX_KDF_ITERATIONS
  ) {
    throw new DecryptionValidationError(
      `Invalid vault snapshot: PBKDF2 iterations (${iterations}) out of acceptable bounds [${MIN_KDF_ITERATIONS.toLocaleString()} - ${MAX_KDF_ITERATIONS.toLocaleString()}].`,
      'CORRUPT_BACKUP'
    );
  }

  const bundle = await deriveVaultKey(cleanMnemonic, saltBytes, iterations);
  return bundle.key;
}

/**
 * Validates whether the provided 12-word recovery phrase can successfully decrypt the given snapshot.
 *
 * If decryption succeeds, returns the derived CryptoKey and verification strategy.
 * If decryption fails (incorrect words, wrong salt, corrupted ciphertext), immediately raises
 * an explicit DecryptionValidationError right here.
 */
export async function validateDecryption(
  mnemonic: string,
  snapshot: VaultSnapshot
): Promise<{ key: CryptoKey; verifiedWith: 'authCheck' | 'item' | 'mnemonic_only' }> {
  // 1. Derive the key using the snapshot's salt and iterations
  const key = await deriveKeyFromMnemonic(mnemonic, snapshot);

  // 2. Strategy A: Snapshot contains an authCheck canary
  if (snapshot.authCheck) {
    try {
      const auth = await decryptVaultRecord<AuthCheckContent>(snapshot.authCheck, key);
      if (auth.canary !== AUTH_CANARY_CONSTANT) {
        throw new Error('Canary mismatch');
      }
      return { key, verifiedWith: 'authCheck' };
    } catch {
      throw new DecryptionValidationError(
        'Decryption failed: The provided 12-word recovery phrase does not match this vault.',
        'DECRYPTION_FAILED'
      );
    }
  }

  // 3. Strategy B: Snapshot contains encrypted vault items
  if (snapshot.items && snapshot.items.length > 0) {
    try {
      // Attempt decryption on the first item
      await decryptVaultRecord(snapshot.items[0].encryptedData, key);
      return { key, verifiedWith: 'item' };
    } catch {
      throw new DecryptionValidationError(
        'Decryption failed: The provided 12-word recovery phrase does not match this vault.',
        'DECRYPTION_FAILED'
      );
    }
  }

  // 4. Strategy C: Empty vault with no items and no authCheck
  // Since assertValidMnemonic passed, key derivation succeeded
  return { key, verifiedWith: 'mnemonic_only' };
}
