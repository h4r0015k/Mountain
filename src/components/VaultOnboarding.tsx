import React, { useState } from 'react';
import { generateMnemonic, validateMnemonic } from '../crypto/mnemonic.js';
import { deriveVaultKey, generateSalt } from '../crypto/kdf.js';
import { saveVaultSnapshot } from '../storage/indexeddb.js';
import { VaultSnapshot } from '../models/vault.js';
import { Copy, Check, ArrowRight, AlertTriangle, RefreshCw, KeyRound, DownloadCloud, Sparkles } from 'lucide-react';

interface Props {
  onVaultReady: (key: CryptoKey, snapshot: VaultSnapshot, masterSecret: string) => void;
}

export const VaultOnboarding: React.FC<Props> = ({ onVaultReady }) => {
  const [mode, setMode] = useState<'choice' | 'create' | 'restore'>('choice');
  const [mnemonic, setMnemonic] = useState(() => generateMnemonic(12));
  const [copied, setCopied] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [restoreWords, setRestoreWords] = useState('');
  const [pinPassword, setPinPassword] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopyMnemonic = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateMnemonic = () => {
    setMnemonic(generateMnemonic(12));
    setHasBackedUp(false);
    setCopied(false);
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasBackedUp) {
      setError('Please confirm that you have saved your 12 recovery words securely.');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      const secretToDeriveFrom = pinPassword.trim() || mnemonic;
      const salt = generateSalt(16);
      const cryptoKey = await deriveVaultKey(secretToDeriveFrom, salt, 600000);

      const vaultId = crypto.randomUUID();
      const newSnapshot: VaultSnapshot = {
        vaultId,
        version: 1,
        salt,
        iterations: 600000,
        updatedAt: Date.now(),
        items: [],
      };

      await saveVaultSnapshot(newSnapshot);
      onVaultReady(cryptoKey, newSnapshot, secretToDeriveFrom);
    } catch (err: any) {
      setError(`Failed to initialize: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRestoreVault = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWords = restoreWords.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!validateMnemonic(cleanWords)) {
      setError('Invalid BIP-39 mnemonic phrase. Please verify word spellings and order.');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      const secretToDeriveFrom = pinPassword.trim() || cleanWords;
      const salt = generateSalt(16);
      const cryptoKey = await deriveVaultKey(secretToDeriveFrom, salt, 600000);

      const vaultId = crypto.randomUUID();
      const restoredSnapshot: VaultSnapshot = {
        vaultId,
        version: 1,
        salt,
        iterations: 600000,
        updatedAt: Date.now(),
        items: [],
      };

      await saveVaultSnapshot(restoredSnapshot);
      onVaultReady(cryptoKey, restoredSnapshot, secretToDeriveFrom);
    } catch (err: any) {
      setError(`Failed to restore: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#08090c] text-zinc-100">
      <div className="w-full max-w-md bg-[#0f1015] border border-neutral-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 glow-subtle">
        
        {/* Brand Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-black flex items-center justify-center font-black text-sm tracking-tighter shadow-md">
                ▲
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">Mountain</span>
            </div>
            <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
              Local Vault
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-normal leading-relaxed">
            Zero-knowledge, hardware-grade local password manager. No cloud required.
          </p>
        </div>

        <div className="h-[1px] bg-neutral-800/60" />

        {error && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* STEP 1: CHOICE SCREEN */}
        {mode === 'choice' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full p-4 bg-[#14161d] hover:bg-[#1a1c24] border border-neutral-800 hover:border-neutral-600 rounded-xl transition text-left group flex items-center justify-between"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-zinc-900 border border-neutral-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-zinc-100">Create New Vault</div>
                  <div className="text-[11px] text-zinc-400">Generate a 12-word cryptographic seed</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => setMode('restore')}
              className="w-full p-4 bg-[#14161d] hover:bg-[#1a1c24] border border-neutral-800 hover:border-neutral-600 rounded-xl transition text-left group flex items-center justify-between"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-zinc-900 border border-neutral-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                  <DownloadCloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-zinc-100">Restore from Words</div>
                  <div className="text-[11px] text-zinc-400">Import existing 12 or 24-word recovery phrase</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* STEP 2A: CREATE NEW VAULT */}
        {mode === 'create' && (
          <form onSubmit={handleCreateVault} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Secret Recovery Phrase
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleRegenerateMnemonic}
                    title="Generate new words"
                    className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMnemonic}
                    className="flex items-center space-x-1 text-[11px] font-medium py-1 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Hardware wallet style word grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2.5 bg-[#0a0b0e] border border-neutral-800 rounded-xl font-mono text-xs">
                {mnemonic.split(' ').map((word, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 py-1.5 px-2 bg-[#12141a] rounded-lg border border-neutral-800/60"
                  >
                    <span className="text-zinc-600 select-none text-[10px] w-3.5 text-right font-mono">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-100 font-medium tracking-tight truncate">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick PIN or Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex justify-between">
                <span>Unlock Passphrase</span>
                <span className="text-zinc-600 font-sans normal-case">Optional</span>
              </label>
              <input
                type="password"
                value={pinPassword}
                onChange={(e) => setPinPassword(e.target.value)}
                placeholder="Password or PIN for daily access"
                className="w-full px-3.5 py-2.5 bg-[#0a0b0e] border border-neutral-800 focus:border-zinc-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none transition font-sans"
              />
            </div>

            {/* Acknowledgment */}
            <label className="flex items-start space-x-2.5 p-3 bg-zinc-900/60 border border-neutral-800/80 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasBackedUp}
                onChange={(e) => setHasBackedUp(e.target.checked)}
                className="mt-0.5 rounded accent-zinc-200"
              />
              <span className="text-[11px] text-zinc-400 leading-relaxed">
                I have written down these 12 words. If I lose them, my data is permanently unrecoverable.
              </span>
            </label>

            <div className="flex space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="py-2.5 px-4 bg-[#14161d] hover:bg-[#1a1c24] text-zinc-300 font-medium rounded-xl text-xs transition border border-neutral-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isInitializing || !hasBackedUp}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40 disabled:pointer-events-none"
              >
                {isInitializing ? 'Deriving Keys (600k PBKDF2)...' : 'Initialize Vault'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2B: RESTORE VAULT */}
        {mode === 'restore' && (
          <form onSubmit={handleRestoreVault} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                12 or 24 Recovery Words
              </label>
              <textarea
                rows={3}
                value={restoreWords}
                onChange={(e) => setRestoreWords(e.target.value)}
                placeholder="Enter words separated by space..."
                className="w-full p-3 bg-[#0a0b0e] border border-neutral-800 focus:border-zinc-500 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-700 outline-none transition resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Daily Password / PIN (Optional)
              </label>
              <input
                type="password"
                value={pinPassword}
                onChange={(e) => setPinPassword(e.target.value)}
                placeholder="Passphrase or PIN"
                className="w-full px-3.5 py-2.5 bg-[#0a0b0e] border border-neutral-800 focus:border-zinc-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none transition"
              />
            </div>

            <div className="flex space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="py-2.5 px-4 bg-[#14161d] hover:bg-[#1a1c24] text-zinc-300 font-medium rounded-xl text-xs transition border border-neutral-800"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isInitializing}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40"
              >
                {isInitializing ? 'Decrypting Vault...' : 'Unlock & Restore'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
