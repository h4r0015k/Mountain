import { describe, it, expect, beforeAll } from "vitest";
import { deriveVaultKey, generateSalt } from "../src/crypto/kdf.js";
import { encryptVaultRecord, decryptVaultRecord } from "../src/crypto/vault.js";
import { VaultItem, VaultSnapshot, LoginFields, CardFields } from "../src/models/vault.js";

describe("Mountain Domain Models & Vault Lifecycle", () => {
  let masterKey: CryptoKey;
  let saltBase64: string;

  beforeAll(async () => {
    const salt = generateSalt();
    saltBase64 = Buffer.from(salt).toString("base64");
    const bundle = await deriveVaultKey("test-phrase-alpha-beta-gamma", salt, 10_000);
    masterKey = bundle.key;
  });

  it("constructs, encrypts, and serializes a complete VaultSnapshot", async () => {
    const loginSecret: LoginFields = {
      username: "h4r0015k",
      password: "P@ssw0rd2026!Protected",
      url: "https://github.com",
      totpSecret: "JBSWY3DPEHPK3PXP",
    };

    const cardSecret: CardFields = {
      cardholderName: "Nikhil Sahani",
      cardNumber: "4111222233334444",
      expirationDate: "12/28",
      cvv: "987",
    };

    const encryptedLogin = await encryptVaultRecord(loginSecret, masterKey);
    const encryptedCard = await encryptVaultRecord(cardSecret, masterKey);

    const vaultItem1: VaultItem = {
      id: "item_001",
      type: "LOGIN",
      title: "GitHub Personal",
      favorite: true,
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
      encryptedData: encryptedLogin,
    };

    const vaultItem2: VaultItem = {
      id: "item_002",
      type: "CARD",
      title: "Primary Debit Card",
      favorite: false,
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
      encryptedData: encryptedCard,
    };

    const snapshot: VaultSnapshot = {
      format: "mountain-vault",
      version: 1,
      vaultId: "vault_user_789",
      salt: saltBase64,
      kdfIterations: 600_000,
      items: [vaultItem1, vaultItem2],
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
    };

    // Serialize to JSON (simulating writing to file or IndexedDB)
    const jsonString = JSON.stringify(snapshot);

    // Assert plaintext secrets are NOT visible in raw serialized JSON
    expect(jsonString).not.toContain("P@ssw0rd2026!Protected");
    expect(jsonString).not.toContain("4111222233334444");
    expect(jsonString).not.toContain("987");

    // But metadata is preserved for fast unauthenticated UI listing
    expect(jsonString).toContain("GitHub Personal");
    expect(jsonString).toContain("Primary Debit Card");

    // Deserialize and decrypt
    const parsedSnapshot: VaultSnapshot = JSON.parse(jsonString);
    expect(parsedSnapshot.items.length).toBe(2);

    const decryptedLogin = await decryptVaultRecord<LoginFields>(
      parsedSnapshot.items[0].encryptedData,
      masterKey
    );
    expect(decryptedLogin.password).toBe("P@ssw0rd2026!Protected");
    expect(decryptedLogin.totpSecret).toBe("JBSWY3DPEHPK3PXP");

    const decryptedCard = await decryptVaultRecord<CardFields>(
      parsedSnapshot.items[1].encryptedData,
      masterKey
    );
    expect(decryptedCard.cardNumber).toBe("4111222233334444");
    expect(decryptedCard.cvv).toBe("987");
  });
});
