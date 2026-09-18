import { describe, it, expect } from "vitest";
import { generateMnemonic, validateMnemonic, mnemonicToMasterSeed } from "../src/crypto/mnemonic.js";

describe("Mountain BIP-39 Mnemonic Identity", () => {
  it("generates a valid 12-word mnemonic phrase by default", () => {
    const phrase = generateMnemonic(12);
    const words = phrase.split(" ");

    expect(words.length).toBe(12);
    expect(validateMnemonic(phrase)).toBe(true);
  });

  it("generates a valid 24-word mnemonic phrase when requested", () => {
    const phrase = generateMnemonic(24);
    const words = phrase.split(" ");

    expect(words.length).toBe(24);
    expect(validateMnemonic(phrase)).toBe(true);
  });

  it("generates unique mnemonics across multiple calls (CSPRNG Entropy)", () => {
    const phrase1 = generateMnemonic(12);
    const phrase2 = generateMnemonic(12);

    expect(phrase1).not.toEqual(phrase2);
  });

  it("rejects invalid words, wrong lengths, or corrupt checksums", () => {
    // 1. Invalid word not in 2048 dictionary
    expect(validateMnemonic("apple banana orange cherry bogusword galaxy mountain tiger ocean alpha beta gamma")).toBe(false);

    // 2. Too short (only 5 words)
    expect(validateMnemonic("abandon ability able about above")).toBe(false);

    // 3. Typo in checksum (changing one word breaks SHA-256 checksum)
    const validPhrase = generateMnemonic(12);
    const words = validPhrase.split(" ");
    words[words.length - 1] = words[words.length - 1] === "zoo" ? "zero" : "zoo";
    const corruptedPhrase = words.join(" ");

    expect(validateMnemonic(corruptedPhrase)).toBe(false);
  });

  it("deterministically converts a mnemonic into a 512-bit (64-byte) seed", async () => {
    // Standard test vector
    const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    
    expect(validateMnemonic(phrase)).toBe(true);

    const seed1 = await mnemonicToMasterSeed(phrase);
    const seed2 = await mnemonicToMasterSeed(phrase);

    expect(seed1.byteLength).toBe(64); // 512 bits = 64 bytes
    expect(seed1).toEqual(seed2); // Pure determinism
  });
});
