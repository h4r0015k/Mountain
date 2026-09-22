# 🏔️ Mountain Vault Companion Extension

A lightweight, zero-knowledge browser companion bridge for **Mountain Password Manager**.

It bridges directly to your unlocked Mountain SPA tab (`http://localhost:5173`), enabling:
* **Native Context Menu Autofill**: Right-click on any username or password field &rarr; `Mountain Vault` &rarr; `Auto-fill Login`.
* **Instant Keyboard Shortcut (`Cmd+Shift+L` / `Ctrl+Shift+L`)**: Autofill matching credentials instantly.
* **In-Field Password Generator**: Right-click &rarr; `Generate & Fill Strong Password` to generate high-entropy passwords and copy to clipboard.
* **Zero-Knowledge Security**: Encryption keys and master credentials **never leave your Mountain SPA memory**. The extension acts solely as an autofill bridge to your active session.

---

## 🚀 How to Load in Chrome / Brave / Edge

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** (top-left).
4. Select the `companion-extension` directory:
   ```
   /home/turbo/tmp/cb/Mountain/companion-extension
   ```

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│ Target Website (e.g. Instagram) │
│ • Native Context Menu listener  │
│ • Keyboard Shortcut (Cmd+Shift+L)│
│ • React-compatible Input Setter │
└───────────────▲─────────────────┘
                │ chrome.runtime.sendMessage
┌───────────────▼─────────────────┐
│ Mountain Extension (Background) │
│ • Routes domain queries         │
│ • Dispatches fills to activeTab │
└───────────────▲─────────────────┘
                │ window.postMessage (via spa-bridge.js)
┌───────────────▼─────────────────┐
│ Mountain SPA (localhost:5173)   │
│ • useCompanionBridge hook       │
│ • In-Memory Master Key & Items  │
└─────────────────────────────────┘
```
