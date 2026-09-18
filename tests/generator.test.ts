import { describe, it, expect } from "vitest";
import { generatePassword } from "../src/crypto/generator.js";

describe("Mountain Password Generator (CSPRNG)", () => {
  it("generates a password of the requested length", () => {
    const pass16 = generatePassword({ length: 16 });
    const pass32 = generatePassword({ length: 32 });

    expect(pass16.length).toBe(16);
    expect(pass32.length).toBe(32);
  });

  it("guarantees at least one character from each enabled category", () => {
    // Generate 50 passwords and assert each satisfies all constraints
    for (let i = 0; i < 50; i++) {
      const pass = generatePassword({
        length: 20,
        uppercase: true,
        lowercase: true,
        digits: true,
        symbols: true,
      });

      expect(/[A-Z]/.test(pass)).toBe(true);
      expect(/[a-z]/.test(pass)).toBe(true);
      expect(/[0-9]/.test(pass)).toBe(true);
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pass)).toBe(true);
    }
  });

  it("respects exclusion of ambiguous characters (O, 0, l, 1, I)", () => {
    for (let i = 0; i < 50; i++) {
      const pass = generatePassword({
        length: 30,
        avoidAmbiguous: true,
      });

      expect(pass).not.toMatch(/[O0l1I]/);
    }
  });

  it("generates unique passwords across multiple invocations (CSPRNG Uniqueness)", () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generatePassword({ length: 20 }));
    }

    // All 100 generated passwords must be completely unique
    expect(passwords.size).toBe(100);
  });

  it("rejects invalid options (length < 4 or zero categories enabled)", () => {
    expect(() => generatePassword({ length: 3 })).toThrow("Password length must be at least 4");
    expect(() =>
      generatePassword({
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
      })
    ).toThrow("At least one character set must be enabled");
  });
});
