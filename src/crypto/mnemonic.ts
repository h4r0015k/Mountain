/**
 * Mountain Cryptographic Engine - BIP-39 Mnemonic Identity
 *
 * Implements BIP-39 standard mnemonic phrase generation and validation.
 * Uses Paul Miller's audited, zero-dependency `@scure/bip39` library with English wordlist.
 *
 * 12 words = 128 bits entropy + 4 bits checksum = 132 bits total.
 * 24 words = 256 bits entropy + 8 bits checksum = 264 bits total.
 */

import { generateMnemonic as scureGenerate, validateMnemonic as scureValidate, mnemonicToSeed as scureSeed } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export type MnemonicWordCount = 12 | 24;

/**
 * Generates a fresh, cryptographically secure 12-word or 24-word BIP-39 seed phrase.
 *
 * @param wordCount - 12 words (128-bit entropy) or 24 words (256-bit entropy). Defaults to 12.
 */
export function generateMnemonic(wordCount: MnemonicWordCount = 12): string {
  // 12 words requires 128 bits (16 bytes); 24 words requires 256 bits (32 bytes)
  const strength = wordCount === 12 ? 128 : 256;
  return scureGenerate(wordlist, strength);
}

/**
 * Validates whether a provided string is a mathematically valid BIP-39 mnemonic.
 * Verifies that:
 * 1. Word count is correct (12, 15, 18, 21, or 24 words).
 * 2. Every single word exists in the 2,048 English wordlist.
 * 3. The trailing SHA-256 checksum bits match (detects accidental user spelling errors).
 *
 * @param phrase - The space-delimited mnemonic phrase to validate
 */
export function validateMnemonic(phrase: string): boolean {
  if (!phrase || typeof phrase !== "string") {
    return false;
  }
  const cleanPhrase = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  return scureValidate(cleanPhrase, wordlist);
}

/**
 * Converts a verified 12-word or 24-word mnemonic into a 512-bit (64-byte) binary seed
 * using PBKDF2 with 2048 rounds and HMAC-SHA512 (BIP-39 standard specification).
 *
 * @param phrase - The valid BIP-39 phrase
 * @param passphrase - Optional extra user passphrase (BIP-39 salt extension)
 */
export async function mnemonicToMasterSeed(
  phrase: string,
  passphrase = ""
): Promise<Uint8Array> {
  const cleanPhrase = phrase.trim().toLowerCase().replace(/\s+/g, " ");
  if (!validateMnemonic(cleanPhrase)) {
    throw new Error("Cannot convert invalid mnemonic phrase to seed");
  }
  return scureSeed(cleanPhrase, passphrase);
}
