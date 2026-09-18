/**
 * Mountain Cryptographic Engine - Strong Password & Passphrase Generator
 *
 * Implements CSPRNG-backed password generation with unbiased rejection sampling.
 * Guarantees cryptographic randomness via crypto.getRandomValues().
 */

export interface GeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  avoidAmbiguous?: boolean; // Exclude O, 0, l, 1, I to prevent visual confusion
}

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const AMBIGUOUS_CHARS = new Set(["O", "0", "l", "1", "I"]);

/**
 * Returns a cryptographically unbiased random integer in the range [0, max - 1]
 * Uses CSPRNG rejection sampling to eliminate modulo bias.
 */
function getRandomInt(max: number): number {
  if (max <= 0) throw new Error("Max must be positive");
  if (max === 1) return 0;

  // Find the largest multiple of max that fits in 32-bit unsigned int
  const limit = Math.floor(0xffffffff / max) * max;
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const candidate = buffer[0];
    if (candidate < limit) {
      return candidate % max;
    }
    // Rejection: if candidate >= limit, sample again to avoid modulo bias
  }
}

/**
 * Generates a strong, cryptographically secure password based on specified criteria.
 *
 * @param options - Configuration options for character sets and length
 */
export function generatePassword(options: GeneratorOptions = {}): string {
  const {
    length = 20,
    uppercase = true,
    lowercase = true,
    digits = true,
    symbols = true,
    avoidAmbiguous = false,
  } = options;

  if (length < 4) {
    throw new Error("Password length must be at least 4 characters");
  }

  // Filter character sets based on options
  const filterSet = (set: string) =>
    avoidAmbiguous ? set.split("").filter((c) => !AMBIGUOUS_CHARS.has(c)).join("") : set;

  const categories: string[] = [];
  if (uppercase) categories.push(filterSet(CHAR_SETS.uppercase));
  if (lowercase) categories.push(filterSet(CHAR_SETS.lowercase));
  if (digits) categories.push(filterSet(CHAR_SETS.digits));
  if (symbols) categories.push(filterSet(CHAR_SETS.symbols));

  if (categories.length === 0) {
    throw new Error("At least one character set must be enabled");
  }

  // Combine enabled characters into a pool
  const allChars = categories.join("");
  const passwordChars: string[] = [];

  // Invariant: Guarantee at least one character from each enabled category
  for (const category of categories) {
    const idx = getRandomInt(category.length);
    passwordChars.push(category[idx]);
  }

  // Fill the remainder of the password length from the complete pool
  while (passwordChars.length < length) {
    const idx = getRandomInt(allChars.length);
    passwordChars.push(allChars[idx]);
  }

  // Fisher-Yates shuffle using CSPRNG so guaranteed characters aren't always in first positions
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join("");
}
