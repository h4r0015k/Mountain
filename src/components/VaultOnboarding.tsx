import React, { useState, useRef } from 'react';
import { generateMnemonic } from '../crypto/mnemonic.js';
import { deriveVaultKey, generateSalt } from '../crypto/kdf.js';
import { bytesToBase64 } from '../crypto/base64.js';
import { saveVaultSnapshot } from '../storage/indexeddb.js';
import { VaultSnapshot } from '../models/vault.js';
import { MountainIcon } from './ShowcaseDashboard.js';
import {
  restoreVault,
  parseSnapshotFromJson,
  GoogleDriveClient,
  GoogleDriveFileMetadata,
  DecryptionValidationError,
} from '../backup/index.js';
import {
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  DownloadCloud,
  Sparkles,
  ShieldCheck,
  Lock,
  HardDrive,
  Cloud,
  Upload,
  FileJson,
  Loader2,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

interface Props {
  onVaultReady: (key: CryptoKey, snapshot: VaultSnapshot, masterSecret: string) => void;
  initialMode?: 'choice' | 'create' | 'verify' | 'restore';
  onCancel?: () => void;
}

export const VaultOnboarding: React.FC<Props> = ({
  onVaultReady,
  initialMode = 'choice',
  onCancel,
}) => {
  const [mode, setMode] = useState<'choice' | 'create' | 'verify' | 'restore'>(initialMode);
  const [restoreStep, setRestoreStep] = useState<'select_source' | 'local_file' | 'google_drive'>('select_source');

  // New Vault Generation State
  const [mnemonic, setMnemonic] = useState(() => generateMnemonic(12));
  const [copied, setCopied] = useState(false);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [pinPassword, setPinPassword] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mnemonic Verification State (for creation)
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});

  // Restore State - Common
  const [restoreWords, setRestoreWords] = useState('');

  // Restore State - Local File
  const [localFileContent, setLocalFileContent] = useState<string | null>(null);
  const [localSnapshot, setLocalSnapshot] = useState<VaultSnapshot | null>(null);
  const [localFileName, setLocalFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore State - Google Drive
  const [gdriveToken, setGdriveToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem('mountain_gdrive_token') || '';
    } catch {
      return '';
    }
  });
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [copiedScope, setCopiedScope] = useState(false);
  const [gdriveBackups, setGdriveBackups] = useState<GoogleDriveFileMetadata[]>([]);
  const [selectedGdriveFile, setSelectedGdriveFile] = useState<GoogleDriveFileMetadata | null>(null);
  const [isLoadingGdrive, setIsLoadingGdrive] = useState(false);

  const handleTokenChange = (val: string) => {
    setGdriveToken(val);
    try {
      sessionStorage.setItem('mountain_gdrive_token', val);
    } catch {}
  };

  const handleCopyScope = async () => {
    try {
      await navigator.clipboard.writeText('https://www.googleapis.com/auth/drive.file');
      setCopiedScope(true);
      setTimeout(() => setCopiedScope(false), 2000);
    } catch {}
  };

  const mnemonicWords = mnemonic.split(' ');
  const restoreWordCount = restoreWords.trim() ? restoreWords.trim().split(/\s+/).length : 0;

  const handleCopyMnemonic = async () => {
    await navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateMnemonic = () => {
    setMnemonic(generateMnemonic(12));
    setHasBackedUp(false);
    setCopied(false);
    setVerifyInputs({});
  };

  const handleProceedToVerify = () => {
    if (!hasBackedUp) {
      setError('Please check the confirmation box acknowledging you saved your 12 recovery words.');
      return;
    }
    setError(null);

    const indices: number[] = [];
    while (indices.length < 3) {
      const r = Math.floor(Math.random() * 12);
      if (!indices.includes(r)) indices.push(r);
    }
    indices.sort((a, b) => a - b);
    setVerifyIndices(indices);
    setVerifyInputs({});
    setMode('verify');
  };

  const isAllVerified =
    verifyIndices.length === 3 &&
    verifyIndices.every((idx) => (verifyInputs[idx] || '').trim().toLowerCase() === mnemonicWords[idx].toLowerCase());

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllVerified) {
      setError('Please correctly verify all requested recovery words before proceeding.');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      const secretToDeriveFrom = pinPassword.trim() || mnemonic;
      const salt = generateSalt(16);
      const keyBundle = await deriveVaultKey(secretToDeriveFrom, salt, 600000);
      const saltBase64 = bytesToBase64(salt);

      const vaultId = crypto.randomUUID();
      const newSnapshot: VaultSnapshot = {
        format: 'mountain-vault',
        version: 1,
        vaultId,
        salt: saltBase64,
        kdfIterations: 600000,
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveVaultSnapshot(newSnapshot);
      onVaultReady(keyBundle.key, newSnapshot, secretToDeriveFrom);
    } catch (err: any) {
      setError(`Failed to initialize: ${err.message}`);
    } finally {
      setIsInitializing(false);
    }
  };

  // ------------------ LOCAL RESTORE LOGIC ------------------

  const handleLocalFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const snapshot = parseSnapshotFromJson(text);
        setLocalFileContent(text);
        setLocalSnapshot(snapshot);
        setLocalFileName(file.name);
      } catch (err: any) {
        setLocalSnapshot(null);
        setLocalFileContent(null);
        setError(err.message || 'The selected file is not a valid Mountain vault backup.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the local backup file.');
    };
    reader.readAsText(file);
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLocalFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLocalFile(file);
  };

  const handleRestoreFromLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFileContent || !localSnapshot) {
      setError('Please select a valid Mountain backup file.');
      return;
    }
    const cleanWords = restoreWords.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleanWords) {
      setError('Please enter your 12-word recovery phrase.');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      const secretToDerive = pinPassword.trim() || cleanWords;
      const result = await restoreVault({
        source: 'local',
        backupData: localFileContent,
        mnemonic: cleanWords,
      });

      await saveVaultSnapshot(result.snapshot);
      try {
        localStorage.setItem(`mountain_last_backup_${result.snapshot.vaultId}`, String(Date.now()));
      } catch {}
      onVaultReady(result.key, result.snapshot, secretToDerive);
    } catch (err: any) {
      if (err instanceof DecryptionValidationError) {
        setError(err.message);
      } else {
        setError(`Restore failed: ${err.message}`);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // ------------------ GOOGLE DRIVE RESTORE LOGIC ------------------

  const scanGoogleDriveForBackups = async (token: string) => {
    setIsLoadingGdrive(true);
    setError(null);
    try {
      const client = new GoogleDriveClient();
      let files: GoogleDriveFileMetadata[] = [];
      try {
        files = await client.listBackups(token, { folder: 'appDataFolder' });
      } catch {
        files = [];
      }
      if (files.length === 0) {
        try {
          const rootFiles = await client.listBackups(token, { folder: 'drive' });
          files = rootFiles;
        } catch (err: any) {
          if (files.length === 0) throw err;
        }
      }
      setGdriveBackups(files);
      if (files.length === 0) {
        setError('No Mountain backups found in this Google Drive account.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan Google Drive for backups.');
    } finally {
      setIsLoadingGdrive(false);
    }
  };

  const handleScanDrive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gdriveToken.trim()) {
      setError('Please enter your Google OAuth access token.');
      return;
    }
    await scanGoogleDriveForBackups(gdriveToken.trim());
  };

  const handleRestoreFromGdrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGdriveFile) {
      setError('Please select a backup file from Google Drive.');
      return;
    }
    const cleanWords = restoreWords.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleanWords) {
      setError('Please enter your 12-word recovery phrase.');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);

      const secretToDerive = pinPassword.trim() || cleanWords;
      const result = await restoreVault({
        source: 'google_drive',
        fileId: selectedGdriveFile.id,
        mnemonic: cleanWords,
        accessToken: gdriveToken.trim(),
      });

      await saveVaultSnapshot(result.snapshot);
      try {
        localStorage.setItem(`mountain_last_backup_${result.snapshot.vaultId}`, String(Date.now()));
      } catch {}
      onVaultReady(result.key, result.snapshot, secretToDerive);
    } catch (err: any) {
      if (err instanceof DecryptionValidationError) {
        setError(err.message);
      } else {
        setError(`Restore failed: ${err.message}`);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-sm p-1.5">
                <MountainIcon className="w-full h-full" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-zinc-100">Mountain</span>
            </div>
            <span className="text-xs font-mono tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              Local Vault
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-normal leading-relaxed">
            Zero-knowledge, hardware-grade local password manager.
            <br />
            No mandatory cloud connection.
          </p>
        </div>

        <div className="h-[1px] bg-zinc-800" />

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
              onClick={() => {
                setError(null);
                setMode('create');
              }}
              className="w-full p-4 bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition text-left group flex items-center justify-between focus-ring"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-100 group-hover:text-white">Create New Vault</div>
                  <div className="text-xs text-zinc-400">Generate a 12-word cryptographic seed</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => {
                setError(null);
                setRestoreStep('select_source');
                setMode('restore');
              }}
              className="w-full p-4 bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition text-left group flex items-center justify-between focus-ring"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                  <DownloadCloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-100 group-hover:text-white">Restore Vault</div>
                  <div className="text-xs text-zinc-400">Import backup from local file or Google Drive</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}

        {/* STEP 2A: DISPLAY 12 WORDS (CREATION) */}
        {mode === 'create' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-zinc-300">
                  Secret Recovery Phrase
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={handleRegenerateMnemonic}
                    title="Generate new words"
                    className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition focus-ring"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyMnemonic}
                    className="flex items-center space-x-1 text-xs font-medium py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition focus-ring"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Word grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs">
                {mnemonicWords.map((word, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 py-1.5 px-2 bg-zinc-900 rounded-lg border border-zinc-800/80"
                  >
                    <span className="text-zinc-400 select-none text-xs w-4 text-right font-mono">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-zinc-100 font-medium tracking-tight truncate">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acknowledgment Checkbox */}
            <label className="flex items-start space-x-2.5 p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasBackedUp}
                onChange={(e) => setHasBackedUp(e.target.checked)}
                className="mt-0.5 rounded accent-zinc-400"
              />
              <span className="text-xs text-zinc-300 leading-relaxed">
                I have written down these 12 words. If I lose them, my data is permanently unrecoverable.
              </span>
            </label>

            <div className="flex space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setMode('choice')}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition border border-zinc-700/60 focus-ring"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToVerify}
                disabled={!hasBackedUp}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-sm tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 focus-ring"
              >
                <span>Verify Backup Words</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2B: VERIFY RECOVERY WORDS MECHANISM */}
        {mode === 'verify' && (
          <form onSubmit={handleCreateVault} className="space-y-4">
            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verify Your Backup</span>
              </div>
              <p className="text-xs text-zinc-400 leading-normal">
                To guarantee you won't be locked out, confirm the requested words from your handwritten backup.
              </p>
            </div>

            <div className="space-y-3">
              {verifyIndices.map((idx) => {
                const entered = (verifyInputs[idx] || '').trim().toLowerCase();
                const correct = mnemonicWords[idx].toLowerCase();
                const isMatched = entered === correct;
                const isWrong = entered.length > 0 && !correct.startsWith(entered);

                return (
                  <div key={idx} className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                      <span>Word #{idx + 1}</span>
                      {isMatched && (
                        <span className="text-emerald-400 text-xs font-mono flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      )}
                      {isWrong && <span className="text-rose-400 text-xs font-mono">Incorrect</span>}
                    </label>
                    <input
                      type="text"
                      required
                      value={verifyInputs[idx] || ''}
                      onChange={(e) =>
                        setVerifyInputs((prev) => ({ ...prev, [idx]: e.target.value.toLowerCase().trim() }))
                      }
                      placeholder={`Enter word #${idx + 1}`}
                      className={`w-full px-3.5 py-2 bg-zinc-950 border rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none transition focus-ring ${
                        isMatched
                          ? 'border-emerald-500/70 bg-emerald-950/20'
                          : isWrong
                          ? 'border-rose-500/70 bg-rose-950/20'
                          : 'border-zinc-800'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Optional Daily PIN */}
            <div className="space-y-1 pt-2 border-t border-zinc-800">
              <label className="text-xs font-medium text-zinc-300 flex justify-between">
                <span>Unlock Passphrase</span>
                <span className="text-zinc-400 text-xs normal-case">Optional</span>
              </label>
              <input
                type="password"
                value={pinPassword}
                onChange={(e) => setPinPassword(e.target.value)}
                placeholder="Optional password or PIN"
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none transition"
              />
            </div>

            <div className="flex space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMode('create')}
                className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center gap-1 focus-ring"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Review</span>
              </button>
              <button
                type="submit"
                disabled={isInitializing || !isAllVerified}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-sm tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 focus-ring"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-950" />
                <span>{isInitializing ? 'Deriving Keys...' : 'Initialize Vault'}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 2C: RESTORE VAULT - SUB-SCREENS */}
        {mode === 'restore' && (
          <div className="space-y-5">
            {/* SUB-SCREEN 1: CHOOSE RESTORE SOURCE */}
            {restoreStep === 'select_source' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-100">Choose Backup Source</h3>
                  <p className="text-xs text-zinc-400">
                    Select where your encrypted backup is located.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Option 1: Local Backup */}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setRestoreStep('local_file');
                    }}
                    className="w-full p-4 bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-zinc-700 rounded-xl transition text-left group flex items-center justify-between focus-ring"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="p-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-zinc-200 group-hover:text-white transition">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-100 group-hover:text-white">
                          Local Backup File
                        </div>
                        <div className="text-xs text-zinc-400">
                          Restore from a .json or .mountain backup on this device
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Local
                      </span>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition" />
                    </div>
                  </button>

                  {/* Option 2: Google Drive */}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setRestoreStep('google_drive');
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
                          Fetch and restore encrypted snapshot from Google Drive
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Cloud
                      </span>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition" />
                    </div>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onCancel) {
                        onCancel();
                      } else {
                        setMode('choice');
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center justify-center gap-1.5 focus-ring"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-SCREEN 2: LOCAL FILE RESTORE */}
            {restoreStep === 'local_file' && (
              <form onSubmit={handleRestoreFromLocal} className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-100">Restore from Local File</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setRestoreStep('select_source');
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                  >
                    Change Source
                  </button>
                </div>

                {/* File Dropzone / Selected File Card */}
                {!localSnapshot ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2.5 ${
                      isDragging
                        ? 'border-zinc-300 bg-zinc-800/70'
                        : 'border-zinc-800 hover:border-zinc-600 bg-zinc-950'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.mountain"
                      onChange={handleLocalFileChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-200">
                        Click to select or drag backup file here
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">
                        Accepts .json or .mountain backup files
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200">
                        <FileJson className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-zinc-100 truncate max-w-[200px]">
                          {localFileName}
                        </div>
                        <div className="text-xs font-mono text-zinc-400">
                          Vault {localSnapshot.vaultId.slice(0, 8)} · {localSnapshot.items.length} records
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSnapshot(null);
                        setLocalFileContent(null);
                        setLocalFileName('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 focus-ring"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* 12-Word Recovery Phrase Input */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">
                      Enter 12-Word Recovery Phrase
                    </label>
                    <span
                      className={`text-xs font-mono ${
                        restoreWordCount === 12
                          ? 'text-emerald-400 font-semibold'
                          : 'text-zinc-400'
                      }`}
                    >
                      {restoreWordCount === 12 ? '12 / 12 words ✓' : `${restoreWordCount} / 12 words`}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={restoreWords}
                    onChange={(e) => setRestoreWords(e.target.value)}
                    placeholder="Enter the 12 words separated by spaces..."
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none transition resize-none"
                  />
                  <p className="text-xs text-zinc-400">
                    The 12 words will be cryptographically verified against the backup file before restoring.
                  </p>
                </div>

                {/* Optional Passphrase */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-medium text-zinc-300 flex justify-between">
                    <span>Unlock Passphrase</span>
                    <span className="text-zinc-400 text-xs normal-case">Optional</span>
                  </label>
                  <input
                    type="password"
                    value={pinPassword}
                    onChange={(e) => setPinPassword(e.target.value)}
                    placeholder="Passphrase or PIN (if set during creation)"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none transition"
                  />
                </div>

                <div className="flex space-x-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setRestoreStep('select_source');
                    }}
                    className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center justify-center gap-1 focus-ring"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isInitializing || !localSnapshot || !restoreWords.trim()}
                    className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-sm tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 focus-ring"
                  >
                    {isInitializing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Decryption...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Decrypt & Restore</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* SUB-SCREEN 3: GOOGLE DRIVE RESTORE */}
            {restoreStep === 'google_drive' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-100">Restore from Google Drive</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSelectedGdriveFile(null);
                      setGdriveBackups([]);
                      setRestoreStep('select_source');
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                  >
                    Change Source
                  </button>
                </div>

                {/* Sub-step A: Enter Google OAuth Token & Scan */}
                {!selectedGdriveFile && gdriveBackups.length === 0 && (
                  <form onSubmit={handleScanDrive} className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300">
                          Google OAuth Access Token
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
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowTokenHelp(!showTokenHelp)}
                          className="w-full flex items-center justify-between text-zinc-300 hover:text-white font-medium text-left"
                        >
                          <span className="flex items-center gap-1.5 text-xs">
                            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                            <span>How to get a Google OAuth token (1 minute guide)</span>
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            {showTokenHelp ? 'Hide' : 'View steps'}
                          </span>
                        </button>

                        {showTokenHelp && (
                          <div className="space-y-2 pt-2 border-t border-zinc-800/80 leading-relaxed text-zinc-400 text-xs">
                            <ol className="list-decimal list-inside space-y-2">
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
                              <li className="space-y-1.5">
                                <div>
                                  In <strong>Step 1</strong>, authorize the Drive scope:
                                </div>
                                <div className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                                  <code className="text-zinc-200 text-xs font-mono flex-1 truncate">
                                    https://www.googleapis.com/auth/drive.file
                                  </code>
                                  <button
                                    type="button"
                                    onClick={handleCopyScope}
                                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded transition flex items-center gap-1 shrink-0"
                                  >
                                    {copiedScope ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span>Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy Scope</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </li>
                              <li>
                                Click <strong className="text-zinc-200">Authorize APIs</strong> and sign in with your Google account.
                              </li>
                              <li>
                                In <strong>Step 2</strong>, click{' '}
                                <strong className="text-zinc-200">Exchange authorization code for tokens</strong>.
                              </li>
                              <li>
                                Copy the <strong className="text-emerald-300">Access token</strong> (starts with <code className="text-zinc-200 font-mono">ya29...</code>) and paste it into the field above.
                              </li>
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoadingGdrive || !gdriveToken.trim()}
                      className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-sm tactile-btn flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none focus-ring"
                    >
                      {isLoadingGdrive ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                          <span>Scanning Google Drive for Backups...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" />
                          <span>Scan Google Drive for Backups</span>
                        </>
                      )}
                    </button>

                    {/* Bottom Back button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setRestoreStep('select_source');
                        }}
                        className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center justify-center gap-1.5 focus-ring"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Backup Sources</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Sub-step B: Backups List (Found in Google Drive) */}
                {!selectedGdriveFile && gdriveBackups.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-300">
                        Available Backups ({gdriveBackups.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => scanGoogleDriveForBackups(gdriveToken)}
                        disabled={isLoadingGdrive}
                        className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 focus-ring rounded"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingGdrive ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {gdriveBackups.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => {
                            setError(null);
                            setSelectedGdriveFile(file);
                          }}
                          className="p-3 bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 rounded-xl cursor-pointer transition flex items-center justify-between group focus-ring"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setSelectedGdriveFile(file);
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="text-xs font-medium text-zinc-100 truncate max-w-[240px] group-hover:text-white">
                              {file.name}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono">
                              {new Date(file.modifiedTime).toLocaleDateString()}
                              {file.size ? ` · ${(parseInt(file.size) / 1024).toFixed(1)} KB` : ''}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-zinc-300 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 group-hover:bg-zinc-700 transition">
                            Select
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Back Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setGdriveBackups([]);
                        }}
                        className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center justify-center gap-1.5 focus-ring"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-step C: Enter 12 Words for Selected Cloud File */}
                {selectedGdriveFile && (
                  <form onSubmit={handleRestoreFromGdrive} className="space-y-4">
                    <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200">
                          <Cloud className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-zinc-100 truncate max-w-[200px]">
                            {selectedGdriveFile.name}
                          </div>
                          <div className="text-xs font-mono text-zinc-400">
                            {new Date(selectedGdriveFile.modifiedTime).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedGdriveFile(null)}
                        className="text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 focus-ring"
                      >
                        Change
                      </button>
                    </div>

                    {/* 12 Recovery Words */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300">
                          Enter 12-Word Recovery Phrase
                        </label>
                        <span
                          className={`text-xs font-mono ${
                            restoreWordCount === 12
                              ? 'text-emerald-400 font-semibold'
                              : 'text-zinc-400'
                          }`}
                        >
                          {restoreWordCount === 12 ? '12 / 12 words ✓' : `${restoreWordCount} / 12 words`}
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        required
                        value={restoreWords}
                        onChange={(e) => setRestoreWords(e.target.value)}
                        placeholder="Enter the 12 words separated by spaces..."
                        className="w-full p-3 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none transition resize-none"
                      />
                    </div>

                    {/* Optional Passphrase/PIN */}
                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-medium text-zinc-300 flex justify-between">
                        <span>Unlock Passphrase</span>
                        <span className="text-zinc-400 text-xs normal-case">Optional</span>
                      </label>
                      <input
                        type="password"
                        value={pinPassword}
                        onChange={(e) => setPinPassword(e.target.value)}
                        placeholder="Passphrase or PIN (if configured)"
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none transition"
                      />
                    </div>

                    <div className="flex space-x-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGdriveFile(null)}
                        className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition border border-zinc-700/60 flex items-center justify-center gap-1 focus-ring"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isInitializing || !restoreWords.trim()}
                        className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-sm tactile-btn disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 focus-ring"
                      >
                        {isInitializing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying Decryption...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Decrypt & Restore</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
