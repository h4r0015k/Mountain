import { describe, it, expect, beforeAll } from 'vitest';
import { generateMnemonic } from '../src/crypto/mnemonic.js';
import { deriveVaultKey, generateSalt } from '../src/crypto/kdf.js';
import { encryptVaultRecord } from '../src/crypto/vault.js';
import { bytesToBase64, base64ToBytes } from '../src/crypto/base64.js';
import { VaultSnapshot, VaultItem } from '../src/models/vault.js';
import {
  backupVault,
  restoreVault,
  createLocalBackup,
  restoreFromLocal,
  validateDecryption,
  assertValidMnemonic,
  DecryptionValidationError,
  verifyVaultKey,
  createAuthCheckPayload,
} from '../src/backup/index.js';

describe('Mountain Backup & Recovery Subsystem - Local File & Cryptographic Verification', () => {
  let validMnemonic: string;
  let wrongMnemonic: string;
  let testSnapshot: VaultSnapshot;
  let masterKey: CryptoKey;

  beforeAll(async () => {
    // 1. Generate two distinct, valid 12-word BIP-39 mnemonic phrases
    validMnemonic = generateMnemonic(12);
    wrongMnemonic = generateMnemonic(12);
    while (wrongMnemonic === validMnemonic) {
      wrongMnemonic = generateMnemonic(12);
    }

    // 2. Derive master key for validMnemonic with 10k iterations for fast tests
    const salt = generateSalt(16);
    const bundle = await deriveVaultKey(validMnemonic, salt, 10_000);
    masterKey = bundle.key;

    // 3. Encrypt sample records
    const encRecord1 = await encryptVaultRecord(
      { username: 'alice@mountain.local', password: 'P@ssw0rd!Secret2026', url: 'https://github.com' },
      masterKey
    );
    const encRecord2 = await encryptVaultRecord(
      { noteTitle: 'Recovery Instructions', text: 'Important seed notes' },
      masterKey
    );

    const item1: VaultItem = {
      id: 'item_alpha',
      type: 'LOGIN',
      title: 'GitHub Login',
      favorite: true,
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
      encryptedData: encRecord1,
    };

    const item2: VaultItem = {
      id: 'item_beta',
      type: 'SECURE_NOTE',
      title: 'Secret Note',
      favorite: false,
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
      encryptedData: encRecord2,
    };

    testSnapshot = {
      format: 'mountain-vault',
      version: 1,
      vaultId: 'vault_test_12345678',
      salt: bytesToBase64(salt),
      kdfIterations: 10_000,
      items: [item1, item2],
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
    };
  });

  describe('Mnemonic Validation & Decryption Verification', () => {
    it('validates BIP-39 mnemonic syntax and rejects invalid words or bad checksums', () => {
      expect(assertValidMnemonic(validMnemonic)).toBe(validMnemonic.toLowerCase());
      expect(() => assertValidMnemonic('not a valid twelve word mnemonic phrase at all today')).toThrow(
        DecryptionValidationError
      );
      expect(() => assertValidMnemonic('')).toThrow(DecryptionValidationError);
    });

    it('successfully validates and returns key when 12 words match snapshot items', async () => {
      const res = await validateDecryption(validMnemonic, testSnapshot);
      expect(res.key).toBeDefined();
      expect(res.key.algorithm.name).toBe('AES-GCM');
      expect(res.verifiedWith).toBe('item');
    });

    it('immediately rejects and raises DecryptionValidationError when 12 words are wrong', async () => {
      await expect(validateDecryption(wrongMnemonic, testSnapshot)).rejects.toThrow(
        DecryptionValidationError
      );

      try {
        await validateDecryption(wrongMnemonic, testSnapshot);
      } catch (err: any) {
        expect(err).toBeInstanceOf(DecryptionValidationError);
        expect(err.code).toBe('DECRYPTION_FAILED');
        expect(err.message).toContain('does not match this vault');
      }
    });

    it('validates and verifies snapshot containing authCheck canary', async () => {
      // Create backup to get snapshot with authCheck injected
      const backup = await createLocalBackup(testSnapshot, validMnemonic);
      expect(backup.snapshot.authCheck).toBeDefined();

      // Test with valid mnemonic
      const validRes = await validateDecryption(validMnemonic, backup.snapshot);
      expect(validRes.verifiedWith).toBe('authCheck');

      // Test with wrong mnemonic on snapshot with authCheck
      await expect(validateDecryption(wrongMnemonic, backup.snapshot)).rejects.toThrow(
        DecryptionValidationError
      );
    });
  });

  describe('Local Backup Creation', () => {
    it('creates a valid local backup JSON package when correct 12 words are entered', async () => {
      const result = await backupVault({
        destination: 'local',
        snapshot: testSnapshot,
        mnemonic: validMnemonic,
      });

      expect(result.destination).toBe('local');
      if (result.destination === 'local') {
        expect(result.filename).toMatch(/^mountain-vault-backup-vault_te-\d{4}-\d{2}-\d{2}/);
        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.blob.type).toBe('application/json');

        const parsed = JSON.parse(result.json);
        expect(parsed.format).toBe('mountain-vault');
        expect(parsed.vaultId).toBe(testSnapshot.vaultId);
        expect(parsed.items.length).toBe(2);
        expect(parsed.authCheck).toBeDefined();
      }
    });

    it('refuses to create local backup if 12 words are incorrect (Authorization Verification)', async () => {
      await expect(
        backupVault({
          destination: 'local',
          snapshot: testSnapshot,
          mnemonic: wrongMnemonic,
        })
      ).rejects.toThrow(DecryptionValidationError);
    });
  });

  describe('Local Backup Restoration', () => {
    it('restores vault successfully from raw JSON string with correct 12 words', async () => {
      const backup = await createLocalBackup(testSnapshot, validMnemonic);

      const restored = await restoreVault({
        source: 'local',
        backupData: backup.json,
        mnemonic: validMnemonic,
      });

      expect(restored.snapshot.vaultId).toBe(testSnapshot.vaultId);
      expect(restored.snapshot.items.length).toBe(2);
      expect(restored.key).toBeDefined();
    });

    it('restores vault successfully from a Blob with correct 12 words', async () => {
      const backup = await createLocalBackup(testSnapshot, validMnemonic);

      const restored = await restoreFromLocal(backup.blob, validMnemonic);
      expect(restored.snapshot.vaultId).toBe(testSnapshot.vaultId);
      expect(restored.snapshot.items.length).toBe(2);
    });

    it('strictly raises DecryptionValidationError right away when restoring with wrong 12 words', async () => {
      const backup = await createLocalBackup(testSnapshot, validMnemonic);

      await expect(
        restoreVault({
          source: 'local',
          backupData: backup.json,
          mnemonic: wrongMnemonic,
        })
      ).rejects.toThrow(DecryptionValidationError);

      try {
        await restoreVault({
          source: 'local',
          backupData: backup.json,
          mnemonic: wrongMnemonic,
        });
      } catch (err: any) {
        expect(err).toBeInstanceOf(DecryptionValidationError);
        expect(err.code).toBe('DECRYPTION_FAILED');
      }
    });

    it('rejects corrupt non-JSON file content with CORRUPT_BACKUP error', async () => {
      await expect(
        restoreFromLocal('not a json document at all {broken', validMnemonic)
      ).rejects.toThrow(DecryptionValidationError);
    });

    it('rejects JSON file with invalid schema (missing format or salt)', async () => {
      const invalidSchema = JSON.stringify({
        format: 'wrong-app',
        vaultId: '123',
      });

      await expect(restoreFromLocal(invalidSchema, validMnemonic)).rejects.toThrow(
        DecryptionValidationError
      );
    });

    it('rejects backup snapshot with salt shorter than 16 bytes', async () => {
      const shortSaltSnapshot = {
        ...testSnapshot,
        salt: 'c2hvcnQ=', // "short" (5 bytes)
      };

      await expect(
        restoreFromLocal(JSON.stringify(shortSaltSnapshot), validMnemonic)
      ).rejects.toThrow(DecryptionValidationError);
    });

    it('rejects backup snapshot with dangerously low kdfIterations (< 10,000)', async () => {
      const weakKdfSnapshot = {
        ...testSnapshot,
        kdfIterations: 500,
      };

      await expect(
        restoreFromLocal(JSON.stringify(weakKdfSnapshot), validMnemonic)
      ).rejects.toThrow(DecryptionValidationError);
    });

    it('rejects backup snapshot with dangerously high kdfIterations (> 2,500,000 DoS vector)', async () => {
      const dosKdfSnapshot = {
        ...testSnapshot,
        kdfIterations: 10_000_000,
      };

      await expect(
        restoreFromLocal(JSON.stringify(dosKdfSnapshot), validMnemonic)
      ).rejects.toThrow(DecryptionValidationError);
    });
  });

  describe('Vault Unlock Key Verification (Protection against incorrect password)', () => {
    let wrongKey: CryptoKey;

    beforeAll(async () => {
      const wrongBundle = await deriveVaultKey(wrongMnemonic, base64ToBytes(testSnapshot.salt), 10_000);
      wrongKey = wrongBundle.key;
    });

    it('returns true when valid key decrypts vault snapshot items', async () => {
      const isValid = await verifyVaultKey(masterKey, testSnapshot);
      expect(isValid).toBe(true);
    });

    it('returns false when incorrect key attempts to decrypt vault snapshot items', async () => {
      const isValid = await verifyVaultKey(wrongKey, testSnapshot);
      expect(isValid).toBe(false);
    });

    it('returns true when valid key decrypts authCheck canary payload', async () => {
      const authCheck = await createAuthCheckPayload(masterKey, testSnapshot.vaultId);
      const snapshotWithCanary: VaultSnapshot = {
        ...testSnapshot,
        authCheck,
        items: [], // Even with 0 items
      };

      const isValid = await verifyVaultKey(masterKey, snapshotWithCanary);
      expect(isValid).toBe(true);
    });

    it('returns false when incorrect key attempts to decrypt authCheck canary payload (prevents unlocking empty vault with wrong pass)', async () => {
      const authCheck = await createAuthCheckPayload(masterKey, testSnapshot.vaultId);
      const snapshotWithCanary: VaultSnapshot = {
        ...testSnapshot,
        authCheck,
        items: [],
      };

      const isValid = await verifyVaultKey(wrongKey, snapshotWithCanary);
      expect(isValid).toBe(false);
    });
  });
});

