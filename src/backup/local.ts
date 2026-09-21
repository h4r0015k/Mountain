/**
 * Mountain Backup & Recovery Subsystem - Local File Adapter
 *
 * Handles creation and restoration of encrypted local backup files (.json / .mountain).
 * Validates schema integrity and cryptographic decryptability before any operation finishes.
 */

import { VaultSnapshot } from '../models/vault.js';
import { validateDecryption, createAuthCheckPayload } from './verifier.js';
import { DecryptionValidationError, LocalBackupResult, RestoreResult } from './types.js';

/**
 * Validates that an object conforms to the Mountain VaultSnapshot specification.
 */
export function validateVaultSnapshotSchema(data: unknown): data is VaultSnapshot {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (obj.format !== 'mountain-vault') return false;
  if (typeof obj.version !== 'number' || obj.version < 1) return false;
  if (typeof obj.vaultId !== 'string' || !obj.vaultId) return false;
  if (typeof obj.salt !== 'string' || obj.salt.length < 22) return false;
  if (obj.kdfIterations !== undefined) {
    if (
      typeof obj.kdfIterations !== 'number' ||
      !Number.isInteger(obj.kdfIterations) ||
      obj.kdfIterations < 10_000 ||
      obj.kdfIterations > 2_500_000
    ) {
      return false;
    }
  }
  if (!Array.isArray(obj.items)) return false;

  // Validate item structure
  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return false;
    const it = item as Record<string, unknown>;
    if (typeof it.id !== 'string') return false;
    if (typeof it.type !== 'string') return false;
    if (!it.encryptedData || typeof it.encryptedData !== 'object') return false;
    const enc = it.encryptedData as Record<string, unknown>;
    if (typeof enc.iv !== 'string' || typeof enc.ciphertext !== 'string') return false;
  }

  return true;
}

/**
 * Parses and validates raw JSON content into a verified VaultSnapshot.
 */
export function parseSnapshotFromJson(rawJson: string): VaultSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new DecryptionValidationError(
      'Corrupt backup file: The selected file is not a valid JSON document.',
      'CORRUPT_BACKUP'
    );
  }

  if (!validateVaultSnapshotSchema(parsed)) {
    throw new DecryptionValidationError(
      'Invalid vault backup: The file does not conform to the Mountain vault format specification.',
      'CORRUPT_BACKUP'
    );
  }

  return parsed;
}

/**
 * Creates a validated local backup package.
 *
 * 1. Validates the 12 words against the snapshot to guarantee decryptability.
 * 2. Injects an authCheck canary if not already present.
 * 3. Returns the encrypted JSON string, Blob, and standard filename.
 */
export async function createLocalBackup(
  snapshot: VaultSnapshot,
  mnemonic: string
): Promise<LocalBackupResult> {
  // 1. Validate that the provided 12 words can decrypt this snapshot
  const { key } = await validateDecryption(mnemonic, snapshot);

  // 2. Clone snapshot and ensure authCheck canary exists
  const exportSnapshot: VaultSnapshot = {
    ...snapshot,
    items: [...snapshot.items],
  };

  if (!exportSnapshot.authCheck) {
    exportSnapshot.authCheck = await createAuthCheckPayload(key, exportSnapshot.vaultId);
  }

  // 3. Serialize to formatted JSON string
  const jsonString = JSON.stringify(exportSnapshot, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  // 4. Standard naming: mountain-vault-backup-[vaultId8]-[timestamp].json
  const idPrefix = exportSnapshot.vaultId ? exportSnapshot.vaultId.slice(0, 8) : 'vault';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `mountain-vault-backup-${idPrefix}-${timestamp}.json`;

  return {
    destination: 'local',
    blob,
    filename,
    json: jsonString,
    snapshot: exportSnapshot,
  };
}

/**
 * Triggers a browser download of the generated local backup file.
 */
export function triggerLocalDownload(backupResult: LocalBackupResult): void {
  const url = URL.createObjectURL(backupResult.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = backupResult.filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Restores a vault from a local backup source (string, Blob, or File).
 *
 * 1. Reads and parses the backup content.
 * 2. Validates schema and structure.
 * 3. Verifies that the provided 12 words can decrypt the backup snapshot.
 *    If decryption fails, throws DecryptionValidationError immediately.
 */
export async function restoreFromLocal(
  backupData: string | Blob | File,
  mnemonic: string
): Promise<RestoreResult> {
  let jsonString: string;

  if (typeof backupData === 'string') {
    jsonString = backupData;
  } else if (typeof backupData.text === 'function') {
    jsonString = await backupData.text();
  } else {
    jsonString = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read backup file.'));
      reader.readAsText(backupData);
    });
  }

  // Parse and validate schema
  const snapshot = parseSnapshotFromJson(jsonString);

  // Validate decryption with 12 words (throws if mismatched)
  const { key, verifiedWith } = await validateDecryption(mnemonic, snapshot);

  return {
    snapshot,
    key,
    verifiedWith,
  };
}
