import { describe, it, expect, beforeAll } from "vitest";
import { deriveVaultKey, generateSalt } from "../src/crypto/kdf.js";
import { encryptVaultRecord, decryptVaultRecord, EncryptedVaultPayload } from "../src/crypto/vault.js";

describe("Mountain Vault Encryption (AES-256-GCM)", () => {
  let masterKey: CryptoKey;

  beforeAll(async () => {
    // Derive a test key (using 10k rounds for fast unit tests)
    const salt = generateSalt();
    const bundle = await deriveVaultKey("master-seed-phrase-phrase-alpha-beta-gamma", salt, 10_000);
    masterKey = bundle.key;
  });

  it("encrypts and successfully decrypts a structured vault credential record", async () => {
    const credential = {
      id: "vault_rec_001",
      site: "https://github.com",
      username: "h4r0015k",
      password: "SuperSecretPassword!2026",
      notes: "Work credentials",
      updatedAt: 1789700000000,
    };

    // 1. Encrypt
    const encrypted = await encryptVaultRecord(credential, masterKey);

    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.version).toBe(1);

    // Ciphertext must NOT contain plaintext password
    const rawCiphertext = Buffer.from(encrypted.ciphertext, "base64").toString();
    expect(rawCiphertext).not.toContain("SuperSecretPassword!2026");

    // 2. Decrypt
    const decrypted = await decryptVaultRecord<typeof credential>(encrypted, masterKey);

    expect(decrypted).toEqual(credential);
    expect(decrypted.password).toBe("SuperSecretPassword!2026");
  });

  it("generates a different IV and different ciphertext for identical records (Nonce Uniqueness)", async () => {
    const record = { secret: "constant-payload" };

    const enc1 = await encryptVaultRecord(record, masterKey);
    const enc2 = await encryptVaultRecord(record, masterKey);

    // IVs must be different
    expect(enc1.iv).not.toEqual(enc2.iv);
    // Ciphertexts must be completely different even with identical inputs
    expect(enc1.ciphertext).not.toEqual(enc2.ciphertext);

    // Both must decrypt to the identical original payload
    const dec1 = await decryptVaultRecord(enc1, masterKey);
    const dec2 = await decryptVaultRecord(enc2, masterKey);
    expect(dec1).toEqual(record);
    expect(dec2).toEqual(record);
  });

  it("fails decryption when ciphertext is tampered with (AEAD Tamper Detection)", async () => {
    const record = { bankAccount: "1234-5678", balance: 50000 };
    const encrypted = await encryptVaultRecord(record, masterKey);

    // Tamper: Flip bytes in the ciphertext (simulate malicious man-in-the-middle or DB tampering)
    const rawCiphertextBuffer = Buffer.from(encrypted.ciphertext, "base64");
    rawCiphertextBuffer[0] ^= 0xff; // Flip bits of the first byte
    const tamperedCiphertext = rawCiphertextBuffer.toString("base64");

    const tamperedPayload: EncryptedVaultPayload = {
      ...encrypted,
      ciphertext: tamperedCiphertext,
    };

    // WebCrypto MUST reject and throw OperationError (auth tag mismatch)
    await expect(decryptVaultRecord(tamperedPayload, masterKey)).rejects.toThrow();
  });

  it("fails decryption when an incorrect CryptoKey is provided", async () => {
    const record = { secret: "confidential-data" };
    const encrypted = await encryptVaultRecord(record, masterKey);

    // Derive a different key
    const differentSalt = generateSalt();
    const wrongBundle = await deriveVaultKey("wrong-seed-phrase", differentSalt, 10_000);
    const wrongKey = wrongBundle.key;

    // Decryption must reject
    await expect(decryptVaultRecord(encrypted, wrongKey)).rejects.toThrow();
  });

  it("binds additional authenticated data (AAD) and rejects when AAD differs", async () => {
    const record = { apiKey: "secret_api_key_12345" };
    const aad = new TextEncoder().encode("record-item-id-101:vault-id-456");
    const wrongAad = new TextEncoder().encode("record-item-id-999:vault-id-456");

    // Encrypt with AAD
    const encrypted = await encryptVaultRecord(record, masterKey, aad);

    // Decrypt with correct AAD -> Success
    const decrypted = await decryptVaultRecord<typeof record>(encrypted, masterKey, aad);
    expect(decrypted.apiKey).toBe("secret_api_key_12345");

    // Decrypt with incorrect or mismatched AAD -> Must reject (tamper detection)
    await expect(decryptVaultRecord(encrypted, masterKey, wrongAad)).rejects.toThrow();

    // Decrypt without AAD when AAD was bound -> Must reject
    await expect(decryptVaultRecord(encrypted, masterKey)).rejects.toThrow();
  });
});
