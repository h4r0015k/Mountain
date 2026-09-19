import React, { useState } from 'react';
import { deriveVaultKey } from '../crypto/kdf.js';
import { VaultSnapshot } from '../models/vault.js';
import { Lock, AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  snapshot: VaultSnapshot;
  onUnlocked: (key: CryptoKey, masterSecret: string) => void;
  onResetVault: () => void;
}

export const VaultUnlock: React.FC<Props> = ({ snapshot, onUnlocked, onResetVault }) => {
  const [passphrase, setPassphrase] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError('Please enter your passphrase or recovery words.');
      return;
    }

    try {
      setIsUnlocking(true);
      setError(null);

      const cryptoKey = await deriveVaultKey(
        passphrase.trim(),
        snapshot.salt,
        snapshot.iterations
      );

      onUnlocked(cryptoKey, passphrase.trim());
    } catch (err: any) {
      setError(`Unlock failed: ${err.message}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#08090c] text-zinc-100">
      <div className="w-full max-w-sm bg-[#0f1015] border border-neutral-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 glow-subtle">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-900 border border-neutral-800 flex items-center justify-center text-zinc-300">
            <Lock className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">Vault is Locked</h1>
          <p className="text-[11px] font-mono text-zinc-500">
            ID: {snapshot.vaultId.slice(0, 8)} · {snapshot.items.length} records
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Master password or 12 words"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-[#0a0b0e] border border-neutral-800 focus:border-zinc-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isUnlocking}
            className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <span>{isUnlocking ? 'Verifying PBKDF2...' : 'Unlock'}</span>
            {!isUnlocking && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Trouble unlocking?</span>
          {!showConfirmReset ? (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="text-zinc-400 hover:text-rose-400 transition"
            >
              Reset
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={onResetVault}
                className="px-2 py-0.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[10px] font-medium transition"
              >
                Confirm Wipe
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="text-zinc-500 hover:text-zinc-300 text-[10px]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
