import React, { useState } from 'react';
import { deriveVaultKey } from '../crypto/kdf.js';
import { base64ToBytes } from '../crypto/base64.js';
import { decryptVaultRecord } from '../crypto/vault.js';
import { VaultSnapshot } from '../models/vault.js';
import { verifyVaultKey } from '../backup/index.js';
import { Lock, AlertTriangle, ArrowRight, Loader2, Home } from 'lucide-react';

interface Props {
  snapshot: VaultSnapshot;
  onUnlocked: (key: CryptoKey, masterSecret: string) => void;
  onResetVault: () => void;
  onRestoreBackup?: () => void;
  onReturnToOverview?: () => void;
}

export const VaultUnlock: React.FC<Props> = ({
  snapshot,
  onUnlocked,
  onResetVault,
  onRestoreBackup,
  onReturnToOverview,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSecret = passphrase.trim();
    if (!cleanSecret) {
      setError('Please enter your recovery phrase or quick-unlock PIN.');
      return;
    }

    try {
      setIsUnlocking(true);
      setError(null);

      const saltBytes = base64ToBytes(snapshot.salt);

      // Strategy 1: Attempt direct derivation (e.g. 12 words or master passphrase)
      try {
        const keyBundle = await deriveVaultKey(
          cleanSecret,
          saltBytes,
          snapshot.kdfIterations || 600000
        );

        const isValid = await verifyVaultKey(keyBundle.key, snapshot);
        if (isValid) {
          onUnlocked(keyBundle.key, cleanSecret);
          return;
        }
      } catch {}

      // Strategy 2: If quickUnlock envelope exists, attempt PIN unlock
      if (snapshot.quickUnlock) {
        try {
          const pinSaltBytes = base64ToBytes(snapshot.quickUnlock.salt);
          const pinKeyBundle = await deriveVaultKey(
            cleanSecret,
            pinSaltBytes,
            snapshot.quickUnlock.kdfIterations
          );

          const envelope = await decryptVaultRecord<{ mnemonic: string }>(
            snapshot.quickUnlock.encryptedMnemonic,
            pinKeyBundle.key
          );

          if (envelope && envelope.mnemonic) {
            const masterKeyBundle = await deriveVaultKey(
              envelope.mnemonic,
              saltBytes,
              snapshot.kdfIterations || 600000
            );

            const isValid = await verifyVaultKey(masterKeyBundle.key, snapshot);
            if (isValid) {
              onUnlocked(masterKeyBundle.key, envelope.mnemonic);
              return;
            }
          }
        } catch {}
      }

      setError('Incorrect recovery phrase or quick-unlock PIN.');
    } catch (err: any) {
      setError(`Unlock failed: ${err.message}`);
    } finally {
      setIsUnlocking(false);
    }
  };

  const hasQuickUnlock = !!snapshot.quickUnlock;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-7 space-y-5 animate-fade-in">
        {onReturnToOverview && (
          <button
            type="button"
            onClick={onReturnToOverview}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition mb-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </button>
        )}

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
              placeholder={hasQuickUnlock ? "Quick-unlock PIN or 12 words" : "12-word recovery phrase"}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus-ring outline-none"
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

export default VaultUnlock;
