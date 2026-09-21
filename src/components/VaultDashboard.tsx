import React, { useState, useEffect, useMemo, useRef } from 'react';
import { VaultItem, VaultSnapshot, VaultItemType, LoginFields } from '../models/vault.js';
import { encryptVaultRecord } from '../crypto/vault.js';
import { saveVaultSnapshot } from '../storage/indexeddb.js';
import { generateTOTP } from '../crypto/totp.js';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import { VaultBackupModal } from './VaultBackupModal';
import { MountainIcon } from './ShowcaseDashboard.js';
import {
  Lock,
  Plus,
  Search,
  Key,
  FileText,
  CreditCard,
  Terminal,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  KeyRound,
  X,
  Pencil,
  DownloadCloud,
  AlertTriangle,
} from 'lucide-react';

export interface DecryptedRecord {
  item: VaultItem;
  secret: any;
}

interface Props {
  snapshot: VaultSnapshot;
  activeKey: CryptoKey;
  items: DecryptedRecord[];
  onLock: () => void;
  onRefreshItems: () => Promise<void>;
}

/**
 * Enhanced TOTP Display Component with decay countdown ring / progress bar
 */
const TotpDisplay: React.FC<{
  code: string;
  secondsRemaining: number;
  onCopy: (text: string) => void;
  copied: boolean;
}> = ({ code, secondsRemaining, onCopy, copied }) => {
  const progressPercent = (secondsRemaining / 30) * 100;
  const isUrgent = secondsRemaining <= 5;
  const isWarning = secondsRemaining <= 10 && secondsRemaining > 5;

  const colorStyle = isUrgent
    ? 'border-rose-500/50 bg-rose-950/20'
    : isWarning
    ? 'border-amber-500/50 bg-amber-950/20'
    : 'border-emerald-500/50 bg-emerald-950/20';

  const barColor = isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-400';
  const badgeColor = isUrgent ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className={`p-4 rounded-xl border ${colorStyle} transition-all space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-zinc-100 select-all">
          <span>{code.slice(0, 3)}</span>
          <span className="mx-2 text-zinc-600 font-normal">·</span>
          <span>{code.slice(3)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs font-semibold px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 ${badgeColor}`}>
            {secondsRemaining}s
          </span>
          <button
            onClick={() => onCopy(code)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition focus-ring active:scale-95"
            title="Copy 6-digit code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Decay countdown bar */}
      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${barColor}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Safely extracts clean hostname from standard, partial, or protocol-less URL strings.
 */
export function extractDomain(urlStr?: string): string | null {
  if (!urlStr) return null;
  let clean = urlStr.trim();
  if (!clean) return null;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  try {
    const parsed = new URL(clean);
    if (!parsed.hostname || !parsed.hostname.includes('.')) return null;
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export const getTypeIcon = (type: VaultItemType, className = 'w-4 h-4 text-zinc-200') => {
  switch (type) {
    case 'LOGIN':
      return <Key className={className} />;
    case 'SECURE_NOTE':
      return <FileText className={className} />;
    case 'CARD':
      return <CreditCard className={className} />;
    case 'API_KEY':
      return <Terminal className={className} />;
    default:
      return <Key className={className} />;
  }
};

/**
 * Renders website favicon dynamically if URL is provided, falling back across Google S2, DuckDuckGo, and Category icon.
 */
export const FaviconBadge: React.FC<{
  url?: string;
  type: VaultItemType;
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ url, type, className = '', imgClassName, size = 'md' }) => {
  const [srcIndex, setSrcIndex] = useState(0);
  const domain = useMemo(() => extractDomain(url), [url]);

  useEffect(() => {
    setSrcIndex(0);
  }, [domain]);

  const sizeDimensions =
    size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : size === 'sm'
      ? 'w-7 h-7 rounded-lg'
      : 'w-10 h-10 rounded-xl';

  const defaultImgSize =
    size === 'lg'
      ? 'w-7 h-7'
      : size === 'sm'
      ? 'w-4 h-4'
      : 'w-5 h-5';

  const effectiveImgClass = imgClassName || defaultImgSize;

  if (!domain) {
    return (
      <div
        className={`${sizeDimensions} bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-300 ${className}`}
      >
        {getTypeIcon(type, size === 'lg' ? 'w-5 h-5 text-zinc-200' : 'w-4 h-4 text-zinc-200')}
      </div>
    );
  }

  // Favicon providers: Google S2 (128px high-res) -> DuckDuckGo ip3 (.ico) -> Category Icon
  const sources = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
  ];

  if (srcIndex >= sources.length) {
    return (
      <div
        className={`${sizeDimensions} bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-300 ${className}`}
      >
        {getTypeIcon(type, size === 'lg' ? 'w-5 h-5 text-zinc-200' : 'w-4 h-4 text-zinc-200')}
      </div>
    );
  }

  return (
    <div
      className={`${sizeDimensions} bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs ring-1 ring-zinc-800 transition-transform ${className}`}
    >
      <img
        src={sources[srcIndex]}
        alt=""
        className={`${effectiveImgClass} object-contain rounded-xs`}
        onError={() => setSrcIndex((i) => i + 1)}
        loading="lazy"
      />
    </div>
  );
};

export const VaultDashboard: React.FC<Props> = ({
  snapshot,
  activeKey,
  items,
  onLock,
  onRefreshItems,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<DecryptedRecord | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track last backup timestamp to detect unbacked changes
  const [lastBackupTime, setLastBackupTime] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`mountain_last_backup_${snapshot.vaultId}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  const handleBackupSuccess = (timestamp: number) => {
    setLastBackupTime(timestamp);
    try {
      localStorage.setItem(`mountain_last_backup_${snapshot.vaultId}`, String(timestamp));
    } catch {}
  };

  const hasUnbackedChanges =
    snapshot.items.length > 0 &&
    (lastBackupTime === 0 ||
      snapshot.updatedAt > lastBackupTime ||
      snapshot.items.some((item) => (item.updatedAt || item.createdAt || 0) > lastBackupTime));

  // Form state for new/editing record
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<VaultItemType>('LOGIN');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUsername, setNewItemUsername] = useState('');
  const [newItemPassword, setNewItemPassword] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemTotpSecret, setNewItemTotpSecret] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Live rotating 2FA TOTP codes
  const [totpCodes, setTotpCodes] = useState<Record<string, { code: string; secondsRemaining: number }>>({});

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  // Keyboard shortcut listeners (Slash / Cmd+K to search, Esc to close overlays)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Escape key handler
      if (e.key === 'Escape') {
        if (showAddDrawer) {
          setShowAddDrawer(false);
          setDrawerError(null);
        } else if (viewingRecord) {
          setViewingRecord(null);
          setConfirmDeleteId(null);
        } else if (searchQuery) {
          setSearchQuery('');
        }
        return;
      }

      // Quick Search shortcut: '/' or 'Cmd+K' / 'Ctrl+K'
      if (!isInputFocused) {
        if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddDrawer, viewingRecord, searchQuery]);

  const openAddDrawer = () => {
    setEditingItemId(null);
    setNewItemType('LOGIN');
    setNewItemTitle('');
    setNewItemUsername('');
    setNewItemPassword('');
    setNewItemUrl('');
    setNewItemTotpSecret('');
    setNewItemNotes('');
    setDrawerError(null);
    setShowAddDrawer(true);
  };

  const openEditDrawer = (record: DecryptedRecord) => {
    setEditingItemId(record.item.id);
    setNewItemType(record.item.type);
    setNewItemTitle(record.item.title || '');
    setNewItemUsername(record.secret?.username || '');
    setNewItemPassword(record.secret?.password || '');
    setNewItemUrl(record.secret?.url || '');
    setNewItemTotpSecret(record.secret?.totpSecret || '');
    setNewItemNotes(record.secret?.notes || '');
    setDrawerError(null);
    setShowAddDrawer(true);
  };

  useEffect(() => {
    let isMounted = true;

    const updateAllTotp = async () => {
      const updated: Record<string, { code: string; secondsRemaining: number }> = {};
      for (const { item, secret } of items) {
        if (secret?.totpSecret) {
          try {
            const res = await generateTOTP(secret.totpSecret);
            if (isMounted) {
              updated[item.id] = res;
            }
          } catch {
            // Invalid key ignored
          }
        }
      }
      if (isMounted) {
        setTotpCodes(updated);
      }
    };

    updateAllTotp();
    const timer = setInterval(updateAllTotp, 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [items]);

  // Keep viewingRecord in sync when items update
  useEffect(() => {
    if (viewingRecord) {
      const updated = items.find((it) => it.item.id === viewingRecord.item.id);
      if (updated) {
        setViewingRecord(updated);
      }
    }
  }, [items]);

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, id: string, label = 'Copied') => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(label);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      setIsSaving(true);
      setDrawerError(null);

      const secretPayload: LoginFields = {
        username: newItemUsername,
        password: newItemPassword,
        url: newItemUrl || undefined,
        totpSecret: newItemTotpSecret.trim() || undefined,
        notes: newItemNotes || undefined,
      };

      const encryptedData = await encryptVaultRecord(secretPayload, activeKey);

      let updatedItems: VaultItem[];

      if (editingItemId) {
        // Edit existing record
        updatedItems = snapshot.items.map((it) =>
          it.id === editingItemId
            ? {
                ...it,
                type: newItemType,
                title: newItemTitle.trim(),
                updatedAt: Date.now(),
                encryptedData,
              }
            : it
        );
      } else {
        // Create new record
        const newItem: VaultItem = {
          id: crypto.randomUUID(),
          type: newItemType,
          title: newItemTitle.trim(),
          favorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          encryptedData,
        };
        updatedItems = [...snapshot.items, newItem];
      }

      const updatedSnapshot: VaultSnapshot = {
        ...snapshot,
        updatedAt: Date.now(),
        items: updatedItems,
      };

      await saveVaultSnapshot(updatedSnapshot);
      await onRefreshItems();

      // Reset form state and close drawer
      setEditingItemId(null);
      setNewItemTitle('');
      setNewItemUsername('');
      setNewItemPassword('');
      setNewItemUrl('');
      setNewItemTotpSecret('');
      setNewItemNotes('');
      setShowAddDrawer(false);
      showToast(editingItemId ? 'Record updated' : 'Record created');
    } catch (err: any) {
      setDrawerError(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const updatedSnapshot: VaultSnapshot = {
        ...snapshot,
        updatedAt: Date.now(),
        items: snapshot.items.filter((i) => i.id !== itemId),
      };

      await saveVaultSnapshot(updatedSnapshot);
      await onRefreshItems();
      if (viewingRecord?.item.id === itemId) {
        setViewingRecord(null);
      }
      setConfirmDeleteId(null);
      showToast('Record deleted');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const filteredItems = items.filter((record) => {
    const query = searchQuery.toLowerCase();
    return (
      record.item.title.toLowerCase().includes(query) ||
      (record.secret?.username && record.secret.username.toLowerCase().includes(query)) ||
      (record.secret?.url && record.secret.url.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100 p-1.5">
              <MountainIcon className="w-full h-full" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">Mountain</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowBackupModal(true)}
              className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs transition focus-ring ${
                hasUnbackedChanges
                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white font-semibold border border-rose-600/80 shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium border border-zinc-800'
              }`}
              title={
                hasUnbackedChanges
                  ? 'You have unbacked vault items! Click to backup to local file or Google Drive.'
                  : 'Backup Vault'
              }
            >
              {hasUnbackedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
              <DownloadCloud
                className={`w-3.5 h-3.5 ${hasUnbackedChanges ? 'text-rose-400' : 'text-zinc-400'}`}
              />
              <span>Backup</span>
            </button>
            <button
              onClick={onLock}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
              title="Lock Vault"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-28 sm:pb-12">
        {/* Search & Actions Bar */}
        <div className="flex gap-2.5 items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records (press / to focus)..."
              className="w-full pl-10 pr-9 py-2 bg-zinc-900 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 p-0.5 text-zinc-400 hover:text-zinc-200 rounded transition focus-ring"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={openAddDrawer}
            className="flex items-center space-x-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm tactile-btn whitespace-nowrap focus-ring"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>New Record</span>
          </button>
        </div>

        {/* Item Cards / Dense List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Key className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-200">No credentials found</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'No records match your search filter.'
                  : 'Your vault is empty. Click New Record to store your first login.'}
              </p>
            </div>
            <button
              onClick={openAddDrawer}
              className="inline-flex items-center space-x-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-xl transition shadow-sm tactile-btn mt-2 focus-ring"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.map(({ item, secret }) => {
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setViewingRecord({ item, secret });
                  }}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3 sm:p-3.5 transition group cursor-pointer hover:bg-zinc-850/80 flex items-center justify-between focus-ring"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setViewingRecord({ item, secret });
                    }
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <FaviconBadge
                      url={secret.url}
                      type={item.type}
                      className="group-hover:border-zinc-700 transition"
                    />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-zinc-100 text-sm sm:text-base truncate group-hover:text-white transition">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                        {secret.username || (secret.url ? secret.url.replace(/^https?:\/\//, '') : 'Secure Record')}
                      </p>
                    </div>
                  </div>

                  {/* Quick action buttons on card */}
                  <div
                    className="flex items-center space-x-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {secret.password && (
                      <button
                        onClick={() => copyToClipboard(secret.password, `pass-${item.id}`, 'Password copied')}
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition focus-ring"
                        title="Copy password"
                      >
                        {copiedId === `pass-${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => openEditDrawer({ item, secret })}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition focus-ring"
                      title="Edit record"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* VIEW RECORD DETAIL MODAL */}
      {viewingRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setViewingRecord(null);
              setConfirmDeleteId(null);
            }}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-900">
              <div className="flex items-center space-x-3.5 min-w-0">
                <FaviconBadge
                  url={viewingRecord.secret?.url}
                  type={viewingRecord.item.type}
                  size="lg"
                />
                <div className="min-w-0">
                  <h3 id="record-detail-title" className="text-base sm:text-lg font-bold text-zinc-100 truncate">
                    {viewingRecord.item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                      {viewingRecord.item.type.replace('_', ' ')}
                    </span>
                    {viewingRecord.secret?.url && (
                      <a
                        href={
                          viewingRecord.secret.url.startsWith('http')
                            ? viewingRecord.secret.url
                            : `https://${viewingRecord.secret.url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors truncate focus-ring rounded"
                      >
                        <span className="truncate max-w-[180px]">
                          {viewingRecord.secret.url.replace(/^https?:\/\//, '')}
                        </span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewingRecord(null);
                  setConfirmDeleteId(null);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus-ring"
                aria-label="Close record detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details body */}
            <div className="p-5 space-y-4 overflow-y-auto min-w-0">
              {/* Username Field */}
              {viewingRecord.secret?.username && (
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-zinc-300">Username / Email</label>
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                    <span className="font-mono text-sm text-zinc-100 select-all truncate min-w-0 flex-1">
                      {viewingRecord.secret.username}
                    </span>
                    <button
                      onClick={() => copyToClipboard(viewingRecord.secret.username, 'modal-user', 'Username copied')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring shrink-0"
                    >
                      {copiedId === 'modal-user' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'modal-user' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Password Field */}
              {viewingRecord.secret?.password && (
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                    <span className="font-mono text-sm text-zinc-100 tracking-wider select-all truncate min-w-0 flex-1">
                      {revealedPasswords[viewingRecord.item.id]
                        ? viewingRecord.secret.password
                        : '••••••••••••••••••••'}
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => togglePasswordVisibility(viewingRecord.item.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition focus-ring"
                        title={revealedPasswords[viewingRecord.item.id] ? 'Hide password' : 'Show password'}
                      >
                        {revealedPasswords[viewingRecord.item.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(viewingRecord.secret.password, 'modal-pass', 'Password copied')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                      >
                        {copiedId === 'modal-pass' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === 'modal-pass' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Improved 2FA Authenticator Display */}
              {viewingRecord.secret?.totpSecret && (
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-zinc-300">Two-Factor Authentication</label>
                  {totpCodes[viewingRecord.item.id] ? (
                    <TotpDisplay
                      code={totpCodes[viewingRecord.item.id].code}
                      secondsRemaining={totpCodes[viewingRecord.item.id].secondsRemaining}
                      onCopy={(c) => copyToClipboard(c, 'modal-totp', 'TOTP code copied')}
                      copied={copiedId === 'modal-totp'}
                    />
                  ) : (
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-400 font-mono">
                      Generating TOTP passcode...
                    </div>
                  )}
                </div>
              )}

              {/* Notes Field */}
              {viewingRecord.secret?.notes && (
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Secure Notes</label>
                    <button
                      onClick={() => copyToClipboard(viewingRecord.secret.notes, 'modal-notes', 'Notes copied')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                    >
                      {copiedId === 'modal-notes' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'modal-notes' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] max-h-60 overflow-y-auto leading-relaxed select-text">
                    {viewingRecord.secret.notes}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-2 text-xs font-mono text-zinc-400 flex justify-between">
                <span>Created {new Date(viewingRecord.item.createdAt).toLocaleDateString()}</span>
                <span>Updated {new Date(viewingRecord.item.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
              {confirmDeleteId === viewingRecord.item.id ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const toDelete = viewingRecord.item.id;
                      handleDeleteItem(toDelete);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition shadow-sm focus-ring"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition focus-ring"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(viewingRecord.item.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs font-medium transition focus-ring"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const toEdit = viewingRecord;
                    setViewingRecord(null);
                    setConfirmDeleteId(null);
                    openEditDrawer(toEdit);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-sm tactile-btn focus-ring"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW/EDIT RECORD RIGHT SIDEBAR DRAWER */}
      {showAddDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          className="fixed inset-0 z-50 flex justify-end animate-fade-in"
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setShowAddDrawer(false);
              setDrawerError(null);
            }}
          />

          {/* Right-docked Drawer Window */}
          <div className="relative z-10 w-full sm:w-[450px] max-w-[92vw] h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col min-w-0">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shrink-0">
                  {editingItemId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 id="drawer-title" className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                    {editingItemId ? 'Edit Record' : 'New Record'}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    {editingItemId ? 'Update stored encrypted credentials' : 'Encrypted with AES-256-GCM'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddDrawer(false);
                  setDrawerError(null);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors focus-ring shrink-0"
                title="Close drawer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {drawerError && (
              <div className="m-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-snug">{drawerError}</span>
              </div>
            )}

            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-w-0">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Record Title</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. GitHub, AWS, ProtonMail"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Username or Email</label>
                <input
                  type="text"
                  value={newItemUsername}
                  onChange={(e) => setNewItemUsername(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1 transition-colors focus-ring rounded"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Secure</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newItemPassword}
                  onChange={(e) => setNewItemPassword(e.target.value)}
                  placeholder="Enter or generate..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition tracking-wide"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Website URL</label>
                  {newItemUrl && extractDomain(newItemUrl) && (
                    <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                      <span>Detected:</span>
                      <span className="text-zinc-200 font-medium">{extractDomain(newItemUrl)}</span>
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={newItemUrl}
                    onChange={(e) => setNewItemUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full pl-3.5 pr-11 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                  />
                  {newItemUrl && extractDomain(newItemUrl) && (
                    <div className="absolute right-2.5 flex items-center pointer-events-none">
                      <FaviconBadge
                        url={newItemUrl}
                        type="LOGIN"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 2FA Authenticator Section */}
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Two-Factor Auth (2FA / TOTP)</span>
                  </label>
                  <span className="text-xs font-mono text-zinc-400">Optional</span>
                </div>
                <input
                  type="text"
                  value={newItemTotpSecret}
                  onChange={(e) => setNewItemTotpSecret(e.target.value.replace(/\s+/g, '').toUpperCase())}
                  placeholder="Paste Base32 secret (e.g. JBSWY3DPEHPK3PXP)"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono tracking-wider text-emerald-300 placeholder-zinc-600 outline-none transition"
                />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Generates rotating 6-digit verification codes locally on your device hardware.
                </p>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-medium text-zinc-300">Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="Recovery codes, security questions, account numbers..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 outline-none resize-y min-h-[80px] max-h-60 font-sans leading-relaxed break-words break-all [overflow-wrap:anywhere]"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDrawer(false);
                    setDrawerError(null);
                  }}
                  className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-sm transition border border-zinc-800 focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-sm transition shadow-sm tactile-btn disabled:opacity-40 focus-ring"
                >
                  {isSaving ? 'Encrypting Record...' : editingItemId ? 'Update & Encrypt' : 'Save & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSPRNG Generator Modal */}
      <PasswordGeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onSelectPassword={(pwd) => {
          setNewItemPassword(pwd);
          setShowGenerator(false);
        }}
      />

      {/* Encrypted Vault Backup Modal */}
      <VaultBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        snapshot={snapshot}
        onBackupSuccess={handleBackupSuccess}
      />

      {/* Mobile Bottom Bar */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 z-20">
        <div className="p-2 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl flex items-center justify-around">
          <button
            onClick={openAddDrawer}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-zinc-100 text-zinc-950 font-semibold rounded-xl text-xs shadow-sm tactile-btn focus-ring"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>
          <div className="w-[1px] h-6 bg-zinc-800 mx-2" />
          <button
            onClick={() => setShowGenerator(true)}
            className="p-2.5 text-zinc-400 hover:text-white rounded-xl focus-ring"
            title="Password Generator"
            aria-label="Open Password Generator"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none animate-fade-in">
          <div className="px-4 py-2.5 bg-zinc-900/95 border border-zinc-700 text-zinc-100 text-xs font-medium rounded-xl shadow-xl backdrop-blur-md flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
