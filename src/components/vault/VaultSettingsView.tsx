import React, { useState, useEffect } from 'react';
import { VaultSnapshot } from '../../models/vault.js';
import { AutoLockTimeout } from '../../hooks/useAutoLock.js';
import { CompanionBridgeHook } from '../../companion/useCompanionBridge.js';
import {
  backupVault,
  triggerLocalDownload,
  DecryptionValidationError,
} from '../../backup/index.js';
import { GoogleOAuthHelpGuide } from './GoogleOAuthHelpGuide.js';
import {
  Shield,
  EyeOff,
  DownloadCloud,
  HardDrive,
  Cloud,
  Puzzle,
  Unlink,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Eye,
  ShieldCheck,
  KeyRound,
  Lock,
} from 'lucide-react';

export type SettingsTab = 'security' | 'privacy' | 'backup' | 'companion';

interface Props {
  initialTab?: SettingsTab;
  snapshot: VaultSnapshot;
  timeoutMinutes: AutoLockTimeout;
  onTimeoutChange: (val: AutoLockTimeout) => void;
  allowFavicons: boolean;
  onToggleFavicons: (val: boolean) => void;
  companion?: CompanionBridgeHook;
  onBack?: () => void;
  onShowToast: (msg: string) => void;
  onBackupSuccess?: (timestamp: number) => void;
}

