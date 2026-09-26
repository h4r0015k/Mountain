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
  Clock,
  CheckCircle2,
  Settings,
  Star,
  ChevronRight,
  FileUp,
  ArrowLeft,
} from 'lucide-react';
import { CompanionBridgeHook } from '../companion/useCompanionBridge.js';
import { useAutoLock } from '../hooks/useAutoLock.js';

// Extracted modular components
import { extractDomain } from './vault/FaviconBadge.js';
import { RecordItemIconBadge } from './vault/CategoryBadges.js';
import { RecordDetailPane } from './vault/RecordDetailPane.js';
import { RecordFormDrawer } from './vault/RecordFormDrawer.js';
import { VaultSettingsView, SettingsTab } from './vault/VaultSettingsView.js';
import { VaultImportView } from './vault/VaultImportView.js';

export { extractDomain };
export type { DecryptedRecord } from '../models/vault.js';

export function renderFormattedTitle(title: string) {
  if (!title) return 'Untitled';
  const trimmed = title.trim();
  const domain = extractDomain(trimmed) || (trimmed.includes('.') && !trimmed.includes(' ') ? trimmed : null);

  if (domain && domain.includes('.')) {
    const parts = domain.split('.');
    if (parts.length >= 3) {
      // Subdomain (e.g. "dev-wealthpay") + Root domain (e.g. "junomoney.org")
      const sub = parts.slice(0, -2).join('.');
      const root = parts.slice(-2).join('.');
      return (
        <span className="truncate inline-flex items-baseline gap-0.5">
          <span className="font-semibold text-zinc-100">{sub}</span>
          <span className="text-zinc-500 font-normal text-[11px]">.{root}</span>
        </span>
      );
    }
  }

  return <span className="font-semibold text-zinc-100 truncate">{title}</span>;
}

