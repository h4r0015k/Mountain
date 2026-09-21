import { describe, it, expect, beforeAll } from 'vitest';
import { generateMnemonic } from '../src/crypto/mnemonic.js';
import { deriveVaultKey, generateSalt } from '../src/crypto/kdf.js';
import { encryptVaultRecord } from '../src/crypto/vault.js';
import { bytesToBase64 } from '../src/crypto/base64.js';
import { VaultSnapshot, VaultItem } from '../src/models/vault.js';
import {
  backupVault,
  restoreVault,
  createGoogleDriveBackup,
  restoreFromGoogleDrive,
  GoogleDriveClient,
  DecryptionValidationError,
} from '../src/backup/index.js';

describe('Mountain Backup & Recovery Subsystem - Google Drive REST Adapter', () => {
  let validMnemonic: string;
  let wrongMnemonic: string;
  let testSnapshot: VaultSnapshot;
  let masterKey: CryptoKey;
  const mockAccessToken = 'ya29.mock_google_oauth_token_secret_12345';

  beforeAll(async () => {
    validMnemonic = generateMnemonic(12);
    wrongMnemonic = generateMnemonic(12);
    while (wrongMnemonic === validMnemonic) {
      wrongMnemonic = generateMnemonic(12);
    }

    const salt = generateSalt(16);
    const bundle = await deriveVaultKey(validMnemonic, salt, 10_000);
    masterKey = bundle.key;

    const encData = await encryptVaultRecord(
      { username: 'carol@google.drive.test', password: 'VaultPassword!987' },
      masterKey
    );

    const item: VaultItem = {
      id: 'item_cloud',
      type: 'LOGIN',
      title: 'Google Drive Record',
      favorite: true,
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
      encryptedData: encData,
    };

    testSnapshot = {
      format: 'mountain-vault',
      version: 1,
      vaultId: 'vault_drive_test_999',
      salt: bytesToBase64(salt),
      kdfIterations: 10_000,
      items: [item],
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
    };
  });

  describe('GoogleDriveClient API Requests', () => {
    it('uploads encrypted snapshot using multipart/related format and bearer auth', async () => {
      let capturedUrl = '';
      let capturedHeaders: Record<string, string> = {};
      let capturedBody = '';

      const mockFetch: typeof fetch = async (input, init) => {
        capturedUrl = input.toString();
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        capturedBody = (init?.body as string) || '';

        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'gdrive_file_id_101',
            name: 'mountain-vault-backup-vault_dr-test.json',
            modifiedTime: '2026-09-21T12:00:00.000Z',
            size: '2048',
            mimeType: 'application/json',
          }),
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });
      const metadata = await client.uploadFile(mockAccessToken, testSnapshot, { folder: 'drive' });

      expect(capturedUrl).toContain('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${mockAccessToken}`);
      expect(capturedHeaders['Content-Type']).toContain('multipart/related; boundary=');
      expect(capturedBody).toContain('mountain-vault-backup-');
      expect(capturedBody).toContain(testSnapshot.vaultId);

      expect(metadata.id).toBe('gdrive_file_id_101');
      expect(metadata.name).toBe('mountain-vault-backup-vault_dr-test.json');
    });

    it('defaults upload destination to sandboxed appDataFolder when folder option is omitted', async () => {
      let capturedBody = '';

      const mockFetch: typeof fetch = async (_input, init) => {
        capturedBody = (init?.body as string) || '';
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'gdrive_sandboxed_id',
            name: 'mountain-vault-backup.json',
          }),
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });
      await client.uploadFile(mockAccessToken, testSnapshot);

      expect(capturedBody).toContain('"parents":["appDataFolder"]');
    });

    it('downloads and parses snapshot from Google Drive with alt=media parameter', async () => {
      let capturedUrl = '';
      let capturedHeaders: Record<string, string> = {};

      const mockFetch: typeof fetch = async (input, init) => {
        capturedUrl = input.toString();
        capturedHeaders = (init?.headers as Record<string, string>) || {};

        return {
          ok: true,
          status: 200,
          json: async () => testSnapshot,
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });
      const downloaded = await client.downloadFile(mockAccessToken, 'gdrive_file_id_101');

      expect(capturedUrl).toBe('https://www.googleapis.com/drive/v3/files/gdrive_file_id_101?alt=media');
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${mockAccessToken}`);
      expect(downloaded.vaultId).toBe(testSnapshot.vaultId);
      expect(downloaded.items.length).toBe(1);
    });

    it('lists available backups in Google Drive filtering for mountain-vault files', async () => {
      let capturedUrl = '';

      const mockFetch: typeof fetch = async (input) => {
        capturedUrl = input.toString();
        return {
          ok: true,
          status: 200,
          json: async () => ({
            files: [
              {
                id: 'file_001',
                name: 'mountain-vault-backup-2026-09-21.json',
                modifiedTime: '2026-09-21T10:00:00Z',
                size: '1024',
              },
            ],
          }),
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });
      const backups = await client.listBackups(mockAccessToken);

      expect(capturedUrl).toContain('files?q=');
      expect(decodeURIComponent(capturedUrl)).toContain("name contains 'mountain-vault'");
      expect(backups.length).toBe(1);
      expect(backups[0].id).toBe('file_001');
    });

    it('throws when Google Drive API returns 401 Unauthorized', async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => 'Invalid Credentials',
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });
      await expect(client.downloadFile(mockAccessToken, 'any_id')).rejects.toThrow(
        /Google Drive download failed \(401\)/
      );
    });
  });

  describe('Google Drive Backup & Restore Workflow', () => {
    it('creates Google Drive backup successfully when 12 words are verified', async () => {
      let uploadedSnapshot: VaultSnapshot | null = null;

      const mockFetch: typeof fetch = async (_input, init) => {
        // Extract snapshot from multipart body
        const body = init?.body as string;
        const jsonMatch = body.split('Content-Type: application/json\r\n\r\n')[1];
        if (jsonMatch) {
          const rawJson = jsonMatch.split('\r\n--')[0];
          uploadedSnapshot = JSON.parse(rawJson);
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'cloud_backup_id_555',
            name: 'mountain-vault-backup-test.json',
          }),
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });

      const result = await createGoogleDriveBackup(
        testSnapshot,
        validMnemonic,
        mockAccessToken,
        { client }
      );

      expect(result.destination).toBe('google_drive');
      expect(result.fileId).toBe('cloud_backup_id_555');
      expect(uploadedSnapshot).not.toBeNull();
      // Verifies authCheck was injected before cloud upload
      expect(uploadedSnapshot!.authCheck).toBeDefined();
    });

    it('refuses to upload to Google Drive if 12 words do not match vault (Authorization check)', async () => {
      const mockFetch = async () => ({ ok: true, json: async () => ({ id: '1' }) } as Response);
      const client = new GoogleDriveClient({ fetchFn: mockFetch });

      await expect(
        createGoogleDriveBackup(testSnapshot, wrongMnemonic, mockAccessToken, { client })
      ).rejects.toThrow(DecryptionValidationError);
    });

    it('restores vault from Google Drive when 12 words decrypt successfully', async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => testSnapshot,
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });

      const restored = await restoreFromGoogleDrive(
        'cloud_backup_id_555',
        validMnemonic,
        mockAccessToken,
        { client }
      );

      expect(restored.snapshot.vaultId).toBe(testSnapshot.vaultId);
      expect(restored.snapshot.items.length).toBe(1);
      expect(restored.key).toBeDefined();
    });

    it('strictly raises DecryptionValidationError right away when restoring from Google Drive with wrong 12 words', async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => testSnapshot,
        } as Response;
      };

      const client = new GoogleDriveClient({ fetchFn: mockFetch });

      await expect(
        restoreFromGoogleDrive('cloud_backup_id_555', wrongMnemonic, mockAccessToken, { client })
      ).rejects.toThrow(DecryptionValidationError);

      try {
        await restoreFromGoogleDrive('cloud_backup_id_555', wrongMnemonic, mockAccessToken, { client });
      } catch (err: any) {
        expect(err).toBeInstanceOf(DecryptionValidationError);
        expect(err.code).toBe('DECRYPTION_FAILED');
      }
    });

    it('supports unified backupVault and restoreVault entry points with destination google_drive', async () => {
      const mockFetch: typeof fetch = async (input) => {
        const url = input.toString();
        if (url.includes('/upload/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'unified_drive_id_777', name: 'vault_backup.json' }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => testSnapshot,
        } as Response;
      };

      // Set global fetch during this test
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const backupRes = await backupVault({
          destination: 'google_drive',
          snapshot: testSnapshot,
          mnemonic: validMnemonic,
          accessToken: mockAccessToken,
        });

        expect(backupRes.destination).toBe('google_drive');
        if (backupRes.destination === 'google_drive') {
          expect(backupRes.fileId).toBe('unified_drive_id_777');
        }

        const restoreRes = await restoreVault({
          source: 'google_drive',
          fileId: 'unified_drive_id_777',
          mnemonic: validMnemonic,
          accessToken: mockAccessToken,
        });

        expect(restoreRes.snapshot.vaultId).toBe(testSnapshot.vaultId);
        expect(restoreRes.key).toBeDefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
