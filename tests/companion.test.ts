import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  getRootDomain,
  matchesDomainOrTitle,
} from "../src/companion/useCompanionBridge.js";

describe("Mountain Companion Bridge - Domain & Credential Matching", () => {
  describe("normalizeDomain", () => {
    it("normalizes clean URLs and protocol-less domains", () => {
      expect(normalizeDomain("https://dev.to")).toBe("dev.to");
      expect(normalizeDomain("http://dev.to")).toBe("dev.to");
      expect(normalizeDomain("dev.to")).toBe("dev.to");
      expect(normalizeDomain("www.dev.to")).toBe("dev.to");
      expect(normalizeDomain("https://www.dev.to")).toBe("dev.to");
    });

    it("strips paths, query parameters, and ports", () => {
      expect(normalizeDomain("https://dev.to/enter")).toBe("dev.to");
      expect(normalizeDomain("dev.to/enter?ref=home")).toBe("dev.to");
      expect(normalizeDomain("https://dev.to:443/dashboard")).toBe("dev.to");
    });

    it("trims whitespace robustly", () => {
      expect(normalizeDomain("  dev.to  ")).toBe("dev.to");
      expect(normalizeDomain(" https://dev.to/enter ")).toBe("dev.to");
      expect(normalizeDomain("\tdev.to\n")).toBe("dev.to");
    });

    it("returns empty string for empty input", () => {
      expect(normalizeDomain("")).toBe("");
      expect(normalizeDomain("   ")).toBe("");
    });
  });

  describe("getRootDomain", () => {
    it("extracts root brand correctly", () => {
      expect(getRootDomain("dev.to")).toBe("dev");
      expect(getRootDomain("https://dev.to")).toBe("dev");
      expect(getRootDomain("https://instagram.com")).toBe("instagram");
      expect(getRootDomain("auth.github.com")).toBe("github");
    });
  });

  describe("matchesDomainOrTitle for dev.to", () => {
    const targetDomain = "dev.to";

    it("matches exact full URL https://dev.to", () => {
      expect(matchesDomainOrTitle("https://dev.to", "Dev.to", targetDomain)).toBe(true);
    });

    it("matches bare domain without protocol dev.to", () => {
      expect(matchesDomainOrTitle("dev.to", "Dev.to", targetDomain)).toBe(true);
    });

    it("matches full URL with path https://dev.to/enter or /login", () => {
      expect(matchesDomainOrTitle("https://dev.to/enter", "DEV", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle("dev.to/login", "dev.to", targetDomain)).toBe(true);
    });

    it("matches URL with leading or trailing whitespace", () => {
      expect(matchesDomainOrTitle("  https://dev.to  ", "Dev.to", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle(" dev.to ", "Dev", targetDomain)).toBe(true);
    });

    it("matches subdomain variations e.g. community.dev.to", () => {
      expect(matchesDomainOrTitle("https://community.dev.to", "DEV Community", targetDomain)).toBe(true);
    });

    it("matches when URL is empty but title is dev.to or Dev.to", () => {
      expect(matchesDomainOrTitle("", "dev.to", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle("", "Dev.to", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle("", "DEV.TO", targetDomain)).toBe(true);
    });

    it("matches when URL is empty but title is DEV or DEV Community", () => {
      expect(matchesDomainOrTitle("", "DEV Community", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle("", "DEV", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle("", "Dev", targetDomain)).toBe(true);
    });

    it("matches punctuation-stripped title variations", () => {
      expect(matchesDomainOrTitle("", "devto", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle("", "dev to", targetDomain)).toBe(true);
      expect(matchesDomainOrTitle("", "Dev-to", targetDomain)).toBe(true);
    });

    it("rejects non-matching credentials", () => {
      expect(matchesDomainOrTitle("https://google.com", "Google Account", targetDomain)).toBe(false);
      expect(matchesDomainOrTitle("https://github.com", "GitHub", targetDomain)).toBe(false);
      expect(matchesDomainOrTitle("", "AWS Console", targetDomain)).toBe(false);
    });

    it("strictly isolates sibling subdomains and prevents cross-service credential leakage", () => {
      const wealthPayUrl = "https://dev-wealthpay.junomoney.org/";
      const adminCredUrl = "https://dev-admin.junomoney.org";
      const wealthPayCredUrl = "https://dev-wealthpay.junomoney.org";
      const rootCredUrl = "https://junomoney.org";

      // dev-admin.junomoney.org must NOT match dev-wealthpay.junomoney.org
      expect(matchesDomainOrTitle(adminCredUrl, "JunoMoney Admin", wealthPayUrl)).toBe(false);
      expect(matchesDomainOrTitle(adminCredUrl, "JunoMoney", "dev-wealthpay.junomoney.org")).toBe(false);

      // dev-wealthpay.junomoney.org matches exact domain
      expect(matchesDomainOrTitle(wealthPayCredUrl, "JunoMoney WealthPay", wealthPayUrl)).toBe(true);

      // Parent domain junomoney.org matches subdomains
      expect(matchesDomainOrTitle(rootCredUrl, "JunoMoney", wealthPayUrl)).toBe(true);
    });
  });
});
