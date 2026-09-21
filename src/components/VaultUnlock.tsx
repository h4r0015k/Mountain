import React, { useState } from 'react';
import { deriveVaultKey } from '../crypto/kdf.js';
import { base64ToBytes } from '../crypto/base64.js';
import { VaultSnapshot } from '../models/vault.js';
import { Lock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  snapshot: VaultSnapshot;
  onUnlocked: (key: CryptoKey, masterSecret: string) => void;
  onResetVault: () => void;
  onRestoreBackup?: () => void;
}

export const VaultUnlock: React.FC<Props> = ({ snapshot, onUnlocked, onResetVault, onRestoreBackup }) => {
  const [passphrase, setPassphrase] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError('Please enter your master password or recovery phrase.');
      return;
    }

    try {
      setIsUnlocking(true);
      setError(null);

      const saltBytes = base64ToBytes(snapshot.salt);
      const keyBundle = await deriveVaultKey(
        passphrase.trim(),
        saltBytes,
        snapshot.kdfIterations || 600000
      );

      onUnlocked(keyBundle.key, passphrase.trim());
    } catch (err: any) {
      setError(`Unlock failed: ${err.message}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-7 space-y-5 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
            <Lock className="w-4 h-4" />
          </div>
          <h1 className="text-base font-semibold text-white">Vault is Locked</h1>
          <p className="text-xs text-zinc-400">
            {snapshot.items.length} {snapshot.items.length === 1 ? 'credential' : 'credentials'} stored
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/70 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-3.5">
          <div className="space-y-1.5">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Master password or 12 words"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus-ring"
            />
          </div>

          <button
            type="submit"
            disabled={isUnlocking || !passphrase.trim()}
            className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            {isUnlocking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Unlocking...</span>
              </>
            ) : (
              <>
                <span>Unlock Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          {onRestoreBackup ? (
            <button
              type="button"
              onClick={onRestoreBackup}
              className="hover:text-zinc-200 transition underline-offset-4 hover:underline"
            >
              Restore from Backup
            </button>
          ) : (
            <span>Trouble unlocking?</span>
          )}
          {!showConfirmReset ? (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="hover:text-rose-400 transition"
            >
              Reset
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onResetVault}
                className="px-2.5 py-1 bg-rose-950 border border-rose-800/80 hover:bg-rose-900 text-rose-300 rounded-lg text-xs font-medium transition"
              >
                Confirm Wipe
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs"
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