export const VaultSettingsView: React.FC<Props> = ({
  initialTab = 'security',
  snapshot,
  timeoutMinutes,
  onTimeoutChange,
  allowFavicons,
  onToggleFavicons,
  companion,
  onBack: _onBack,
  onShowToast,
  onBackupSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [copiedVaultId, setCopiedVaultId] = useState(false);

  // Backup Tab State
  const [backupDestination, setBackupDestination] = useState<'local' | 'gdrive'>('local');
  const [backupMnemonic, setBackupMnemonic] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isBackupProcessing, setIsBackupProcessing] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [gdriveToken, setGdriveToken] = useState(() => {
    try {
      return sessionStorage.getItem('mountain_gdrive_token') || '';
    } catch {
      return '';
    }
  });

  // Companion Tab State
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);

  // MCP Bridge State
  const [mcpStatus, setMcpStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [mcpToken, setMcpToken] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('mountain_mcp_auth_token');
      if (stored && stored.startsWith('mntn_') && stored.length >= 20) return stored;
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const created = 'mntn_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('mountain_mcp_auth_token', created);
      return created;
    } catch {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return 'mntn_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  });
  const [copiedMcpToken, setCopiedMcpToken] = useState(false);
  const mcpWsRef = React.useRef<WebSocket | null>(null);

  const handleCopyMcpToken = async () => {
    try {
      await navigator.clipboard.writeText(mcpToken);
      setCopiedMcpToken(true);
      onShowToast('MCP Bearer Token copied');
      setTimeout(() => setCopiedMcpToken(false), 2000);
    } catch {}
  };

  const handleRegenerateMcpToken = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const newToken = 'mntn_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    try {
      localStorage.setItem('mountain_mcp_auth_token', newToken);
    } catch {}
    setMcpToken(newToken);
    if (mcpWsRef.current?.readyState === WebSocket.OPEN) {
      mcpWsRef.current.send(JSON.stringify({ action: 'SET_TOKEN', token: newToken }));
    }
    onShowToast('New MCP Token generated & rotated');
  };

  // Disconnect MCP when switching away from the companion tab
  useEffect(() => {
    if (activeTab !== 'companion' && mcpWsRef.current) {
      mcpWsRef.current.close();
      mcpWsRef.current = null;
      setMcpStatus('disconnected');
    }
  }, [activeTab]);

  // Cleanup WebSocket on unmount (when closing settings view)
  useEffect(() => {
    return () => {
      if (mcpWsRef.current) {
        mcpWsRef.current.close();
        mcpWsRef.current = null;
      }
    };
  }, []);

  const handleConnectMcp = () => {
    // Disconnect if already connected
    if (mcpWsRef.current) {
      mcpWsRef.current.close();
      mcpWsRef.current = null;
      setMcpStatus('disconnected');
      return;
    }

    setMcpStatus('connecting');

    try {
      const ws = new WebSocket(`ws://localhost:27182/spa?token=${encodeURIComponent(mcpToken)}`);

      ws.addEventListener('open', () => {
        setMcpStatus('connected');
        ws.send(JSON.stringify({ action: 'SET_TOKEN', token: mcpToken }));
        onShowToast('MCP bridge connected');
      });

      ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.source !== 'MOUNTAIN_MCP_BRIDGE') return;

          // Dispatch to the SPA bridge handler
          window.postMessage(msg, window.location.origin);

          // One-shot listener: forward the SPA response back to the bridge
          const handleResponse = (e: MessageEvent) => {
            if (e.data?.source !== 'MOUNTAIN_SPA' || e.data?.requestId !== msg.requestId) return;
            window.removeEventListener('message', handleResponse);
            if (mcpWsRef.current?.readyState === WebSocket.OPEN) {
              mcpWsRef.current.send(JSON.stringify(e.data));
            }
          };
          window.addEventListener('message', handleResponse);
          setTimeout(() => window.removeEventListener('message', handleResponse), 6000);
        } catch {}
      });

      ws.addEventListener('close', () => {
        setMcpStatus('disconnected');
        mcpWsRef.current = null;
      });

      ws.addEventListener('error', () => {
        setMcpStatus('disconnected');
        onShowToast('Could not connect — is mountain-mcp running?');
        mcpWsRef.current = null;
        ws.close();
      });

      mcpWsRef.current = ws;
    } catch {
      setMcpStatus('disconnected');
      onShowToast('Failed to connect to MCP bridge');
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleCopyVaultId = async () => {
    try {
      await navigator.clipboard.writeText(snapshot.vaultId);
      setCopiedVaultId(true);
      onShowToast('Vault ID copied to clipboard');
      setTimeout(() => setCopiedVaultId(false), 2000);
    } catch {}
  };

  const handleCopyPairingCode = () => {
    if (!companion?.pairingCode) return;
    navigator.clipboard.writeText(companion.pairingCode);
    setCopiedPairingCode(true);
    onShowToast('Pairing code copied');
    setTimeout(() => setCopiedPairingCode(false), 2000);
  };

  const handleTokenChange = (val: string) => {
    setGdriveToken(val);
    try {
      sessionStorage.setItem('mountain_gdrive_token', val);
    } catch {}
  };

  const handleExecuteBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWords = backupMnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleanWords) {
      setBackupError('Please enter your 12-word recovery phrase to authenticate the export.');
      return;
    }

    try {
      setIsBackupProcessing(true);
      setBackupError(null);

      if (backupDestination === 'local') {
        const result = await backupVault({
          destination: 'local',
          snapshot,
          mnemonic: cleanWords,
        });
        if (result.destination === 'local') {
          triggerLocalDownload(result);
          setBackupSuccessMessage(`Encrypted backup file saved: ${result.filename}`);
          onBackupSuccess?.(Date.now());
          onShowToast('Backup downloaded successfully');
        }
      } else {
        if (!gdriveToken.trim()) {
          setBackupError('Please enter your Google OAuth access token.');
          setIsBackupProcessing(false);
          return;
        }
        const result = await backupVault({
          destination: 'google_drive',
          snapshot,
          mnemonic: cleanWords,
          accessToken: gdriveToken.trim(),
          folder: 'appDataFolder',
        });
        if (result.destination === 'google_drive') {
          setBackupSuccessMessage(`Vault encrypted snapshot synced to Google Drive (${result.fileName})`);
          onBackupSuccess?.(Date.now());
          onShowToast('Vault synced to Google Drive');
        }
      }
    } catch (err: any) {
      if (err instanceof DecryptionValidationError) {
        setBackupError(err.message);
      } else {
        setBackupError(`Backup failed: ${err.message}`);
      }
    } finally {
      setIsBackupProcessing(false);
    }
  };

  const formattedPairingCode = companion?.pairingCode
    ? companion.pairingCode.length === 6
      ? `${companion.pairingCode.slice(0, 3)} ${companion.pairingCode.slice(3)}`
      : companion.pairingCode
    : '';

  const navTabs: Array<{
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    dot?: boolean;
  }> = [
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: EyeOff,
    },
    {
      id: 'backup',
      label: 'Backup & Sync',
      icon: DownloadCloud,
    },
    ...(companion
      ? [
          {
            id: 'companion' as SettingsTab,
            label: 'Extension',
            icon: Puzzle,
            dot: companion.isPaired,
          },
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-zinc-950 overflow-hidden font-sans">
      {/* Left Navigation Sidebar */}
      <aside className="w-full md:w-60 lg:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 shrink-0 select-none p-4 md:p-5">
        <div className="space-y-4">
          <div className="hidden md:block px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Settings</h2>
          </div>

          {/* Navigation Tab Links */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setBackupError(null);
                  }}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition shrink-0 md:shrink text-left ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span className="truncate">{tab.label}</span>
                  {tab.dot !== undefined && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ml-auto ${
                        tab.dot ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                      title={tab.dot ? 'Paired' : 'Not paired'}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Settings Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* TAB 1: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Session &amp; Security</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure inactivity lock timeouts and review cryptographic parameters.
                </p>
              </div>

              {/* Preferences Group */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/80">
                {/* Auto-Lock Inactivity Timer */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-zinc-200">
                      Auto-Lock Timeout
                    </div>
                    <p className="text-xs text-zinc-400 max-w-sm">
                      Automatically lock the vault when inactive or after the tab is closed.
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
                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-700/80 rounded-lg text-xs text-zinc-200 font-medium outline-none focus:border-zinc-500 cursor-pointer shrink-0"
                  >
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes (Default)</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>

                {/* Clipboard Protection */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-zinc-200">
                      Clipboard Auto-Clear
                    </div>
                    <p className="text-xs text-zinc-400 max-w-sm">
                      Automatically purges copied passwords and tokens from memory after 30 seconds.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/40 shrink-0">
                    30 seconds
                  </span>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5 space-y-3">
                <div className="text-xs font-medium text-zinc-200">
                  Cryptographic Specifications
                </div>

                <div className="divide-y divide-zinc-800/60 text-xs">
                  <div className="py-2 flex items-center justify-between text-zinc-400">
                    <span>Encryption Algorithm</span>
                    <span className="font-mono text-zinc-200">AES-256-GCM (AEAD)</span>
                  </div>
                  <div className="py-2 flex items-center justify-between text-zinc-400">
                    <span>Key Derivation</span>
                    <span className="font-mono text-zinc-200">PBKDF2-SHA256 (600,000 rounds)</span>
                  </div>
                  <div className="py-2 flex items-center justify-between text-zinc-400">
                    <span>Seed Standard</span>
                    <span className="font-mono text-zinc-200">BIP-39 (12-Word Mnemonic)</span>
                  </div>
                  <div className="py-2 flex items-center justify-between text-zinc-400">
                    <span>Storage Engine</span>
                    <span className="font-mono text-zinc-200">Encrypted IndexedDB</span>
                  </div>
                  <div className="py-2 flex items-center justify-between text-zinc-400">
                    <span>Vault Identifier</span>
                    <button
                      type="button"
                      onClick={handleCopyVaultId}
                      className="font-mono text-[11px] text-zinc-300 hover:text-white flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition"
                      title="Copy full Vault ID"
                    >
                      <span>{snapshot.vaultId.slice(0, 16)}...</span>
                      {copiedVaultId ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Privacy &amp; Network Isolation</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Control outbound network requests and domain metadata leakage.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 pr-2">
                    <div className="text-xs font-medium text-zinc-200 flex items-center gap-2">
                      <span>Offline Favicons</span>
                      {!allowFavicons && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Zero Outbound Requests
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-lg">
                      {!allowFavicons
                        ? 'All site logos and badges are rendered locally from domain initials without making any external HTTP calls. Your visited websites are never sent to third-party icon servers.'
                        : 'Site favicons are fetched directly via Google Favicon API. Outbound HTTP requests contain the domain names of your saved items.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !allowFavicons;
                      onToggleFavicons(next);
                      onShowToast(
                        next ? 'Online favicons enabled' : 'Zero-leakage offline mode active'
                      );
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 focus-ring ${
                      !allowFavicons ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                    role="switch"
                    aria-checked={!allowFavicons}
                    title={!allowFavicons ? 'Switch to online favicons' : 'Switch to offline mode'}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        !allowFavicons ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & CLOUD SYNC */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Backup &amp; Export</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Export an authenticated AES-256-GCM encrypted snapshot of your vault records.
                </p>
              </div>

              {backupError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-snug">{backupError}</span>
                </div>
              )}

              {backupSuccessMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{backupSuccessMessage}</span>
                </div>
              )}

              {/* Destination Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setBackupDestination('local')}
                  className={`flex items-center justify-center space-x-2 py-2 rounded-lg transition ${
                    backupDestination === 'local'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Local File (.json)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBackupDestination('gdrive')}
                  className={`flex items-center justify-center space-x-2 py-2 rounded-lg transition ${
                    backupDestination === 'gdrive'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Google Drive</span>
                </button>
              </div>

              {/* Backup Form */}
              <form
                onSubmit={handleExecuteBackup}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5 space-y-4"
              >
                <div className="text-xs text-zinc-400 leading-relaxed">
                  {backupDestination === 'local'
                    ? 'Downloads a self-contained encrypted .json file. Keep this file on an external drive or cold storage.'
                    : 'Uploads an encrypted snapshot to your Google Drive appDataFolder (an isolated, hidden folder accessible only by Mountain).'}
                </div>

                {backupDestination === 'gdrive' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-medium text-zinc-300">
                      Google OAuth Access Token
                    </label>
                    <input
                      type="password"
                      value={gdriveToken}
                      onChange={(e) => handleTokenChange(e.target.value)}
                      placeholder="ya29.a0AfH6SM..."
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-600"
                    />
                    <div className="pt-1">
                      <GoogleOAuthHelpGuide />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">
                      12-Word Recovery Phrase
                    </label>
                    <span className="text-[10px] text-zinc-500">Required for authentication</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showMnemonic ? 'text' : 'password'}
                      value={backupMnemonic}
                      onChange={(e) => setBackupMnemonic(e.target.value)}
                      placeholder="Enter the 12 words separated by spaces"
                      className="w-full pl-3 pr-9 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 font-mono focus:outline-none focus:border-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                      title={showMnemonic ? 'Hide recovery words' : 'Show recovery words'}
                    >
                      {showMnemonic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Mountain cryptographically verifies this phrase before generating the export.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isBackupProcessing || !backupMnemonic.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-lg text-xs transition shadow-xs flex items-center space-x-2"
                  >
                    {isBackupProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying phrase...</span>
                      </>
                    ) : (
                      <>
                        <DownloadCloud className="w-3.5 h-3.5" />
                        <span>
                          {backupDestination === 'local'
                            ? 'Download Encrypted Backup'
                            : 'Sync to Google Drive'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: COMPANION EXTENSION */}
          {activeTab === 'companion' && companion && (
            <div className="space-y-8 animate-fade-in">

              {/* ── Extension Pairing ─────────────────────────────── */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Browser Extension</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Pair the companion extension to enable autofill on websites.
                  </p>
                </div>

                {companion.isPaired ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-emerald-800/40 bg-emerald-950/20">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-emerald-300">Extension paired</span>
                        <span className="text-xs text-zinc-500 ml-2">· session token · postMessage IPC</span>
                      </div>
                      <button
                        type="button"
                        onClick={companion.unpair}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/60 text-xs transition"
                      >
                        <Unlink className="w-3 h-3" />
                        Unpair
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 text-center space-y-4">
                      <div>
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">One-time pairing code</p>
                        <div className="font-mono text-4xl font-bold tracking-widest text-zinc-100 select-all">
                          {formattedPairingCode || '--- ---'}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyPairingCode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition"
                        >
                          {copiedPairingCode ? (
                            <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                          ) : (
                            <><Copy className="w-3.5 h-3.5 text-zinc-400" /><span>Copy</span></>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={companion.regeneratePairingCode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-xs text-zinc-400 hover:text-zinc-200 transition"
                          title="Generate a new code"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          New code
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 px-1">
                      Click the Mountain extension icon → enter the code → Authorize.
                    </p>
                  </div>
                )}
              </div>

              {/* ── MCP Bridge ───────────────────────────────────── */}
              <div className="space-y-4 border-t border-zinc-800/60 pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">AI Agent Bridge</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Lets local AI tools (Claude, Cursor) fetch credentials on demand via MCP.
                    Your master key stays in this tab — the bridge only passes individual credentials.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="space-y-0.5">
                    {mcpStatus === 'connected' ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected · port 27182
                      </div>
                    ) : mcpStatus === 'connecting' ? (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting...
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400">Not connected</div>
                    )}
                    <div className="text-[11px] text-zinc-600 font-mono">
                      vault_status · list_domains · get_credential
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectMcp}
                    disabled={mcpStatus === 'connecting'}
                    className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-40 ${
                      mcpStatus === 'connected'
                        ? 'border-zinc-700 text-zinc-400 hover:border-rose-900/60 hover:text-rose-400'
                        : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {mcpStatus === 'connected' ? 'Disconnect' : 'Connect'}
                  </button>
                </div>

                {/* Bearer Token row */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-zinc-500 shrink-0 font-medium">Bearer Token:</span>
                    <span className="font-mono text-zinc-300 truncate select-all">{mcpToken}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyMcpToken}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                    >
                      {copiedMcpToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                      <span>{copiedMcpToken ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateMcpToken}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] transition"
                      title="Rotate Bearer Token"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Rotate</span>
                    </button>
                  </div>
                </div>

                {mcpStatus === 'connected' ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2.5">
                    <p className="text-[11px] text-zinc-400 font-medium">Add to <span className="font-mono text-zinc-300">claude_desktop_config.json</span>:</p>
                    <pre className="font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
{`{
  "mcpServers": {
    "mountain": {
      "url": "http://127.0.0.1:27182/sse?token=${mcpToken}"
    }
  }
}`}
                    </pre>
                    <div className="pt-1 border-t border-zinc-800/60 space-y-1">
                      <p className="text-[11px] text-zinc-400">Or add via Claude Code CLI:</p>
                      <pre className="font-mono text-[10px] text-emerald-400 bg-zinc-900/80 px-2 py-1 rounded border border-zinc-800 select-all overflow-x-auto">
claude mcp add mountain "http://127.0.0.1:27182/sse?token={mcpToken}"
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5 space-y-2 text-xs">
                    <div className="text-zinc-400 font-medium">Start the local bridge in a terminal:</div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="text-zinc-200 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 select-all flex items-center justify-between">
                        <span>npm run mcp</span>
                        <span className="text-[10px] text-zinc-500 font-sans">Inside Mountain directory</span>
                      </div>
                      <div className="text-zinc-500 text-[10px] px-0.5">
                        Or run directly: <span className="text-zinc-400 select-all">node mountain-mcp/index.js</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}


        </div>
      </main>
    </div>
  );
};
