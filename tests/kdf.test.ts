import { describe, it, expect } from "vitest";
import { deriveVaultKey, generateSalt } from "../src/crypto/kdf.js";

describe("Mountain KDF (Key Derivation Function)", () => {
  it("generates a valid 16-byte random salt", () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    expect(salt1.byteLength).toBe(16);
    expect(salt2.byteLength).toBe(16);
    // Two CSPRNG calls must produce different random bytes
    expect(salt1).not.toEqual(salt2);
  });

  it("rejects empty passphrases or inadequate salt length", async () => {
    const validSalt = generateSalt();
    await expect(deriveVaultKey("", validSalt)).rejects.toThrow("Passphrase cannot be empty");

    const shortSalt = new Uint8Array(8); // Only 8 bytes
    await expect(deriveVaultKey("my-master-pass", shortSalt)).rejects.toThrow("Salt must be at least 16 bytes");
  });

  it("derives non-extractable keys by default (Defense-in-depth against in-memory extraction)", async () => {
    const passphrase = "mountain galaxy tiger abandon alpha beta";
    const salt = generateSalt();

    // Default derivation
    const bundle = await deriveVaultKey(passphrase, salt, 10_000);

    expect(bundle.key.algorithm.name).toBe("AES-GCM");
    expect(bundle.key.extractable).toBe(false);

    // Attempting to export raw key bytes must be rejected by the browser / WebCrypto runtime
    await expect(crypto.subtle.exportKey("raw", bundle.key)).rejects.toThrow();
  });

  it("derives an identical AES-GCM-256 key given the same passphrase and salt (Deterministic)", async () => {
    const passphrase = "mountain galaxy tiger abandon alpha beta";
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

    // Use 10,000 iterations in unit tests for fast execution and pass extractable: true for byte comparison
    const bundle1 = await deriveVaultKey(passphrase, salt, 10_000, true);
    const bundle2 = await deriveVaultKey(passphrase, salt, 10_000, true);

    // Export raw key bytes to verify exact equality
    const rawKey1 = await crypto.subtle.exportKey("raw", bundle1.key);
    const rawKey2 = await crypto.subtle.exportKey("raw", bundle2.key);

    expect(bundle1.key.algorithm.name).toBe("AES-GCM");
    expect(rawKey1.byteLength).toBe(32); // 256 bits = 32 bytes
    expect(new Uint8Array(rawKey1)).toEqual(new Uint8Array(rawKey2));
  });

  it("derives completely different keys when salts differ (Rainbow Table Protection)", async () => {
    const passphrase = "same-passphrase";
    const saltA = generateSalt();
    const saltB = generateSalt();

    const bundleA = await deriveVaultKey(passphrase, saltA, 10_000, true);
    const bundleB = await deriveVaultKey(passphrase, saltB, 10_000, true);

    const rawKeyA = await crypto.subtle.exportKey("raw", bundleA.key);
    const rawKeyB = await crypto.subtle.exportKey("raw", bundleB.key);

    expect(new Uint8Array(rawKeyA)).not.toEqual(new Uint8Array(rawKeyB));
  });
});
