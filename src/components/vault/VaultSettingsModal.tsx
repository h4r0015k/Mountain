import React from 'react';
import { VaultSnapshot } from '../../models/vault.js';
import { AutoLockTimeout } from '../../hooks/useAutoLock.js';
import {
  X,
  Shield,
  Clock,
  Lock,
  Copy,
  Check,
  EyeOff,
  Database,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  timeoutMinutes: AutoLockTimeout;
  onTimeoutChange: (val: AutoLockTimeout) => void;
  allowFavicons: boolean;
  onToggleFavicons: (val: boolean) => void;
  snapshot: VaultSnapshot;
  onShowToast: (msg: string) => void;
}

export const VaultSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  timeoutMinutes,
  onTimeoutChange,
  allowFavicons,
  onToggleFavicons,
  snapshot,
  onShowToast,
}) => {
  const [copiedVaultId, setCopiedVaultId] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyVaultId = async () => {
    try {
      await navigator.clipboard.writeText(snapshot.vaultId);
      setCopiedVaultId(true);
      onShowToast('Vault ID copied');
      setTimeout(() => setCopiedVaultId(false), 2000);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 id="settings-title" className="text-sm sm:text-base font-semibold text-white">
                Vault Settings & Privacy
              </h2>
              <p className="text-xs text-zinc-400">Configure client security, timeouts, and privacy limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus-ring"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Security & Auto-Lock */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Inactivity & Session Protection</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-zinc-200">Auto-Lock Inactivity Timer</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Automatically lock your vault when you step away or background the tab.
                  </p>
                </div>

                <select
                  aria-label="Select auto-lock timeout"
                  value={timeoutMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) as AutoLockTimeout;
                    onTimeoutChange(val);
                    onShowToast(val === 0 ? 'Auto-lock disabled' : `Auto-lock set to ${val}m`);
                  }}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-700/80 rounded-lg text-xs text-zinc-100 font-medium outline-none focus-ring cursor-pointer shrink-0"
                >
                  <option value={1} className="bg-zinc-900 text-zinc-100">1 minute</option>
                  <option value={5} className="bg-zinc-900 text-zinc-100">5 minutes</option>
                  <option value={15} className="bg-zinc-900 text-zinc-100">15 minutes (Default)</option>
                  <option value={30} className="bg-zinc-900 text-zinc-100">30 minutes</option>
                  <option value={60} className="bg-zinc-900 text-zinc-100">1 hour</option>
                  <option value={0} className="bg-zinc-900 text-zinc-100">Disabled (Never)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span>Clipboard Auto-Clear:</span>
                <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-600/30">
                  Active (30 seconds)
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Privacy & Zero-Leakage Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>Privacy & Domain Isolation</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                    <span>Zero-Leakage Offline Icons</span>
                    {!allowFavicons && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {!allowFavicons
                      ? 'Strict mode enabled: All website badges are computed offline on your device. Zero domain queries are sent to Google or external favicon servers.'
                      : 'Online mode enabled: Website icons are retrieved from Google Favicon Service. Outbound HTTP requests include your saved website domain names.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !allowFavicons;
                    onToggleFavicons(next);
                    onShowToast(next ? 'Online favicons enabled' : 'Zero-leakage mode active (No outbound calls)');
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 focus-ring ${
                    !allowFavicons ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`}
                  role="switch"
                  aria-checked={!allowFavicons}
                  title={!allowFavicons ? 'Disable zero-leakage mode' : 'Enable zero-leakage mode'}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      !allowFavicons ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Cryptographic Architecture & Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span>Cryptographic Diagnostics</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Payload Cipher:</span>
                <span className="font-mono text-zinc-200">AES-256-GCM (NIST SP 800-38D)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Key Derivation:</span>
                <span className="font-mono text-zinc-200">PBKDF2-HMAC-SHA256 (600,000 rounds)</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Root Identity:</span>
                <span className="font-mono text-zinc-200">12-Word BIP-39 Seed</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Quick-Unlock PIN:</span>
                <span className={`font-mono ${snapshot.quickUnlock ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {snapshot.quickUnlock ? 'Configured (Enveloped)' : 'None (12 words only)'}
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-zinc-400">
                <span>Vault ID:</span>
                <button
                  type="button"
                  onClick={handleCopyVaultId}
                  className="font-mono text-[11px] text-zinc-300 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 transition"
                  title="Copy full Vault ID"
                >
                  <span>{snapshot.vaultId.slice(0, 16)}...</span>
                  {copiedVaultId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-zinc-500" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition shadow-sm focus-ring"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
