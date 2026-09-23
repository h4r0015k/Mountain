import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  VaultSnapshot,
  VaultItemType,
  LoginFields,
  CardFields,
  ApiKeyFields,
  SecureNoteFields,
  VaultSecretPayload,
  DecryptedRecord,
} from '../models/vault.js';
import { encryptVaultRecord } from '../crypto/vault.js';
import { saveVaultSnapshot } from '../storage/indexeddb.js';
import { generateTOTP } from '../crypto/totp.js';
import { createAuthCheckPayload } from '../backup/index.js';
import { PasswordGeneratorModal } from './PasswordGeneratorModal.js';
import { VaultBackupModal } from './VaultBackupModal.js';
import { MountainIcon } from './ShowcaseDashboard.js';
import {
  Lock,
  Plus,
  Search,
  Key,
  CreditCard,
  Terminal,
  FileText,
  Copy,
  Check,
  X,
  Pencil,
  DownloadCloud,
  Layers,
  Puzzle,
  Shield,
  Clock,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { CompanionPairingModal } from '../companion/CompanionPairingModal.js';
import { CompanionBridgeHook } from '../companion/useCompanionBridge.js';
import { useAutoLock, AutoLockTimeout } from '../hooks/useAutoLock.js';

// Extracted modular components
import { FaviconBadge, extractDomain } from './vault/FaviconBadge.js';
import { CategoryTypeBadge, RecordItemIconBadge, getTypeLabel } from './vault/CategoryBadges.js';
import { RecordDetailPane } from './vault/RecordDetailPane.js';
import { RecordFormDrawer } from './vault/RecordFormDrawer.js';
import { VaultSettingsModal } from './vault/VaultSettingsModal.js';

export { extractDomain };
export type { DecryptedRecord } from '../models/vault.js';

interface Props {
  snapshot: VaultSnapshot;
  activeKey: CryptoKey;
  items: DecryptedRecord[];
  onLock: () => void;
  onRefreshItems: () => Promise<void>;
  companion?: CompanionBridgeHook;
  onReturnToOverview?: () => void;
}

export const VaultDashboard: React.FC<Props> = ({
  snapshot,
  activeKey,
  items,
  onLock,
  onRefreshItems,
  companion,
  onReturnToOverview,
}) => {
  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | VaultItemType>('ALL');

  // Overlays & modals
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<DecryptedRecord | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorTarget, setGeneratorTarget] = useState<'password' | 'apiKey'>('password');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showCompanionModal, setShowCompanionModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Field states & feedback
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Privacy: Allow external favicon fetch (Default: FALSE to eliminate domain leaks)
  const [allowFavicons, setAllowFavicons] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mountain_privacy_favicons') === 'true';
    } catch {
      return false;
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const clipboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-lock hook
  const { timeoutMinutes, setTimeoutMinutes } = useAutoLock(onLock);

  // Form states for new/edit drawer
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<VaultItemType>('LOGIN');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUsername, setNewItemUsername] = useState('');
  const [newItemPassword, setNewItemPassword] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemTotpSecret, setNewItemTotpSecret] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [apiService, setApiService] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [noteContent, setNoteContent] = useState('');
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

  // Clipboard copy with 30s auto-clear safety
  const copyToClipboard = async (text: string, id: string, label = 'Copied') => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(label);
    setTimeout(() => setCopiedId(null), 1500);

    // Auto-clear clipboard after 30s for security
    if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
    clipboardTimerRef.current = setTimeout(async () => {
      try {
        const currentClip = await navigator.clipboard.readText();
        if (currentClip === text) {
          await navigator.clipboard.writeText('');
          showToast('Clipboard cleared for security');
        }
      } catch {}
    }, 30000);
  };

  // Keyboard shortcut listeners (Esc to close, Slash or Cmd+K to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

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

      if (!isInput) {
        if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddDrawer, viewingRecord, searchQuery]);

  // Periodic TOTP calculation
  useEffect(() => {
    const computeCodes = async () => {
      const nextCodes: Record<string, { code: string; secondsRemaining: number }> = {};
      for (const { item, secret } of items) {
        if (item.type === 'LOGIN' && secret?.totpSecret) {
          try {
            const totp = await generateTOTP(secret.totpSecret);
            nextCodes[item.id] = { code: totp.code, secondsRemaining: totp.secondsRemaining };
          } catch {}
        }
      }
      setTotpCodes(nextCodes);
    };

    computeCodes();
    const interval = setInterval(computeCodes, 1000);
    return () => clearInterval(interval);
  }, [items]);

  const toggleFieldVisibility = (fieldKey: string) => {
    setRevealedFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const openAddDrawer = (type: VaultItemType = 'LOGIN') => {
    setEditingItemId(null);
    setNewItemType(type);
    setNewItemTitle('');
    setNewItemUsername('');
    setNewItemPassword('');
    setNewItemUrl('');
    setNewItemTotpSecret('');
    setCardHolder('');
    setCardNumber('');
    setCardExp('');
    setCardCvv('');
    setCardPin('');
    setApiService('');
    setApiKey('');
    setApiSecret('');
    setApiEndpoint('');
    setNoteContent('');
    setNewItemNotes('');
    setDrawerError(null);
    setShowAddDrawer(true);
  };

  const openEditDrawer = (record: DecryptedRecord) => {
    const { item, secret } = record;
    setEditingItemId(item.id);
    setNewItemType(item.type);
    setNewItemTitle(item.title);
    setNewItemNotes(secret?.notes || '');
    setDrawerError(null);

    if (item.type === 'LOGIN') {
      setNewItemUsername(secret?.username || '');
      setNewItemPassword(secret?.password || '');
      setNewItemUrl(secret?.url || '');
      setNewItemTotpSecret(secret?.totpSecret || '');
    } else if (item.type === 'CARD') {
      setCardHolder(secret?.cardholderName || '');
      setCardNumber(secret?.cardNumber || '');
      setCardExp(secret?.expirationDate || '');
      setCardCvv(secret?.cvv || '');
      setCardPin(secret?.pin || '');
    } else if (item.type === 'API_KEY') {
      setApiService(secret?.serviceName || '');
      setApiKey(secret?.apiKey || '');
      setApiSecret(secret?.apiSecret || '');
      setApiEndpoint(secret?.endpointUrl || '');
    } else if (item.type === 'SECURE_NOTE') {
      setNoteContent(secret?.content || '');
    }

    setShowAddDrawer(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      setIsSaving(true);
      setDrawerError(null);

      let secretPayload: VaultSecretPayload;
      if (newItemType === 'LOGIN') {
        secretPayload = {
          username: newItemUsername,
          password: newItemPassword,
          url: newItemUrl || undefined,
          totpSecret: newItemTotpSecret.trim() || undefined,
          notes: newItemNotes || undefined,
        } as LoginFields;
      } else if (newItemType === 'CARD') {
        secretPayload = {
          cardholderName: cardHolder,
          cardNumber: cardNumber.replace(/\s+/g, ''),
          expirationDate: cardExp || undefined,
          cvv: cardCvv || undefined,
          pin: cardPin || undefined,
          notes: newItemNotes || undefined,
        } as CardFields;
      } else if (newItemType === 'API_KEY') {
        secretPayload = {
          serviceName: apiService || undefined,
          apiKey: apiKey,
          apiSecret: apiSecret || undefined,
          endpointUrl: apiEndpoint || undefined,
          notes: newItemNotes || undefined,
        } as ApiKeyFields;
      } else {
        secretPayload = {
          title: newItemTitle,
          content: noteContent,
          notes: newItemNotes || undefined,
        } as SecureNoteFields;
      }

      const encryptedData = await encryptVaultRecord(secretPayload, activeKey);

      let updatedItems = [...snapshot.items];
      if (editingItemId) {
        const idx = updatedItems.findIndex((i) => i.id === editingItemId);
        if (idx !== -1) {
          updatedItems[idx] = {
            ...updatedItems[idx],
            title: newItemTitle.trim(),
            updatedAt: Date.now(),
            encryptedData,
          };
        }
      } else {
        const newItem = {
          id: crypto.randomUUID(),
          type: newItemType,
          title: newItemTitle.trim(),
          favorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          encryptedData,
        };
        updatedItems = [newItem, ...updatedItems];
      }

      let authCheck = snapshot.authCheck;
      if (!authCheck) {
        try {
          authCheck = await createAuthCheckPayload(activeKey, snapshot.vaultId);
        } catch {}
      }

      const updatedSnapshot: VaultSnapshot = {
        ...snapshot,
        authCheck,
        updatedAt: Date.now(),
        items: updatedItems,
      };

      await saveVaultSnapshot(updatedSnapshot);
      await onRefreshItems();

      setEditingItemId(null);
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

  // Category counts
  const counts = useMemo(() => {
    const res: Record<'ALL' | VaultItemType, number> = {
      ALL: items.length,
      LOGIN: 0,
      CARD: 0,
      API_KEY: 0,
      SECURE_NOTE: 0,
    };
    for (const { item } of items) {
      if (item.type in res) res[item.type]++;
    }
    return res;
  }, [items]);

  const filteredItems = items.filter((record) => {
    if (selectedCategory !== 'ALL' && record.item.type !== selectedCategory) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const titleMatch = record.item.title.toLowerCase().includes(q);
    const sec = record.secret || {};

    if (record.item.type === 'LOGIN') {
      return (
        titleMatch ||
        (sec.username && sec.username.toLowerCase().includes(q)) ||
        (sec.url && sec.url.toLowerCase().includes(q))
      );
    }
    if (record.item.type === 'CARD') {
      return (
        titleMatch ||
        (sec.cardholderName && sec.cardholderName.toLowerCase().includes(q)) ||
        (sec.cardNumber && sec.cardNumber.includes(q))
      );
    }
    if (record.item.type === 'API_KEY') {
      return (
        titleMatch ||
        (sec.serviceName && sec.serviceName.toLowerCase().includes(q)) ||
        (sec.apiKey && sec.apiKey.toLowerCase().includes(q))
      );
    }
    if (record.item.type === 'SECURE_NOTE') {
      return titleMatch || (sec.content && sec.content.toLowerCase().includes(q));
    }
    return titleMatch;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onReturnToOverview}
              className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-zinc-900 transition focus-ring group"
              title="Return to Overview"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100 p-1.5 group-hover:border-zinc-500 transition">
                <MountainIcon className="w-full h-full" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-zinc-100">Mountain</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2">
            {/* Settings & Privacy Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
              title="Vault Settings & Privacy"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {companion && (
              <button
                onClick={() => setShowCompanionModal(true)}
                className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs transition focus-ring ${
                  companion.isPaired
                    ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 font-semibold border border-emerald-600/40 shadow-sm'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium border border-zinc-800'
                }`}
                title={companion.isPaired ? 'Companion: Paired & Active' : 'Pair Companion Extension'}
              >
                <Puzzle className={`w-3.5 h-3.5 ${companion.isPaired ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span className="hidden sm:inline">Companion</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    companion.isPaired ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`}
                />
              </button>
            )}

            <button
              onClick={() => setShowBackupModal(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
              title="Backup Vault"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-zinc-400" />
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
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-4 pb-28 sm:pb-12">
        {/* Search & Actions Bar */}
        <div className="flex gap-2.5 items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, username, card, or key (/ to focus)..."
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
            onClick={() => openAddDrawer(selectedCategory !== 'ALL' ? selectedCategory : 'LOGIN')}
            className="flex items-center space-x-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-semibold rounded-xl transition shadow-sm tactile-btn whitespace-nowrap focus-ring"
          >
            <Plus className="w-4 h-4 text-zinc-950" />
            <span>New Record</span>
          </button>
        </div>

        {/* Category Filter Bar */}
        <div className="p-1 bg-zinc-900/90 border border-zinc-800/90 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none">
          {(['ALL', 'LOGIN', 'CARD', 'API_KEY', 'SECURE_NOTE'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition focus-ring whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
              }`}
            >
              {cat === 'ALL' && <Layers className="w-3.5 h-3.5" />}
              {cat === 'LOGIN' && <Key className="w-3.5 h-3.5" />}
              {cat === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
              {cat === 'API_KEY' && <Terminal className="w-3.5 h-3.5 text-indigo-400" />}
              {cat === 'SECURE_NOTE' && <FileText className="w-3.5 h-3.5" />}
              <span>{cat === 'ALL' ? 'All' : cat === 'LOGIN' ? 'Logins' : cat === 'CARD' ? 'Cards' : cat === 'API_KEY' ? 'API Keys' : 'Notes'}</span>
              <span className="text-zinc-400 text-xs font-mono ml-0.5">{counts[cat]}</span>
            </button>
          ))}
        </div>

        {/* Record Cards Grid */}
        {filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-8">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-zinc-300">No records found</div>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No matches for "${searchQuery}". Clear your search or create a new entry.`
                  : 'Your encrypted vault is empty. Click "New Record" to start.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.map(({ item, secret }) => (
              <div
                key={item.id}
                onClick={() => setViewingRecord({ item, secret })}
                className="group p-4 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl transition duration-150 cursor-pointer flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                  <RecordItemIconBadge
                    type={item.type}
                    url={item.type === 'LOGIN' ? secret?.url : undefined}
                    title={item.title}
                    size="md"
                    allowExternalFetch={allowFavicons}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-100 group-hover:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-400 truncate mt-0.5">
                      {item.type === 'LOGIN' && (secret?.username || 'No username')}
                      {item.type === 'CARD' &&
                        (secret?.cardNumber ? `•••• ${secret.cardNumber.slice(-4)}` : 'Card')}
                      {item.type === 'API_KEY' && (secret?.serviceName || 'API Key')}
                      {item.type === 'SECURE_NOTE' && (secret?.content ? 'Encrypted text note' : 'Empty note')}
                    </div>
                  </div>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {item.type === 'LOGIN' && secret?.password && (
                    <button
                      onClick={() => copyToClipboard(secret.password, `pass-${item.id}`, 'Password copied (auto-clears in 30s)')}
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
                  {item.type === 'CARD' && secret?.cardNumber && (
                    <button
                      onClick={() => copyToClipboard(secret.cardNumber, `card-${item.id}`, 'Card number copied')}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition focus-ring"
                      title="Copy card number"
                    >
                      {copiedId === `card-${item.id}` ? (
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
            ))}
          </div>
        )}
      </main>

      {/* Record Detail Pane */}
      {viewingRecord && (
        <RecordDetailPane
          record={viewingRecord}
          revealedFields={revealedFields}
          copiedId={copiedId}
          confirmDeleteId={confirmDeleteId}
          totpCodes={totpCodes}
          allowExternalFavicon={allowFavicons}
          onClose={() => {
            setViewingRecord(null);
            setConfirmDeleteId(null);
          }}
          onToggleField={toggleFieldVisibility}
          onCopy={copyToClipboard}
          onEdit={(rec) => {
            setViewingRecord(null);
            setConfirmDeleteId(null);
            openEditDrawer(rec);
          }}
          onDelete={handleDeleteItem}
          onSetConfirmDelete={setConfirmDeleteId}
        />
      )}

      {/* Record Add/Edit Drawer */}
      <RecordFormDrawer
        isOpen={showAddDrawer}
        editingItemId={editingItemId}
        newItemType={newItemType}
        setNewItemType={setNewItemType}
        newItemTitle={newItemTitle}
        setNewItemTitle={setNewItemTitle}
        newItemUsername={newItemUsername}
        setNewItemUsername={setNewItemUsername}
        newItemPassword={newItemPassword}
        setNewItemPassword={setNewItemPassword}
        newItemUrl={newItemUrl}
        setNewItemUrl={setNewItemUrl}
        newItemTotpSecret={newItemTotpSecret}
        setNewItemTotpSecret={setNewItemTotpSecret}
        cardHolder={cardHolder}
        setCardHolder={setCardHolder}
        cardNumber={cardNumber}
        setCardNumber={setCardNumber}
        cardExp={cardExp}
        setCardExp={setCardExp}
        cardCvv={cardCvv}
        setCardCvv={setCardCvv}
        cardPin={cardPin}
        setCardPin={setCardPin}
        apiService={apiService}
        setApiService={setApiService}
        apiKey={apiKey}
        setApiKey={setApiKey}
        apiSecret={apiSecret}
        setApiSecret={setApiSecret}
        apiEndpoint={apiEndpoint}
        setApiEndpoint={setApiEndpoint}
        noteContent={noteContent}
        setNoteContent={setNoteContent}
        newItemNotes={newItemNotes}
        setNewItemNotes={setNewItemNotes}
        isSaving={isSaving}
        drawerError={drawerError}
        onClose={() => {
          setShowAddDrawer(false);
          setDrawerError(null);
        }}
        onSubmit={handleSaveItem}
        onOpenGenerator={(t) => {
          setGeneratorTarget(t);
          setShowGenerator(true);
        }}
      />

      {/* Password Generator Modal */}
      {showGenerator && (
        <PasswordGeneratorModal
          isOpen={showGenerator}
          onClose={() => setShowGenerator(false)}
          onSelect={(pass) => {
            if (generatorTarget === 'password') {
              setNewItemPassword(pass);
            } else {
              setApiKey(pass);
            }
            setShowGenerator(false);
          }}
        />
      )}

      {/* Vault Backup Modal */}
      {showBackupModal && (
        <VaultBackupModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          snapshot={snapshot}
          onBackupSuccess={() => showToast('Backup saved successfully')}
        />
      )}

      {/* Companion Extension Pairing Modal */}
      {showCompanionModal && companion && (
        <CompanionPairingModal
          isOpen={showCompanionModal}
          onClose={() => setShowCompanionModal(false)}
          pairingCode={companion.pairingCode}
          isPaired={companion.isPaired}
          onGenerateNewCode={companion.generateNewPairingCode}
          onUnpair={companion.unpair}
        />
      )}

      {/* Vault Settings & Privacy Modal */}
      {showSettingsModal && (
        <VaultSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          timeoutMinutes={timeoutMinutes}
          onTimeoutChange={setTimeoutMinutes}
          allowFavicons={allowFavicons}
          onToggleFavicons={setAllowFavicons}
          snapshot={snapshot}
          onShowToast={showToast}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-100 shadow-xl flex items-center space-x-2 animate-fade-in pointer-events-none">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default VaultDashboard;
