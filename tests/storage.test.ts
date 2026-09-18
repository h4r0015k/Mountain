import { describe, it, expect, beforeAll } from "vitest";
import "fake-indexeddb/auto"; // Polyfills global indexedDB for Node.js testing
import { saveVaultSnapshot, loadVaultSnapshot, deleteVaultSnapshot } from "../src/storage/indexeddb.js";
import { VaultSnapshot } from "../src/models/vault.js";

describe("Mountain IndexedDB Local Storage Adapter", () => {
  const mockSnapshot: VaultSnapshot = {
    format: "mountain-vault",
    version: 1,
    vaultId: "vault_alpha_123",
    salt: "dGVzdC1zYWx0LTE2LWJ5dGVzIQ==",
    kdfIterations: 600_000,
    items: [
      {
        id: "item_001",
        type: "LOGIN",
        title: "AWS Root Account",
        favorite: true,
        createdAt: 1789700000000,
        updatedAt: 1789700000000,
        encryptedData: {
          iv: "bW9jay1pdi0xMi1ieXRl",
          ciphertext: "ZW5jcnlwdGVkLWF3cy1kYXRhLW1vY2s=",
          version: 1,
        },
      },
    ],
    createdAt: 1789700000000,
    updatedAt: 1789700000000,
  };

  it("returns null when loading a non-existent vaultId", async () => {
    const loaded = await loadVaultSnapshot("non_existent_vault");
    expect(loaded).toBeNull();
  });

  it("saves a snapshot to IndexedDB and loads it back with complete integrity", async () => {
    await saveVaultSnapshot(mockSnapshot);

    const loaded = await loadVaultSnapshot("vault_alpha_123");

    expect(loaded).not.toBeNull();
    expect(loaded?.vaultId).toBe("vault_alpha_123");
    expect(loaded?.format).toBe("mountain-vault");
    expect(loaded?.items.length).toBe(1);
    expect(loaded?.items[0].title).toBe("AWS Root Account");
    expect(loaded?.items[0].encryptedData.ciphertext).toBe("ZW5jcnlwdGVkLWF3cy1kYXRhLW1vY2s=");
  });

  it("overwrites an existing snapshot when saving an updated version", async () => {
    const updatedSnapshot: VaultSnapshot = {
      ...mockSnapshot,
      updatedAt: 1789700050000,
      items: [
        ...mockSnapshot.items,
        {
          id: "item_002",
          type: "SECURE_NOTE",
          title: "Recovery Codes",
          favorite: false,
          createdAt: 1789700050000,
          updatedAt: 1789700050000,
          encryptedData: {
            iv: "bmV3LWl2LTEyLWJ5dGVz",
            ciphertext: "bmV3LWVuY3J5cHRlZC1ub3Rl",
            version: 1,
          },
        },
      ],
    };

    await saveVaultSnapshot(updatedSnapshot);

    const loaded = await loadVaultSnapshot("vault_alpha_123");
    expect(loaded?.items.length).toBe(2);
    expect(loaded?.updatedAt).toBe(1789700050000);
  });

  it("permanently deletes a snapshot from IndexedDB", async () => {
    await deleteVaultSnapshot("vault_alpha_123");

    const loaded = await loadVaultSnapshot("vault_alpha_123");
    expect(loaded).toBeNull();
  });
});
