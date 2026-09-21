/**
 * Mountain Backup & Recovery Subsystem
 *
 * Provides a unified API for backing up and restoring encrypted Mountain vaults
 * across two destinations/sources:
 *   1. Local (.json / .mountain file)
 *   2. Google Drive (Google Drive v3 REST API)
 *
 * Security Guarantee:
 *   Every backup and restore operation requires the user's 12-word recovery phrase,
 *   and explicitly validates whether it can decrypt the snapshot before proceeding.
 *   If decryption fails, an error is raised immediately right there without altering
 *   or corrupting local storage.
 */

import {
  BackupOptions,
  BackupResult,
  RestoreOptions,
  RestoreResult,
} from './types.js';
import { createLocalBackup, restoreFromLocal } from './local.js';
import { createGoogleDriveBackup, restoreFromGoogleDrive } from './googledrive.js';

/**
 * Creates an encrypted backup of the vault.
 *
 * Supports two destinations:
 * - 'local': Packages encrypted snapshot into downloadable file.
 * - 'google_drive': Uploads encrypted snapshot to user's Google Drive.
 *
 * Verifies that the entered 12 words can decrypt the vault before creating the backup.
 */
export async function backupVault(options: BackupOptions): Promise<BackupResult> {
  if (options.destination === 'local') {
    return await createLocalBackup(options.snapshot, options.mnemonic);
  }

  if (options.destination === 'google_drive') {
    return await createGoogleDriveBackup(
      options.snapshot,
      options.mnemonic,
      options.accessToken,
      {
        folder: options.folder,
        customName: options.customName,
      }
    );
  }

  throw new Error(`Unsupported backup destination: ${(options as any).destination}`);
}

/**
 * Restores an encrypted vault snapshot.
 *
 * Supports two sources:
 * - 'local': Restores from a local file, Blob, or raw JSON string.
 * - 'google_drive': Restores from a file stored in Google Drive.
 *
 * Verifies that the entered 12 words can decrypt the restored snapshot.
 * Throws DecryptionValidationError right away if the recovery phrase is incorrect or data is corrupt.
 */
export async function restoreVault(options: RestoreOptions): Promise<RestoreResult> {
  if (options.source === 'local') {
    return await restoreFromLocal(options.backupData, options.mnemonic);
  }

  if (options.source === 'google_drive') {
    return await restoreFromGoogleDrive(
      options.fileId,
      options.mnemonic,
      options.accessToken
    );
  }

  throw new Error(`Unsupported restore source: ${(options as any).source}`);
}

// Re-export all underlying modules, types, and utilities
export * from './types.js';
export * from './verifier.js';
export * from './local.js';
export * from './googledrive.js';
