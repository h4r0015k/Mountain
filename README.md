# Mountain

A free, local-first, open-source password manager. Encrypted client-side, optionally backed up to your personal Google Drive, and completely free of company-hosted databases.

🚀 **Live Web App**: [https://h4r0015k.github.io/Mountain/](https://h4r0015k.github.io/Mountain/)

---

## The Core Concept

Most password managers store your encrypted vault on corporate cloud servers. Mountain shifts total custody back to the user:

1. **Local-First Architecture:** Runs entirely as an origin-isolated Single Page Application (SPA) in your browser. All data is persisted locally in your browser's IndexedDB.
2. **Deterministic Master Identity (BIP-39):** Uses a standardized 12-word recovery phrase as the permanent root master key—eliminating weak or forgotten master passwords.
3. **Quick-Unlock PIN:** An optional local daily PIN unlocks a protected client envelope without exposing or re-entering your 12 recovery words on daily devices.
4. **User-Owned Backups:** Export encrypted `.json` backup files directly, or optionally sync snapshots to your personal Google Drive (`appDataFolder`) using client-side OAuth 2.0 PKCE. No intermediary servers ever touch your ciphertext.
5. **Zero Data Leakage:** Built-in offline favicon mode, customizable inactivity auto-lock (1m–60m), 30-second clipboard wipe, and zero analytics or telemetry scripts.
6. **Browser Companion Extension:** Manifest V3 extension with secure postMessage handshake (`window.location.origin` validation) for seamless autofill and credential capture.

---

## Roadmap & Progress

- [x] Concept & architecture planning
- [x] Initial post: [Building a Free Open-Source Password Manager](https://dev.to/h4r0015k/building-a-free-open-source-password-manager-1ol8)
- [x] Core cryptographic engine:
  - BIP-39 12-word mnemonic phrase generation & validation (`@scure/bip39`)
  - PBKDF2-HMAC-SHA256 key derivation (600,000 iterations for root key, 100,000 iterations for local PIN envelope)
  - AES-256-GCM authenticated encryption with unique 12-byte IVs per record
  - Secure in-memory TOTP two-factor code generator
- [x] Local vault storage (IndexedDB async storage layer with auth-check integrity canary)
- [x] Google Drive sync integration (Direct REST API client with hidden `appDataFolder` backup/restore)
- [x] UI / Web Application (React, Tailwind CSS, Lucide icons, responsive drawer navigation)
- [x] Security & privacy controls (Inactivity auto-lock, clipboard auto-clear, zero-leakage offline mode)
- [x] Mountain Companion Extension (Chrome / Edge / Brave MV3 extension with secure pairing)
- [ ] CSV import (Google Chrome, Bitwarden, 1Password formats)
- [ ] Vault recycle bin / soft-delete with undo

---

## Development & Testing

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
git clone https://github.com/h4r0015k/Mountain.git
cd Mountain
npm install
```

### Local Development Server
```bash
npm run dev
```

### Run Test Suite
```bash
npm test
```

### Production Build
```bash
npm run build
```

---

## Browser Companion Extension

The `companion-extension/` directory contains an unpacked Manifest V3 browser extension for Chromium browsers:

1. Open `chrome://extensions` in Chrome, Brave, or Edge.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `companion-extension` directory.
4. Connect to Mountain via the pairing modal under **Companion Pairing** in the vault dashboard.

---

## License

MIT