export type CategoryFilter = 'ALL' | 'FAVORITES' | VaultItemType;
export type ActiveDashboardView = 'vault' | 'import' | 'settings';

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
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');

  // Master-Detail selection & mobile drawer
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Top-level workspace views & overlays
  const [activeView, setActiveView] = useState<ActiveDashboardView>('vault');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('security');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorTarget, setGeneratorTarget] = useState<'password' | 'apiKey'>('password');

  const openSettings = (tab: SettingsTab = 'security') => {
    setSettingsTab(tab);
    setActiveView('settings');
  };

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

  const isMac = useMemo(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  }, []);

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
        let shouldClear = true;
        try {
          // If the page is focused and reading is permitted, check if the clipboard still contains the secret
          const currentClip = await navigator.clipboard.readText();
          if (currentClip && currentClip !== text) {
            shouldClear = false;
          }
        } catch {
          // User switched apps/tabs or permission denied: proceed with clearing to protect secret
          shouldClear = true;
        }

        if (shouldClear) {
          await navigator.clipboard.writeText('');
          showToast('Clipboard cleared for security');
        }
      } catch {}
    }, 30000);
  };

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
      let targetId = editingItemId;
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
        const newId = crypto.randomUUID();
        targetId = newId;
        const newItem = {
          id: newId,
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

      if (targetId) {
        setSelectedRecordId(targetId);
      }
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
      if (selectedRecordId === itemId) {
        setSelectedRecordId(null);
      }
      setMobileDrawerOpen(false);
      setConfirmDeleteId(null);
      showToast('Record deleted');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updatedItems = snapshot.items.map((it) => {
        if (it.id === itemId) {
          return { ...it, favorite: !it.favorite, updatedAt: Date.now() };
        }
        return it;
      });
      const updatedSnapshot: VaultSnapshot = {
        ...snapshot,
        updatedAt: Date.now(),
        items: updatedItems,
      };
      await saveVaultSnapshot(updatedSnapshot);
      await onRefreshItems();
    } catch (err: any) {
      showToast(`Favorite failed: ${err.message}`);
    }
  };

  // Category counts
  const counts = useMemo(() => {
    const res: Record<CategoryFilter, number> = {
      ALL: items.length,
      FAVORITES: 0,
      LOGIN: 0,
      CARD: 0,
      API_KEY: 0,
      SECURE_NOTE: 0,
    };
    for (const { item } of items) {
      if (item.favorite) res.FAVORITES++;
      if (item.type in res) res[item.type]++;
    }
    return res;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((record) => {
      if (selectedCategory === 'FAVORITES') {
        if (!record.item.favorite) return false;
      } else if (selectedCategory !== 'ALL' && record.item.type !== selectedCategory) {
        return false;
      }

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
  }, [items, selectedCategory, searchQuery]);

  // Derived selected record object
  const selectedRecord = useMemo(() => {
    return items.find((r) => r.item.id === selectedRecordId) || null;
  }, [items, selectedRecordId]);

  // Auto-select first item when category changes
  useEffect(() => {
    if (filteredItems.length > 0) {
      setSelectedRecordId(filteredItems[0].item.id);
    } else {
      setSelectedRecordId(null);
    }
  }, [selectedCategory]);

  // Ensure selection remains valid when filtered list changes (e.g. deletion)
  useEffect(() => {
    if (selectedRecordId && !filteredItems.some((r) => r.item.id === selectedRecordId)) {
      setSelectedRecordId(filteredItems.length > 0 ? filteredItems[0].item.id : null);
    }
  }, [filteredItems, selectedRecordId]);

  // Keyboard shortcut listeners (Esc to close/clear, Slash or Cmd+K to search, Up/Down to navigate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        // 1. Top-level workspace views (Settings / Import)
        if (activeView === 'settings' || activeView === 'import') {
          setActiveView('vault');
          return;
        }
        if (showGenerator) {
          setShowGenerator(false);
          return;
        }

        // 2. Inline confirmation dialogs
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
          return;
        }

        // 3. Add/Edit form drawer
        if (showAddDrawer) {
          setShowAddDrawer(false);
          setDrawerError(null);
          return;
        }

        // 4. Mobile detail slide-over
        if (mobileDrawerOpen) {
          setMobileDrawerOpen(false);
          setConfirmDeleteId(null);
          return;
        }

        // 5. Active search query (clear & unfocus)
        if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
          return;
        }

        // 6. Selected record in desktop pane
        if (selectedRecordId) {
          setSelectedRecordId(null);
          setConfirmDeleteId(null);
          return;
        }
        return;
      }

      if (!isInput) {
        if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
          e.preventDefault();
          searchInputRef.current?.focus();
          return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          if (filteredItems.length === 0) return;
          e.preventDefault();
          const currentIndex = filteredItems.findIndex((r) => r.item.id === selectedRecordId);
          if (e.key === 'ArrowDown') {
            const nextIndex = currentIndex < filteredItems.length - 1 ? currentIndex + 1 : 0;
            setSelectedRecordId(filteredItems[nextIndex].item.id);
          } else {
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredItems.length - 1;
            setSelectedRecordId(filteredItems[prevIndex].item.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeView,
    showGenerator,
    confirmDeleteId,
    showAddDrawer,
    mobileDrawerOpen,
    selectedRecordId,
    searchQuery,
    filteredItems,
  ]);

  const categoryNavItems: Array<{
    id: CategoryFilter;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
  }> = [
    { id: 'ALL', label: 'All Items', icon: Layers },
    { id: 'FAVORITES', label: 'Favorites', icon: Star, color: 'text-amber-400' },
    { id: 'LOGIN', label: 'Logins', icon: Key, color: 'text-blue-400' },
    { id: 'CARD', label: 'Cards', icon: CreditCard, color: 'text-amber-400' },
    { id: 'API_KEY', label: 'API Keys', icon: Terminal, color: 'text-indigo-400' },
    { id: 'SECURE_NOTE', label: 'Notes', icon: FileText, color: 'text-emerald-400' },
  ];

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white overflow-hidden">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md shrink-0 z-20">
        <div className="w-full px-4 py-2.5 flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {activeView === 'import' ? (
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveView('vault')}
                  className="flex items-center space-x-1.5 py-1 px-2.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Back to Vault</span>
                </button>
                <span className="text-zinc-700">/</span>
                <span className="text-xs font-semibold text-zinc-200">Import</span>
              </div>
            ) : activeView === 'settings' ? (
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setActiveView('vault')}
                  className="flex items-center space-x-1.5 py-1 px-2.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Back to Vault</span>
                </button>
                <span className="text-zinc-700">/</span>
                <span className="text-xs font-semibold text-zinc-200">Settings</span>
              </div>
            ) : (
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
            )}
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2">
            {activeView === 'import' ? (
              <>
                <button
                  onClick={() => setActiveView('vault')}
                  className="py-1.5 px-3 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition rounded-lg hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  onClick={onLock}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
                  title="Lock Vault"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              </>
            ) : activeView === 'settings' ? (
              <>
                <button
                  onClick={() => setActiveView('vault')}
                  className="py-1.5 px-3 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition rounded-lg hover:bg-zinc-900"
                >
                  Done
                </button>
                <button
                  onClick={onLock}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
                  title="Lock Vault"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveView('import')}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
                  title="Import Passwords & Data"
                >
                  <FileUp className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Import</span>
                </button>

                <button
                  onClick={() => openSettings('security')}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
                  title="Vault Settings, Backup & Privacy"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Settings</span>
                  {companion?.isPaired && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5"
                      title="Companion Extension Connected"
                    />
                  )}
                </button>

                <button
                  onClick={onLock}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-medium border border-zinc-800 transition focus-ring"
                  title="Lock Vault"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: Full-Canvas Import View OR Full-Canvas Settings View OR 3-Pane Workspace */}
      {activeView === 'import' ? (
        <VaultImportView
          snapshot={snapshot}
          activeKey={activeKey}
          existingItems={items}
          onBack={() => setActiveView('vault')}
          onImportComplete={async () => {
            await onRefreshItems();
          }}
          onShowToast={showToast}
        />
      ) : activeView === 'settings' ? (
        <VaultSettingsView
          initialTab={settingsTab}
          snapshot={snapshot}
          timeoutMinutes={timeoutMinutes}
          onTimeoutChange={setTimeoutMinutes}
          allowFavicons={allowFavicons}
          onToggleFavicons={setAllowFavicons}
          companion={companion}
          onBack={() => setActiveView('vault')}
          onShowToast={showToast}
          onBackupSuccess={() => showToast('Backup saved successfully')}
        />
      ) : (
        <>
        {/* 3-Pane Desktop Workspace */}
        <div className="flex-1 flex overflow-hidden w-full relative">
        {/* PANE 1: Left Navigation Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-zinc-800 bg-zinc-950 shrink-0 select-none">
          {/* Categories navigation */}
          <div className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Categories
            </div>
            {categoryNavItems.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition focus-ring ${
                    isActive
                      ? 'bg-zinc-800/90 text-white font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : cat.color || 'text-zinc-400'}`} />
                    <span>{cat.label}</span>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-zinc-700/70 text-zinc-100' : 'bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    {counts[cat.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Vault Footer Info */}
          <div className="mt-auto p-3">
            <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="text-[11px] font-mono text-zinc-400">v1.0.0</span>
              <span className="text-[11px] font-mono text-zinc-400">Auto-lock {timeoutMinutes}m</span>
            </div>
          </div>
        </aside>

        {/* PANE 2: Middle Master Item List */}
        <section className="flex-1 md:flex-initial md:w-80 lg:w-96 xl:w-[420px] 2xl:w-[460px] border-r border-zinc-800 bg-zinc-950/60 flex flex-col shrink-0 min-w-0 h-full">
          {/* Top Search & Actions */}
          <div className="p-3 border-b border-zinc-800/80 space-y-2.5 shrink-0 bg-zinc-950/80">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vault..."
                className="w-full pl-9 pr-14 py-1.5 bg-zinc-900 border border-zinc-800 focus-ring rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 outline-none transition"
              />
              {!searchQuery ? (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800/90 border border-zinc-700/60 rounded shadow-xs select-none">
                    {isMac ? '⌘K' : 'Ctrl K'}
                  </kbd>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 rounded-md transition focus-ring"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile-only Category Filter Pills (< md) */}
            <div className="md:hidden flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
              {categoryNavItems.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition focus-ring ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] font-mono text-zinc-400">{counts[cat.id]}</span>
                </button>
              ))}
            </div>

            {/* Section Header & Primary Create Button */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <span>{categoryNavItems.find((c) => c.id === selectedCategory)?.label || 'Items'}</span>
                <span className="text-xs font-mono text-zinc-400">({filteredItems.length})</span>
              </div>

              <button
                onClick={() =>
                  openAddDrawer(
                    selectedCategory !== 'ALL' && selectedCategory !== 'FAVORITES'
                      ? selectedCategory
                      : 'LOGIN'
                  )
                }
                className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-xl transition shadow-xs tactile-btn focus-ring"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-950" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Scrollable Master List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-4">
                <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                  <Search className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-zinc-300">
                    {searchQuery
                      ? 'No matches found'
                      : selectedCategory === 'FAVORITES'
                      ? 'No favorite records'
                      : 'No records found'}
                  </div>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    {searchQuery
                      ? `No entries match "${searchQuery}".`
                      : selectedCategory === 'FAVORITES'
                      ? 'Click the star icon on any record to pin it to your favorites.'
                      : 'This category is empty. Click "+ New" to add an item.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredItems.map(({ item, secret }) => {
                const isSelected = selectedRecordId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedRecordId(item.id);
                      setMobileDrawerOpen(true);
                    }}
                    className={`group relative p-2.5 rounded-xl transition duration-150 cursor-pointer flex items-center justify-between gap-3 border ${
                      isSelected
                        ? 'bg-zinc-800/90 border-zinc-700/80 shadow-xs text-white before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-emerald-400'
                        : 'border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pl-0.5">
                      <RecordItemIconBadge
                        type={item.type}
                        url={item.type === 'LOGIN' ? secret?.url || item.title : undefined}
                        title={item.title}
                        size="sm"
                        allowExternalFetch={allowFavicons}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {renderFormattedTitle(item.title)}
                        </div>
                        <div className="text-xs text-zinc-300 truncate mt-1 flex items-center gap-1.5">
                          {item.type === 'LOGIN' && (
                            <span className="truncate font-mono text-[11.5px] text-zinc-300">
                              {secret?.username || (secret?.url ? extractDomain(secret.url) : 'No username')}
                            </span>
                          )}
                          {item.type === 'CARD' && (
                            <span className="truncate font-mono text-xs text-zinc-300">
                              {secret?.cardNumber ? `•••• ${secret.cardNumber.slice(-4)}` : 'Card'}
                            </span>
                          )}
                          {item.type === 'API_KEY' && (
                            <span className="truncate text-zinc-300">
                              {secret?.serviceName || 'API Key'}
                            </span>
                          )}
                          {item.type === 'SECURE_NOTE' && (
                            <span className="truncate text-zinc-400 italic">
                              {secret?.content ? 'Encrypted note' : 'Empty note'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Item Actions */}
                    <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className={`p-1 rounded-lg transition focus-ring ${
                          item.favorite
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-zinc-600 hover:text-amber-400 opacity-40 sm:opacity-0 sm:group-hover:opacity-100'
                        }`}
                        title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.favorite ? 'fill-amber-400' : ''}`} />
                      </button>

                      {item.type === 'LOGIN' && secret?.password && (
                        <button
                          onClick={() =>
                            copyToClipboard(
                              secret.password,
                              `pass-${item.id}`,
                              'Password copied (auto-clears in 30s)'
                            )
                          }
                          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-ring"
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
                          onClick={() =>
                            copyToClipboard(secret.cardNumber, `card-${item.id}`, 'Card number copied')
                          }
                          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition opacity-40 sm:opacity-0 sm:group-hover:opacity-100 focus-ring"
                          title="Copy card number"
                        >
                          {copiedId === `card-${item.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* PANE 3: Right Inspector / Detail View (Desktop) */}
        <section className="hidden md:flex flex-1 flex-col h-full min-w-0 bg-zinc-950/40 relative overflow-hidden">
          {showAddDrawer ? (
            <RecordFormDrawer
              inline={true}
              isOpen={true}
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
          ) : selectedRecord ? (
            <RecordDetailPane
              inline={true}
              record={selectedRecord}
              revealedFields={revealedFields}
              copiedId={copiedId}
              confirmDeleteId={confirmDeleteId}
              totpCodes={totpCodes}
              allowExternalFavicon={allowFavicons}
              onClose={() => setSelectedRecordId(null)}
              onToggleField={toggleFieldVisibility}
              onCopy={copyToClipboard}
              onEdit={(rec) => openEditDrawer(rec)}
              onDelete={handleDeleteItem}
              onSetConfirmDelete={setConfirmDeleteId}
            />
          ) : (
            /* Empty State / No Record Selected */
            <div className="h-full w-full overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center">
              <div className="max-w-sm w-full flex flex-col items-center text-center space-y-4 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-xs">
                  <MountainIcon className="w-6 h-6 text-zinc-400" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
                    No record selected
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    Select an item from the list to view its credentials, or add a new record to your vault.
                  </p>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => openAddDrawer('LOGIN')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-xl transition shadow-xs tactile-btn focus-ring"
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-950" />
                    <span>New Record</span>
                  </button>
                  <button
                    onClick={() => openAddDrawer('CARD')}
                    className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-xl border border-zinc-800 transition focus-ring"
                  >
                    Card
                  </button>
                  <button
                    onClick={() => openAddDrawer('API_KEY')}
                    className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-xl border border-zinc-800 transition focus-ring"
                  >
                    API Key
                  </button>
                  <button
                    onClick={() => openAddDrawer('SECURE_NOTE')}
                    className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-xl border border-zinc-800 transition focus-ring"
                  >
                    Note
                  </button>
                </div>

                {/* Subtle keyboard shortcuts hint */}
                <div className="pt-6 border-t border-zinc-800/60 w-full flex items-center justify-center gap-3 text-[11px] text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 shadow-xs">⌘K</kbd>
                    <span>search</span>
                  </span>
                  <span className="text-zinc-800">•</span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 shadow-xs">↑ / ↓</kbd>
                    <span>navigate</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile-only Slide-Over Detail Drawer (< md screens) */}
      {mobileDrawerOpen && selectedRecord && (
        <div className="md:hidden">
          <RecordDetailPane
            inline={false}
            record={selectedRecord}
            revealedFields={revealedFields}
            copiedId={copiedId}
            confirmDeleteId={confirmDeleteId}
            totpCodes={totpCodes}
            allowExternalFavicon={allowFavicons}
            onClose={() => setMobileDrawerOpen(false)}
            onToggleField={toggleFieldVisibility}
            onCopy={copyToClipboard}
            onEdit={(rec) => {
              setMobileDrawerOpen(false);
              openEditDrawer(rec);
            }}
            onDelete={(id) => {
              setMobileDrawerOpen(false);
              handleDeleteItem(id);
            }}
            onSetConfirmDelete={setConfirmDeleteId}
          />
        </div>
      )}

      {/* Mobile-only Record Add/Edit Drawer (< md screens) */}
      <div className="md:hidden">
        <RecordFormDrawer
          inline={false}
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
      </div>
        </>
      )}

      {/* Password Generator Modal */}
      {showGenerator && (
        <PasswordGeneratorModal
          isOpen={showGenerator}
          title={generatorTarget === 'password' ? 'Password Generator' : 'API Key Generator'}
          submitLabel={generatorTarget === 'password' ? 'Use Password' : 'Use API Key'}
          onClose={() => setShowGenerator(false)}
          onSelectPassword={(pass) => {
            if (generatorTarget === 'password') {
              setNewItemPassword(pass);
              showToast('Password applied to form');
            } else {
              setApiKey(pass);
              showToast('API key applied to form');
            }
            setShowGenerator(false);
          }}
          onSelect={(pass) => {
            if (generatorTarget === 'password') {
              setNewItemPassword(pass);
              showToast('Password applied to form');
            } else {
              setApiKey(pass);
              showToast('API key applied to form');
            }
            setShowGenerator(false);
          }}
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
