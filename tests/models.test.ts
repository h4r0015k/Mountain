import { describe, it, expect, beforeAll } from "vitest";
import { deriveVaultKey, generateSalt } from "../src/crypto/kdf.js";
import { encryptVaultRecord, decryptVaultRecord } from "../src/crypto/vault.js";
import { VaultItem, VaultSnapshot, LoginFields, CardFields } from "../src/models/vault.js";
import { extractDomain } from "../src/components/VaultDashboard.js";

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

  it("extracts clean domain names from URLs for dynamic favicon fetching", () => {
    expect(extractDomain("https://github.com/login")).toBe("github.com");
    expect(extractDomain("http://www.google.com/search?q=test")).toBe("google.com");
    expect(extractDomain("stripe.com/dashboard")).toBe("stripe.com");
    expect(extractDomain("https://sub.vault.bitwarden.com/")).toBe("sub.vault.bitwarden.com");
    expect(extractDomain("")).toBeNull();
    expect(extractDomain("not a url")).toBeNull();
  });

  it("constructs, encrypts, and decrypts API keys and Secure Notes", async () => {
    const apiKeySecret = {
      serviceName: "OpenAI Platform",
      apiKey: "sk-proj-test1234567890abcdef",
      apiSecret: "sec_key_sample987654321",
      endpointUrl: "https://api.openai.com/v1",
      notes: "Production key for AI services",
    };

    const noteSecret = {
      content: "## Secret Recovery Notes\nServer root password: XYZ",
    };

    const encApiKey = await encryptVaultRecord(apiKeySecret, masterKey);
    const encNote = await encryptVaultRecord(noteSecret, masterKey);

    const itemApiKey: VaultItem = {
      id: "item_api_01",
      type: "API_KEY",
      title: "OpenAI Production",
      favorite: false,
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
      encryptedData: encApiKey,
    };

    const itemNote: VaultItem = {
      id: "item_note_01",
      type: "SECURE_NOTE",
      title: "Server Credentials",
      favorite: true,
      createdAt: 1789700000000,
      updatedAt: 1789700000000,
      encryptedData: encNote,
    };

    const decApiKey = await decryptVaultRecord<typeof apiKeySecret>(itemApiKey.encryptedData, masterKey);
    expect(decApiKey.apiKey).toBe("sk-proj-test1234567890abcdef");
    expect(decApiKey.endpointUrl).toBe("https://api.openai.com/v1");
    expect(decApiKey.notes).toBe("Production key for AI services");

    const decNote = await decryptVaultRecord<typeof noteSecret>(itemNote.encryptedData, masterKey);
    expect(decNote.content).toContain("## Secret Recovery Notes");
  });

  it("evaluates password entropy and strength accurately", async () => {
    const { evaluatePasswordStrength } = await import("../src/crypto/strength.js");
    expect(evaluatePasswordStrength("").score).toBe(0);
    expect(evaluatePasswordStrength("123456").score).toBeLessThanOrEqual(1);
    expect(evaluatePasswordStrength("short").score).toBeLessThanOrEqual(1);
    expect(evaluatePasswordStrength("PassWord123").score).toBe(1); // Caught by dictionary prefix penalty
    expect(evaluatePasswordStrength("K9#mQ2$vL5!xR8").score).toBe(3);
    expect(evaluatePasswordStrength("P@ssw0rd2026!Protected").score).toBe(4);
  });

  it("creates and decrypts quickUnlock envelope using local PIN without breaking mnemonic root key", async () => {
    const mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const pin = "7890";
    const pinSalt = generateSalt(16);
    const pinKeyBundle = await deriveVaultKey(pin, pinSalt, 10_000);

    // Seal mnemonic into quickUnlock envelope
    const encryptedMnemonic = await encryptVaultRecord({ mnemonic }, pinKeyBundle.key);

    // Decrypt with correct PIN
    const envelope = await decryptVaultRecord<{ mnemonic: string }>(encryptedMnemonic, pinKeyBundle.key);
    expect(envelope.mnemonic).toBe(mnemonic);

    // Verify root vault key derived from decrypted mnemonic matches original
    const salt = generateSalt(16);
    const keyOriginal = await deriveVaultKey(mnemonic, salt, 10_000);
    const keyFromEnvelope = await deriveVaultKey(envelope.mnemonic, salt, 10_000);

    const testPayload = { secret: "mountain_token" };
    const encryptedWithOriginal = await encryptVaultRecord(testPayload, keyOriginal.key);
    const decryptedWithEnvelopeKey = await decryptVaultRecord<typeof testPayload>(encryptedWithOriginal, keyFromEnvelope.key);
    expect(decryptedWithEnvelopeKey.secret).toBe("mountain_token");
  });
});
