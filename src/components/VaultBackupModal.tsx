import React, { useState, useEffect } from 'react';
import { VaultSnapshot } from '../models/vault.js';
import {
  backupVault,
  triggerLocalDownload,
  DecryptionValidationError,
} from '../backup/index.js';
import {
  HardDrive,
  Cloud,
  DownloadCloud,
  Lock,
  Check,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { GoogleOAuthHelpGuide } from './vault/GoogleOAuthHelpGuide.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  snapshot: VaultSnapshot;
  onBackupSuccess?: (timestamp: number) => void;
}

export const VaultBackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  snapshot,
  onBackupSuccess,
}) => {
  const [destination, setDestination] = useState<'select' | 'local' | 'gdrive'>('select');
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Google Drive state
  const [gdriveToken, setGdriveToken] = useState(() => {
    try {
      return sessionStorage.getItem('mountain_gdrive_token') || '';
    } catch {
      return '';
    }
  });

  const handleReset = () => {
    setDestination('select');
    setMnemonic('');
    setError(null);
    setSuccessMessage(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTokenChange = (val: string) => {
    setGdriveToken(val);
    try {
      sessionStorage.setItem('mountain_gdrive_token', val);
    } catch {}
  };

  if (!isOpen) return null;

  const wordCount = mnemonic.trim() ? mnemonic.trim().split(/\s+/).length : 0;

  // ------------------ LOCAL BACKUP ------------------

  const handleCreateLocalBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWords = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleanWords) {
      setError('Please enter your 12-word recovery phrase.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const result = await backupVault({
        destination: 'local',
        snapshot,
        mnemonic: cleanWords,
      });

      if (result.destination === 'local') {
        triggerLocalDownload(result);
        setSuccessMessage(`Backup successfully downloaded as ${result.filename}`);
        onBackupSuccess?.(Date.now());
      }
    } catch (err: any) {
      if (err instanceof DecryptionValidationError) {
        setError(err.message);
      } else {
        setError(`Backup failed: ${err.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ------------------ GOOGLE DRIVE BACKUP ------------------

  const handleCreateGoogleDriveBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gdriveToken.trim()) {
      setError('Please enter your Google OAuth access token.');
      return;
    }

    const cleanWords = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleanWords) {
      setError('Please enter your 12-word recovery phrase.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const result = await backupVault({
        destination: 'google_drive',
        snapshot,
        mnemonic: cleanWords,
        accessToken: gdriveToken.trim(),
        folder: 'appDataFolder',
      });

      if (result.destination === 'google_drive') {
        setSuccessMessage(
          `Backup successfully uploaded to Google Drive as ${result.fileName}`
        );
        onBackupSuccess?.(Date.now());
      }
    } catch (err: any) {
      if (err instanceof DecryptionValidationError) {
        setError(err.message);
      } else {
        setError(`Google Drive backup failed: ${err.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b border-zinc-800 shrink-0 bg-zinc-900">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-100">
              <DownloadCloud className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 id="backup-modal-title" className="text-sm font-semibold text-zinc-100">
                Backup Vault
              </h2>
              <p className="text-xs text-zinc-400">
                {snapshot.items.length} {snapshot.items.length === 1 ? 'item' : 'items'} · Vault {snapshot.vaultId.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition focus-ring"
            aria-label="Close backup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

        {/* Success State */}
        {successMessage ? (
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-100">Backup Complete</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                {successMessage}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-md tactile-btn focus-ring"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: DESTINATION SELECTION */}
            {destination === 'select' && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-300">
                  Select destination to export your encrypted vault backup:
                </p>

                {/* Local Backup Option */}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDestination('local');
                  }}
                  className="w-full p-4 bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition text-left group flex items-center justify-between focus-ring"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-100 group-hover:text-white flex items-center gap-2">
                        <span>Local Backup File</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          Recommended
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        Download encrypted .json backup file directly to your local device
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                      Local
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition" />
                  </div>
                </button>

                {/* Google Drive Option */}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDestination('gdrive');
                  }}
                  className="w-full p-4 bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition text-left group flex items-center justify-between focus-ring"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-100 group-hover:text-white">
                        Google Drive
                      </div>
                      <div className="text-xs text-zinc-400">
                        Save encrypted backup snapshot into Google Drive app storage
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                      Cloud
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition" />
                  </div>
                </button>
              </div>
            )}

            {/* STEP 2A: LOCAL BACKUP FORM */}
            {destination === 'local' && (
              <form onSubmit={handleCreateLocalBackup} className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-100">Local File Backup</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                  >
                    Change Destination
                  </button>
                </div>

                <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic Verification Gate</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Enter your 12 recovery words to verify you can decrypt this vault before creating the backup.
                  </p>
                </div>

                {/* 12 Recovery Words Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">
                      12 Recovery Words
                    </label>
                    <span
                      className={`text-xs font-mono ${
                        wordCount === 12 ? 'text-emerald-400 font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      {wordCount === 12 ? '12 / 12 words ✓' : `${wordCount} / 12 words`}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    placeholder="Enter the 12 words separated by spaces..."
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none transition resize-none"
                  />
                </div>

                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center justify-center gap-1.5 focus-ring"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !mnemonic.trim()}
                    className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 focus-ring"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Verify & Download Backup</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2B: GOOGLE DRIVE BACKUP FORM */}
            {destination === 'gdrive' && (
              <form onSubmit={handleCreateGoogleDriveBackup} className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-100">Google Drive Backup</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                  >
                    Change Destination
                  </button>
                </div>

                {/* Google OAuth Token Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">
                      Google OAuth Access Token <span className="text-[10px] font-mono text-zinc-500">(Direct API)</span>
                    </label>
                    <a
                      href="https://developers.google.com/oauthplayground/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline focus-ring rounded"
                    >
                      <span>OAuth Playground</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <input
                    type="password"
                    value={gdriveToken}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    placeholder="ya29.a0..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none transition"
                  />

                  {/* Collapsible How-To Guide */}
                  <GoogleOAuthHelpGuide />
                </div>

                {/* 12 Recovery Words Input */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">
                      12 Recovery Words
                    </label>
                    <span
                      className={`text-xs font-mono ${
                        wordCount === 12 ? 'text-emerald-400 font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      {wordCount === 12 ? '12 / 12 words ✓' : `${wordCount} / 12 words`}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    placeholder="Enter the 12 words separated by spaces..."
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none transition resize-none"
                  />
                  <p className="text-xs text-zinc-400">
                    The 12 words are verified locally before upload to guarantee future recovery.
                  </p>
                </div>

                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center justify-center gap-1.5 focus-ring"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !gdriveToken.trim() || !mnemonic.trim()}
                    className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 focus-ring"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Verify & Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};
