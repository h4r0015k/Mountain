/**
 * Mountain Backup & Recovery Subsystem - Types & Interfaces
 */

import { VaultSnapshot } from '../models/vault.js';

export type BackupDestination = 'local' | 'google_drive';
export type RestoreSource = 'local' | 'google_drive';

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  mimeType?: string;
}

export interface LocalBackupResult {
  destination: 'local';
  blob: Blob;
  filename: string;
  json: string;
  snapshot: VaultSnapshot;
}

export interface GoogleDriveBackupResult {
  destination: 'google_drive';
  fileId: string;
  fileName: string;
  snapshot: VaultSnapshot;
}

export type BackupResult = LocalBackupResult | GoogleDriveBackupResult;

export interface RestoreResult {
  snapshot: VaultSnapshot;
  key: CryptoKey;
  verifiedWith: 'authCheck' | 'item' | 'mnemonic_only';
}

export interface LocalBackupOptions {
  destination: 'local';
  snapshot: VaultSnapshot;
  mnemonic: string;
}

export interface GoogleDriveBackupOptions {
  destination: 'google_drive';
  snapshot: VaultSnapshot;
  mnemonic: string;
  accessToken: string;
  folder?: 'appDataFolder' | 'drive';
  customName?: string;
}

export type BackupOptions = LocalBackupOptions | GoogleDriveBackupOptions;

export interface LocalRestoreOptions {
  source: 'local';
  mnemonic: string;
  backupData: string | Blob | File;
}

export interface GoogleDriveRestoreOptions {
  source: 'google_drive';
  mnemonic: string;
  fileId: string;
  accessToken: string;
}

export type RestoreOptions = LocalRestoreOptions | GoogleDriveRestoreOptions;

export class DecryptionValidationError extends Error {
  public readonly code: 'DECRYPTION_FAILED' | 'INVALID_MNEMONIC' | 'CORRUPT_BACKUP';

  constructor(message: string, code: 'DECRYPTION_FAILED' | 'INVALID_MNEMONIC' | 'CORRUPT_BACKUP' = 'DECRYPTION_FAILED') {
    super(message);
    this.name = 'DecryptionValidationError';
    this.code = code;
  }
}
