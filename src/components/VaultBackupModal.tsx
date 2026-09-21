import React, { useState } from 'react';
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
  HelpCircle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  snapshot: VaultSnapshot;
}

export const VaultBackupModal: React.FC<Props> = ({ isOpen, onClose, snapshot }) => {
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
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  const handleTokenChange = (val: string) => {
    setGdriveToken(val);
    try {
      sessionStorage.setItem('mountain_gdrive_token', val);
    } catch {}
  };

  if (!isOpen) return null;

  const wordCount = mnemonic.trim() ? mnemonic.trim().split(/\s+/).length : 0;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-[#0f1015] border border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 glow-subtle">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-neutral-700 flex items-center justify-center text-zinc-100">
              <DownloadCloud className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Backup Vault</h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                {snapshot.items.length} records · ID: {snapshot.vaultId.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
              <h3 className="text-sm font-semibold text-white">Backup Complete</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                {successMessage}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-md tactile-btn"
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
                <p className="text-xs text-zinc-400">
                  Select where you want to export your encrypted vault backup:
                </p>

                {/* Local Backup Option */}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setDestination('local');
                  }}
                  className="w-full p-4 bg-[#14161d] hover:bg-[#1a1c24] border border-neutral-800 hover:border-neutral-600 rounded-xl transition text-left group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-zinc-900 border border-neutral-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-zinc-100">
                        Local Backup File
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Download encrypted .json backup file directly to your device
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
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
                  className="w-full p-4 bg-[#14161d] hover:bg-[#1a1c24] border border-neutral-800 hover:border-neutral-600 rounded-xl transition text-left group flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-zinc-900 border border-neutral-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-zinc-100">
                        Google Drive
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Save encrypted backup snapshot into Google Drive app storage
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
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
                    <span className="text-xs font-semibold text-white">Local File Backup</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Change Destination
                  </button>
                </div>

                <div className="p-3 bg-zinc-900/60 border border-neutral-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic Verification Gate</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Enter your 12 recovery words to verify you can decrypt this vault before creating the backup.
                  </p>
                </div>

                {/* 12 Recovery Words Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      12 Recovery Words
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        wordCount === 12 ? 'text-emerald-400 font-semibold' : 'text-zinc-500'
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
                    className="w-full p-3 bg-[#0a0b0e] border border-neutral-800 focus:border-zinc-500 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-700 outline-none transition resize-none"
                  />
                </div>

                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="py-2.5 px-4 bg-[#14161d] hover:bg-[#1a1c24] text-zinc-300 font-medium rounded-xl text-xs transition border border-neutral-800 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !mnemonic.trim()}
                    className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
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
                    <span className="text-xs font-semibold text-white">Google Drive Backup</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    Change Destination
                  </button>
                </div>

                {/* Google OAuth Token Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      Google OAuth Access Token
                    </label>
                    <a
                      href="https://developers.google.com/oauthplayground/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
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
                    className="w-full px-3 py-2 bg-[#0a0b0e] border border-neutral-800 focus:border-zinc-500 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-700 outline-none transition"
                  />

                  {/* Collapsible How-To Guide */}
                  <div className="rounded-xl border border-neutral-800/90 bg-[#0c0d12] p-3 text-xs space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowTokenHelp(!showTokenHelp)}
                      className="w-full flex items-center justify-between text-zinc-300 hover:text-white font-medium text-left"
                    >
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <HelpCircle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <span>How to get a Google OAuth token (1 minute guide)</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {showTokenHelp ? 'Hide' : 'View steps'}
                      </span>
                    </button>

                    {showTokenHelp && (
                      <ol className="list-decimal list-inside text-[11px] text-zinc-400 space-y-1.5 pt-2 border-t border-neutral-800/80 leading-relaxed">
                        <li>
                          Open the{' '}
                          <a
                            href="https://developers.google.com/oauthplayground/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-0.5"
                          >
                            Google OAuth 2.0 Playground
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>.
                        </li>
                        <li>
                          In <strong>Step 1</strong>, scroll down to{' '}
                          <strong className="text-zinc-200">Drive API v3</strong> and check{' '}
                          <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded text-[10px]">
                            https://www.googleapis.com/auth/drive.file
                          </code>.
                        </li>
                        <li>
                          Click <strong className="text-zinc-200">Authorize APIs</strong> and sign in with your Google account.
                        </li>
                        <li>
                          In <strong>Step 2</strong>, click{' '}
                          <strong className="text-zinc-200">Exchange authorization code for tokens</strong>.
                        </li>
                        <li>
                          Copy the <strong className="text-emerald-300">Access token</strong> (starts with <code className="text-zinc-200">ya29...</code>) and paste it into the field above.
                        </li>
                      </ol>
                    )}
                  </div>
                </div>

                {/* 12 Recovery Words Input */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      12 Recovery Words
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        wordCount === 12 ? 'text-emerald-400 font-semibold' : 'text-zinc-500'
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
                    className="w-full p-3 bg-[#0a0b0e] border border-neutral-800 focus:border-zinc-500 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-700 outline-none transition resize-none"
                  />
                  <p className="text-[10px] text-zinc-500">
                    The 12 words are verified before upload to guarantee future recovery.
                  </p>
                </div>

                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDestination('select');
                    }}
                    className="py-2.5 px-4 bg-[#14161d] hover:bg-[#1a1c24] text-zinc-300 font-medium rounded-xl text-xs transition border border-neutral-800 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !gdriveToken.trim() || !mnemonic.trim()}
                    className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
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
  );
};
