# Mountain
A free, local-first open source password manager.

## The Core Concept
  Most password managers store your encrypted vault on their company servers. Mountain takes a different approach:
  1. **Local-First:** Runs as a Single Page Application (SPA) in your browser.
  2. **User-Owned Sync:** Encrypted backups live in your personal Google Drive—no third-party servers.
  3. **Mnemonic Key:** Uses a 12–24 word seed phrase as the master key instead of a weak password.
  4. **Quick PIN Unlock:** Once unlocked, use a fast PIN for short-term access.
  5. **AI Agent Ready:** Exploring permissioned credential access for autonomous AI agents.
    
## Roadmap & Progress
  - [x] Concept & architecture planning
  - [x] Initial post: [Building a Free Open-Source Password Manager](https://dev.to/h4r0015k/building-a-free-open-source-password-manager-1ol8)
  - [x] Core crypto module (BIP-39 mnemonic identity, PBKDF2 key derivation, AES-256-GCM authenticated encryption, CSPRNG generator)
  - [ ] Local vault storage (IndexedDB)
  - [ ] Google Drive sync integration
  - [ ] UI / Web App
