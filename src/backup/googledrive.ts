/**
 * Mountain Backup & Recovery Subsystem - Google Drive REST Adapter
 *
 * Implements client-side, zero-knowledge Google Drive cloud backup and restoration.
 * Uses standard Google Drive API v3 (REST) without bloated third-party SDKs.
 * Validates decryptability with the user's 12 recovery words before completing any action.
 */

import { VaultSnapshot } from '../models/vault.js';
import { validateDecryption, createAuthCheckPayload } from './verifier.js';
import { validateVaultSnapshotSchema } from './local.js';
import {
  DecryptionValidationError,
  GoogleDriveBackupResult,
  GoogleDriveFileMetadata,
  RestoreResult,
} from './types.js';

const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export type FetchFunction = typeof fetch;

export interface GoogleDriveClientOptions {
  fetchFn?: FetchFunction;
}

/**
 * Client for interacting with Google Drive v3 REST API.
 */
export class GoogleDriveClient {
  private fetchFn: FetchFunction;

  constructor(options?: GoogleDriveClientOptions) {
    this.fetchFn = options?.fetchFn || globalThis.fetch?.bind(globalThis);
  }

  /**
   * Uploads an encrypted vault snapshot to Google Drive using multipart upload.
   */
  async uploadFile(
    accessToken: string,
    snapshot: VaultSnapshot,
    options?: { folder?: 'appDataFolder' | 'drive'; customName?: string }
  ): Promise<GoogleDriveFileMetadata> {
    if (!accessToken) {
      throw new Error('Google Drive access token is required for upload.');
    }

    const folder = options?.folder || 'appDataFolder';
    const idPrefix = snapshot.vaultId ? snapshot.vaultId.slice(0, 8) : 'vault';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = options?.customName || `mountain-vault-backup-${idPrefix}-${timestamp}.json`;

    const metadata: Record<string, unknown> = {
      name: fileName,
      mimeType: 'application/json',
      description: 'Mountain Password Manager encrypted vault snapshot',
    };

    if (folder === 'appDataFolder') {
      metadata.parents = ['appDataFolder'];
    }

    const boundary = `-------MountainBoundary${Date.now().toString(16)}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const jsonContent = JSON.stringify(snapshot, null, 2);

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const response = await this.fetchFn(
      `${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,modifiedTime,size,mimeType`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Google Drive upload failed (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      modifiedTime: data.modifiedTime || new Date().toISOString(),
      size: data.size,
      mimeType: data.mimeType,
    };
  }

  /**
   * Downloads and parses an encrypted VaultSnapshot from Google Drive.
   */
  async downloadFile(accessToken: string, fileId: string): Promise<VaultSnapshot> {
    if (!accessToken) {
      throw new Error('Google Drive access token is required for download.');
    }
    if (!fileId) {
      throw new Error('Google Drive fileId must be specified.');
    }

    const response = await this.fetchFn(
      `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Google Drive download failed (${response.status}): ${errorText || response.statusText}`);
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new DecryptionValidationError(
        'Downloaded Google Drive backup file is not valid JSON.',
        'CORRUPT_BACKUP'
      );
    }

    if (!validateVaultSnapshotSchema(parsed)) {
      throw new DecryptionValidationError(
        'Downloaded file is not a valid Mountain vault snapshot.',
        'CORRUPT_BACKUP'
      );
    }

    return parsed;
  }

  /**
   * Lists available Mountain vault backups stored in Google Drive.
   */
  async listBackups(
    accessToken: string,
    options?: { folder?: 'appDataFolder' | 'drive' }
  ): Promise<GoogleDriveFileMetadata[]> {
    if (!accessToken) {
      throw new Error('Google Drive access token is required to list backups.');
    }

    const folder = options?.folder || 'appDataFolder';
    const spaces = folder === 'appDataFolder' ? 'appDataFolder' : 'drive';
    const query = encodeURIComponent("name contains 'mountain-vault' and trashed = false");

    const url = `${GOOGLE_DRIVE_API_BASE}/files?q=${query}&spaces=${spaces}&fields=files(id,name,modifiedTime,size,mimeType)&orderBy=modifiedTime desc`;

    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to list Google Drive backups (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      modifiedTime: file.modifiedTime,
      size: file.size,
      mimeType: file.mimeType,
    }));
  }

  /**
   * Permanently deletes a backup file from Google Drive.
   */
  async deleteFile(accessToken: string, fileId: string): Promise<void> {
    if (!accessToken || !fileId) {
      throw new Error('Access token and fileId are required.');
    }

    const response = await this.fetchFn(
      `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete Google Drive file (${response.status})`);
    }
  }
}

/**
 * Creates an encrypted backup on Google Drive after verifying decryptability with 12 words.
 */
export async function createGoogleDriveBackup(
  snapshot: VaultSnapshot,
  mnemonic: string,
  accessToken: string,
  options?: { folder?: 'appDataFolder' | 'drive'; customName?: string; client?: GoogleDriveClient }
): Promise<GoogleDriveBackupResult> {
  // 1. Validate that the 12 words can decrypt this vault (throws if mismatched)
  const { key } = await validateDecryption(mnemonic, snapshot);

  // 2. Clone snapshot and ensure authCheck canary exists
  const exportSnapshot: VaultSnapshot = {
    ...snapshot,
    items: [...snapshot.items],
  };

  if (!exportSnapshot.authCheck) {
    exportSnapshot.authCheck = await createAuthCheckPayload(key, exportSnapshot.vaultId);
  }

  // 3. Upload via Google Drive Client
  const client = options?.client || new GoogleDriveClient();
  const fileMeta = await client.uploadFile(accessToken, exportSnapshot, options);

  return {
    destination: 'google_drive',
    fileId: fileMeta.id,
    fileName: fileMeta.name,
    snapshot: exportSnapshot,
  };
}

/**
 * Restores a vault snapshot from Google Drive by fileId, validating decryptability with 12 words.
 */
export async function restoreFromGoogleDrive(
  fileId: string,
  mnemonic: string,
  accessToken: string,
  options?: { client?: GoogleDriveClient }
): Promise<RestoreResult> {
  const client = options?.client || new GoogleDriveClient();

  // 1. Download snapshot from Google Drive
  const snapshot = await client.downloadFile(accessToken, fileId);

  // 2. Validate that the 12 words can decrypt this snapshot (throws if mismatched)
  const { key, verifiedWith } = await validateDecryption(mnemonic, snapshot);

  return {
    snapshot,
    key,
    verifiedWith,
  };
}
