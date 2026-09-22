import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  VaultItem,
  VaultSnapshot,
  VaultItemType,
  LoginFields,
  CardFields,
  ApiKeyFields,
  SecureNoteFields,
  VaultSecretPayload,
} from '../models/vault.js';
import { encryptVaultRecord } from '../crypto/vault.js';
import { saveVaultSnapshot } from '../storage/indexeddb.js';
import { generateTOTP } from '../crypto/totp.js';
import { createAuthCheckPayload } from '../backup/index.js';
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
  Layers,
  Code2,
  Puzzle,
} from 'lucide-react';
import { CompanionPairingModal } from '../companion/CompanionPairingModal.js';
import { CompanionBridgeHook } from '../companion/useCompanionBridge.js';

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
  companion?: CompanionBridgeHook;
}

/**
 * Detect card network brand based on digits
 */
export function getCardBrand(num: string): 'visa' | 'mastercard' | 'amex' | 'discover' | 'generic' {
  const clean = num.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^6(011|5)/.test(clean)) return 'discover';
  return 'generic';
}

/**
 * Format raw digits into 4-digit card blocks: 1234 5678 9012 3456
 */
export function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/**
 * Format card expiry as MM/YY
 */
export function formatCardExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

/**
 * Virtual Payment Card Component
 * Renders an authentic, luxury embossed dark payment card preview
 */
export const VirtualCardPreview: React.FC<{
  cardholderName?: string;
  cardNumber?: string;
  expirationDate?: string;
  isRevealed?: boolean;
  className?: string;
}> = ({ cardholderName, cardNumber = '', expirationDate, isRevealed = false, className = '' }) => {
  const cleanNum = cardNumber.replace(/\s+/g, '');
  const brand = getCardBrand(cleanNum);

  const displayNum = useMemo(() => {
    if (!cleanNum) return '••••  ••••  ••••  ••••';
    if (isRevealed) {
      return formatCardNumber(cleanNum);
    }
    const last4 = cleanNum.slice(-4);
    return `••••  ••••  ••••  ${last4 || '••••'}`;
  }, [cleanNum, isRevealed]);

  return (
    <div
      className={`w-full aspect-[1.586/1] max-w-sm mx-auto bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 border border-zinc-700/70 rounded-2xl p-5 sm:p-6 text-zinc-100 flex flex-col justify-between shadow-2xl relative overflow-hidden select-none ${className}`}
    >
      {/* Background Subtle Shimmer Highlights */}
      <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

      {/* Top Row: Chip & Brand */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          {/* Metallic EMV Chip */}
          <div className="w-10 h-7 rounded-sm bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 p-0.5 border border-amber-200/50 shadow-xs relative flex items-center justify-center">
            <div className="w-full h-[1px] bg-amber-800/40 absolute top-2 inset-x-0" />
            <div className="w-full h-[1px] bg-amber-800/40 absolute bottom-2 inset-x-0" />
            <div className="h-full w-[1px] bg-amber-800/40 absolute left-3 inset-y-0" />
            <div className="h-full w-[1px] bg-amber-800/40 absolute right-3 inset-y-0" />
            <div className="w-2.5 h-2 rounded-xs border border-amber-800/40 bg-amber-300/30" />
          </div>

          {/* Contactless wave icon */}
          <svg className="w-4 h-4 text-zinc-400 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          </svg>
        </div>

        {/* Brand Badge */}
        <div className="text-right">
          {brand === 'visa' && (
            <span className="font-black italic text-lg tracking-wider text-blue-400 drop-shadow-xs">
              VISA
            </span>
          )}
          {brand === 'mastercard' && (
            <div className="flex items-center -space-x-2">
              <div className="w-5 h-5 rounded-full bg-rose-500/90 shadow-xs" />
              <div className="w-5 h-5 rounded-full bg-amber-400/90 shadow-xs" />
            </div>
          )}
          {brand === 'amex' && (
            <span className="font-bold text-xs tracking-wider px-2 py-0.5 rounded bg-sky-900/60 border border-sky-600/50 text-sky-200 font-mono">
              AMEX
            </span>
          )}
          {brand === 'discover' && (
            <span className="font-bold text-xs tracking-wider px-2 py-0.5 rounded bg-orange-950/60 border border-orange-600/50 text-orange-300 font-mono">
              DISCOVER
            </span>
          )}
          {brand === 'generic' && (
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400 tracking-wider">
              <MountainIcon className="w-3.5 h-3.5 text-zinc-300" />
              <span>CARD</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Card Number */}
      <div className="my-auto py-2 z-10">
        <div className="font-mono text-base sm:text-lg tracking-[0.18em] text-zinc-100 font-semibold drop-shadow-xs">
          {displayNum}
        </div>
      </div>

      {/* Bottom Row: Holder & Expiry */}
      <div className="flex items-end justify-between text-xs z-10 pt-1">
        <div className="min-w-0 pr-4">
          <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono">Cardholder</div>
          <div className="font-mono font-medium text-zinc-200 truncate uppercase tracking-wide">
            {cardholderName ? cardholderName.toUpperCase() : 'YOUR NAME'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono">Expires</div>
          <div className="font-mono font-medium text-zinc-200 tracking-wider">
            {expirationDate || 'MM/YY'}
          </div>
        </div>
      </div>
    </div>
  );
};

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

export const getTypeLabel = (type: VaultItemType): string => {
  switch (type) {
    case 'LOGIN':
      return 'Login';
    case 'CARD':
      return 'Payment Card';
    case 'API_KEY':
      return 'API Key';
    case 'SECURE_NOTE':
      return 'Secure Note';
    default:
      return 'Item';
  }
};

/**
 * Badge styling for each record category
 */
export const CategoryTypeBadge: React.FC<{ type: VaultItemType }> = ({ type }) => {
  switch (type) {
    case 'LOGIN':
      return (
        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center gap-1">
          <Key className="w-3 h-3 text-zinc-400" />
          <span>Login</span>
        </span>
      );
    case 'CARD':
      return (
        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50 flex items-center gap-1">
          <CreditCard className="w-3 h-3 text-amber-400" />
          <span>Card</span>
        </span>
      );
    case 'API_KEY':
      return (
        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
          <Terminal className="w-3 h-3 text-emerald-400" />
          <span>API Key</span>
        </span>
      );
    case 'SECURE_NOTE':
      return (
        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/50 flex items-center gap-1">
          <FileText className="w-3 h-3 text-indigo-400" />
          <span>Note</span>
        </span>
      );
  }
};

/**
 * Dedicated visual icon container for items in the grid
 */
export const RecordItemIconBadge: React.FC<{
  type: VaultItemType;
  url?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ type, url, size = 'md' }) => {
  const sizeClass =
    size === 'lg'
      ? 'w-12 h-12 rounded-2xl'
      : size === 'sm'
      ? 'w-7 h-7 rounded-lg'
      : 'w-10 h-10 rounded-xl';

  if (type === 'CARD') {
    return (
      <div
        className={`${sizeClass} bg-amber-950/30 border border-amber-700/40 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-xs`}
      >
        <CreditCard className={size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      </div>
    );
  }

  if (type === 'API_KEY') {
    return (
      <div
        className={`${sizeClass} bg-emerald-950/30 border border-emerald-700/40 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-xs`}
      >
        <Terminal className={size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      </div>
    );
  }

  if (type === 'SECURE_NOTE') {
    return (
      <div
        className={`${sizeClass} bg-indigo-950/30 border border-indigo-700/40 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-xs`}
      >
        <FileText className={size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      </div>
    );
  }

  // LOGIN: Use Favicon if available, else fallback to standard icon
  return <FaviconBadge url={url} type={type} size={size} />;
};

/**
 * Favicon badge for domains
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
  companion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | VaultItemType>('ALL');
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<DecryptedRecord | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorTarget, setGeneratorTarget] = useState<'password' | 'apiKey'>('password');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showCompanionModal, setShowCompanionModal] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
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

  // LOGIN fields
  const [newItemUsername, setNewItemUsername] = useState('');
  const [newItemPassword, setNewItemPassword] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemTotpSecret, setNewItemTotpSecret] = useState('');

  // CARD fields
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPin, setCardPin] = useState('');

  // API_KEY fields
  const [apiService, setApiService] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');

  // SECURE_NOTE fields
  const [noteContent, setNoteContent] = useState('');

  // Shared Notes field
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
    setEditingItemId(record.item.id);
    setNewItemType(record.item.type);
    setNewItemTitle(record.item.title || '');
    setNewItemNotes(record.secret?.notes || '');

    // Reset specific fields
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

    if (record.item.type === 'LOGIN') {
      setNewItemUsername(record.secret?.username || '');
      setNewItemPassword(record.secret?.password || '');
      setNewItemUrl(record.secret?.url || '');
      setNewItemTotpSecret(record.secret?.totpSecret || '');
    } else if (record.item.type === 'CARD') {
      setCardHolder(record.secret?.cardholderName || '');
      setCardNumber(formatCardNumber(record.secret?.cardNumber || ''));
      setCardExp(record.secret?.expirationDate || '');
      setCardCvv(record.secret?.cvv || '');
      setCardPin(record.secret?.pin || '');
    } else if (record.item.type === 'API_KEY') {
      setApiService(record.secret?.serviceName || '');
      setApiKey(record.secret?.apiKey || '');
      setApiSecret(record.secret?.apiSecret || '');
      setApiEndpoint(record.secret?.endpointUrl || '');
    } else if (record.item.type === 'SECURE_NOTE') {
      setNoteContent(record.secret?.content || '');
    }

    setDrawerError(null);
    setShowAddDrawer(true);
  };

  useEffect(() => {
    let isMounted = true;

    const updateAllTotp = async () => {
      const updated: Record<string, { code: string; secondsRemaining: number }> = {};
      for (const { item, secret } of items) {
        if (item.type === 'LOGIN' && secret?.totpSecret) {
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

  const toggleFieldVisibility = (fieldKey: string) => {
    setRevealedFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
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

      let secretPayload: VaultSecretPayload;

      if (newItemType === 'LOGIN') {
        const loginPayload: LoginFields = {
          username: newItemUsername,
          password: newItemPassword,
          url: newItemUrl || undefined,
          totpSecret: newItemTotpSecret.trim() || undefined,
          notes: newItemNotes || undefined,
        };
        secretPayload = loginPayload;
      } else if (newItemType === 'CARD') {
        const cardPayload: CardFields = {
          cardholderName: cardHolder.trim(),
          cardNumber: cardNumber.replace(/\s+/g, ''),
          expirationDate: cardExp.trim(),
          cvv: cardCvv.trim(),
          pin: cardPin.trim() || undefined,
          notes: newItemNotes || undefined,
        };
        secretPayload = cardPayload;
      } else if (newItemType === 'API_KEY') {
        const apiPayload: ApiKeyFields = {
          serviceName: apiService.trim() || undefined,
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim() || undefined,
          endpointUrl: apiEndpoint.trim() || undefined,
          notes: newItemNotes || undefined,
        };
        secretPayload = apiPayload;
      } else if (newItemType === 'SECURE_NOTE') {
        const notePayload: SecureNoteFields = {
          title: newItemTitle.trim(),
          content: noteContent,
        };
        secretPayload = notePayload;
      } else {
        throw new Error('Unsupported item type');
      }

      const encryptedData = await encryptVaultRecord(secretPayload, activeKey);

      let updatedItems: VaultItem[];

      if (editingItemId) {
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

      let authCheck = snapshot.authCheck;
      if (!authCheck && activeKey) {
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

  // Category item counts
  const counts = useMemo(() => {
    const res: Record<'ALL' | VaultItemType, number> = {
      ALL: items.length,
      LOGIN: 0,
      CARD: 0,
      API_KEY: 0,
      SECURE_NOTE: 0,
    };
    for (const { item } of items) {
      if (item.type in res) {
        res[item.type]++;
      }
    }
    return res;
  }, [items]);

  const filteredItems = items.filter((record) => {
    // 1. Category filter
    if (selectedCategory !== 'ALL' && record.item.type !== selectedCategory) {
      return false;
    }

    // 2. Search query filter
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const titleMatch = record.item.title.toLowerCase().includes(query);
    const sec = record.secret || {};

    if (record.item.type === 'LOGIN') {
      return (
        titleMatch ||
        (sec.username && sec.username.toLowerCase().includes(query)) ||
        (sec.url && sec.url.toLowerCase().includes(query)) ||
        (sec.notes && sec.notes.toLowerCase().includes(query))
      );
    }
    if (record.item.type === 'CARD') {
      return (
        titleMatch ||
        (sec.cardholderName && sec.cardholderName.toLowerCase().includes(query)) ||
        (sec.cardNumber && sec.cardNumber.includes(query)) ||
        (sec.notes && sec.notes.toLowerCase().includes(query))
      );
    }
    if (record.item.type === 'API_KEY') {
      return (
        titleMatch ||
        (sec.serviceName && sec.serviceName.toLowerCase().includes(query)) ||
        (sec.apiKey && sec.apiKey.toLowerCase().includes(query)) ||
        (sec.endpointUrl && sec.endpointUrl.toLowerCase().includes(query)) ||
        (sec.notes && sec.notes.toLowerCase().includes(query))
      );
    }
    if (record.item.type === 'SECURE_NOTE') {
      return (
        titleMatch ||
        (sec.content && sec.content.toLowerCase().includes(query))
      );
    }

    return titleMatch;
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
            {companion && (
              <button
                onClick={() => setShowCompanionModal(true)}
                className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-xs transition focus-ring ${
                  companion.isPaired
                    ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 font-semibold border border-emerald-600/40 shadow-sm'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium border border-zinc-800'
                }`}
                title={companion.isPaired ? 'Companion Extension: Paired & Active' : 'Pair Companion Extension'}
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

        {/* Polished Segmented Category Filter Bar */}
        <div className="p-1 bg-zinc-900/90 border border-zinc-800/90 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition focus-ring whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All</span>
            <span className="text-zinc-400 text-xs font-mono ml-0.5">{counts.ALL}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('LOGIN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition focus-ring whitespace-nowrap ${
              selectedCategory === 'LOGIN'
                ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Logins</span>
            <span className="text-zinc-400 text-xs font-mono ml-0.5">{counts.LOGIN}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('CARD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition focus-ring whitespace-nowrap ${
              selectedCategory === 'CARD'
                ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
            }`}
          >
            <CreditCard className={`w-3.5 h-3.5 ${selectedCategory === 'CARD' ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span>Cards</span>
            <span className={`text-xs font-mono ml-0.5 ${selectedCategory === 'CARD' ? 'text-zinc-300' : 'text-zinc-400'}`}>{counts.CARD}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('API_KEY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition focus-ring whitespace-nowrap ${
              selectedCategory === 'API_KEY'
                ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
            }`}
          >
            <Terminal className={`w-3.5 h-3.5 ${selectedCategory === 'API_KEY' ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>API Keys</span>
            <span className={`text-xs font-mono ml-0.5 ${selectedCategory === 'API_KEY' ? 'text-zinc-300' : 'text-zinc-400'}`}>{counts.API_KEY}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('SECURE_NOTE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition focus-ring whitespace-nowrap ${
              selectedCategory === 'SECURE_NOTE'
                ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${selectedCategory === 'SECURE_NOTE' ? 'text-indigo-400' : 'text-zinc-400'}`} />
            <span>Notes</span>
            <span className={`text-xs font-mono ml-0.5 ${selectedCategory === 'SECURE_NOTE' ? 'text-zinc-300' : 'text-zinc-400'}`}>{counts.SECURE_NOTE}</span>
          </button>
        </div>

        {/* Item Cards / Dense List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              {selectedCategory === 'CARD' ? (
                <CreditCard className="w-5 h-5 text-amber-400" />
              ) : selectedCategory === 'API_KEY' ? (
                <Terminal className="w-5 h-5 text-emerald-400" />
              ) : selectedCategory === 'SECURE_NOTE' ? (
                <FileText className="w-5 h-5 text-indigo-400" />
              ) : (
                <Key className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-200">
                {searchQuery
                  ? 'No matching records found'
                  : selectedCategory === 'CARD'
                  ? 'No payment cards stored yet'
                  : selectedCategory === 'API_KEY'
                  ? 'No API keys stored yet'
                  : selectedCategory === 'SECURE_NOTE'
                  ? 'No secure notes stored yet'
                  : 'Your vault is empty'}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'Try refining your search filter.'
                  : `Click New Record to securely store an encrypted ${
                      selectedCategory === 'ALL' ? 'item' : getTypeLabel(selectedCategory).toLowerCase()
                    }.`}
              </p>
            </div>
            <button
              onClick={() => openAddDrawer(selectedCategory !== 'ALL' ? selectedCategory : 'LOGIN')}
              className="inline-flex items-center space-x-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold rounded-xl transition shadow-sm tactile-btn mt-2 focus-ring"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {selectedCategory !== 'ALL' ? getTypeLabel(selectedCategory) : 'Record'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.map(({ item, secret }) => {
              const isSelected = viewingRecord?.item.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setViewingRecord({ item, secret });
                  }}
                  className={`bg-zinc-900 border ${
                    isSelected
                      ? 'border-zinc-400 bg-zinc-850 ring-1 ring-zinc-400/40'
                      : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/80'
                  } rounded-xl p-3 sm:p-3.5 transition group cursor-pointer flex items-center justify-between focus-ring`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setViewingRecord({ item, secret });
                    }
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <RecordItemIconBadge
                      type={item.type}
                      url={item.type === 'LOGIN' ? secret?.url : item.type === 'API_KEY' ? secret?.endpointUrl : undefined}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-zinc-100 text-sm sm:text-base truncate group-hover:text-white transition">
                          {item.title}
                        </h4>
                        {item.type !== 'LOGIN' && (
                          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 uppercase">
                            {item.type === 'CARD' ? 'Card' : item.type === 'API_KEY' ? 'API' : 'Note'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                        {item.type === 'LOGIN' &&
                          (secret?.username || (secret?.url ? secret.url.replace(/^https?:\/\//, '') : 'Login'))}
                        {item.type === 'CARD' &&
                          (secret?.cardNumber
                            ? `•••• ${secret.cardNumber.replace(/\s+/g, '').slice(-4)}${
                                secret?.cardholderName ? ` · ${secret.cardholderName}` : ''
                              }`
                            : 'Payment Card')}
                        {item.type === 'API_KEY' &&
                          (secret?.serviceName || (secret?.apiKey ? `${secret.apiKey.slice(0, 10)}••••` : 'API Key'))}
                        {item.type === 'SECURE_NOTE' &&
                          (secret?.content ? secret.content.split('\n')[0] : 'Secure Note')}
                      </p>
                    </div>
                  </div>

                  {/* Quick action buttons on card */}
                  <div
                    className="flex items-center space-x-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Copy Primary Secret Button */}
                    {item.type === 'LOGIN' && secret?.password && (
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
                    {item.type === 'API_KEY' && secret?.apiKey && (
                      <button
                        onClick={() => copyToClipboard(secret.apiKey, `api-${item.id}`, 'API key copied')}
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition focus-ring"
                        title="Copy API key"
                      >
                        {copiedId === `api-${item.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    {item.type === 'SECURE_NOTE' && secret?.content && (
                      <button
                        onClick={() => copyToClipboard(secret.content, `note-${item.id}`, 'Note copied')}
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition focus-ring"
                        title="Copy note"
                      >
                        {copiedId === `note-${item.id}` ? (
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

      {/* VIEW RECORD DETAIL RIGHT SIDE PANE */}
      {viewingRecord && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-detail-title"
          className="fixed inset-0 z-50 flex justify-end animate-fade-in"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => {
              setViewingRecord(null);
              setConfirmDeleteId(null);
            }}
          />

          {/* Right-docked Side Pane */}
          <div className="relative z-10 w-full sm:w-[480px] max-w-[92vw] h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col min-w-0">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <RecordItemIconBadge
                  type={viewingRecord.item.type}
                  url={viewingRecord.item.type === 'LOGIN' ? viewingRecord.secret?.url : viewingRecord.item.type === 'API_KEY' ? viewingRecord.secret?.endpointUrl : undefined}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 id="record-detail-title" className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                    {viewingRecord.item.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CategoryTypeBadge type={viewingRecord.item.type} />
                    {viewingRecord.item.type === 'LOGIN' && viewingRecord.secret?.url && (
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
                        <span className="truncate max-w-[160px]">
                          {viewingRecord.secret.url.replace(/^https?:\/\//, '')}
                        </span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    )}
                    {viewingRecord.item.type === 'API_KEY' && viewingRecord.secret?.endpointUrl && (
                      <a
                        href={
                          viewingRecord.secret.endpointUrl.startsWith('http')
                            ? viewingRecord.secret.endpointUrl
                            : `https://${viewingRecord.secret.endpointUrl}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors truncate focus-ring rounded"
                      >
                        <span className="truncate max-w-[160px]">
                          {viewingRecord.secret.endpointUrl.replace(/^https?:\/\//, '')}
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
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus-ring shrink-0"
                aria-label="Close record detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-w-0">
              {/* ===================== LOGIN VIEW ===================== */}
              {viewingRecord.item.type === 'LOGIN' && (
                <>
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
                          {copiedId === 'modal-user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === 'modal-user' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {viewingRecord.secret?.password && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-medium text-zinc-300">Password</label>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                        <span className="font-mono text-sm text-zinc-100 tracking-wider select-all truncate min-w-0 flex-1">
                          {revealedFields[`pass-${viewingRecord.item.id}`]
                            ? viewingRecord.secret.password
                            : '••••••••••••••••••••'}
                        </span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => toggleFieldVisibility(`pass-${viewingRecord.item.id}`)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition focus-ring"
                            title={revealedFields[`pass-${viewingRecord.item.id}`] ? 'Hide password' : 'Show password'}
                          >
                            {revealedFields[`pass-${viewingRecord.item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(viewingRecord.secret.password, 'modal-pass', 'Password copied')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                          >
                            {copiedId === 'modal-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === 'modal-pass' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                </>
              )}

              {/* ===================== PAYMENT CARD VIEW ===================== */}
              {viewingRecord.item.type === 'CARD' && (
                <div className="space-y-4">
                  {/* Virtual Card Preview Widget */}
                  <VirtualCardPreview
                    cardholderName={viewingRecord.secret?.cardholderName}
                    cardNumber={viewingRecord.secret?.cardNumber}
                    expirationDate={viewingRecord.secret?.expirationDate}
                    isRevealed={revealedFields[`card-${viewingRecord.item.id}`]}
                  />

                  {/* Card Number Actions */}
                  {viewingRecord.secret?.cardNumber && (
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300">Card Number</label>
                        <button
                          onClick={() => toggleFieldVisibility(`card-${viewingRecord.item.id}`)}
                          className="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1"
                        >
                          {revealedFields[`card-${viewingRecord.item.id}`] ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Mask</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Reveal</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                        <span className="font-mono text-sm tracking-widest text-zinc-100 select-all truncate min-w-0 flex-1">
                          {revealedFields[`card-${viewingRecord.item.id}`]
                            ? formatCardNumber(viewingRecord.secret.cardNumber)
                            : `•••• •••• •••• ${viewingRecord.secret.cardNumber.replace(/\s+/g, '').slice(-4)}`}
                        </span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              viewingRecord.secret.cardNumber.replace(/\s+/g, ''),
                              'card-num',
                              'Card number copied'
                            )
                          }
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring shrink-0"
                        >
                          {copiedId === 'card-num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === 'card-num' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expiration & CVV Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-medium text-zinc-300">Expiration Date</label>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-1 min-w-0">
                        <span className="font-mono text-sm text-zinc-100 select-all truncate">
                          {viewingRecord.secret?.expirationDate || '—'}
                        </span>
                        {viewingRecord.secret?.expirationDate && (
                          <button
                            onClick={() => copyToClipboard(viewingRecord.secret.expirationDate, 'card-exp', 'Expiry copied')}
                            className="p-1 text-zinc-400 hover:text-zinc-200 transition focus-ring rounded"
                            title="Copy expiry"
                          >
                            {copiedId === 'card-exp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-medium text-zinc-300">CVV / CVC Code</label>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-1 min-w-0">
                        <span className="font-mono text-sm text-zinc-100 select-all truncate">
                          {revealedFields[`cvv-${viewingRecord.item.id}`]
                            ? viewingRecord.secret?.cvv || '—'
                            : '•••'}
                        </span>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => toggleFieldVisibility(`cvv-${viewingRecord.item.id}`)}
                            className="p-1 text-zinc-400 hover:text-zinc-200 transition focus-ring rounded"
                            title={revealedFields[`cvv-${viewingRecord.item.id}`] ? 'Hide CVV' : 'Show CVV'}
                          >
                            {revealedFields[`cvv-${viewingRecord.item.id}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {viewingRecord.secret?.cvv && (
                            <button
                              onClick={() => copyToClipboard(viewingRecord.secret.cvv, 'card-cvv', 'CVV copied')}
                              className="p-1 text-zinc-400 hover:text-zinc-200 transition focus-ring rounded"
                              title="Copy CVV"
                            >
                              {copiedId === 'card-cvv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card PIN (optional) */}
                  {viewingRecord.secret?.pin && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-medium text-zinc-300">Card PIN</label>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                        <span className="font-mono text-sm text-zinc-100 select-all truncate min-w-0 flex-1">
                          {revealedFields[`pin-${viewingRecord.item.id}`]
                            ? viewingRecord.secret.pin
                            : '••••'}
                        </span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => toggleFieldVisibility(`pin-${viewingRecord.item.id}`)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition focus-ring"
                            title={revealedFields[`pin-${viewingRecord.item.id}`] ? 'Hide PIN' : 'Show PIN'}
                          >
                            {revealedFields[`pin-${viewingRecord.item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(viewingRecord.secret.pin, 'card-pin', 'PIN copied')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                          >
                            {copiedId === 'card-pin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === 'card-pin' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===================== API KEY VIEW ===================== */}
              {viewingRecord.item.type === 'API_KEY' && (
                <div className="space-y-3.5">
                  {/* Developer Terminal Console Box */}
                  <div className="rounded-xl border border-zinc-800 bg-black/70 overflow-hidden shadow-lg">
                    {/* Console Header */}
                    <div className="px-3.5 py-2 bg-zinc-900/90 border-b border-zinc-800/90 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        <span className="text-[11px] font-mono text-zinc-400 ml-1.5">
                          {viewingRecord.secret?.serviceName
                            ? `${viewingRecord.secret.serviceName.toLowerCase()}.env`
                            : 'api_credentials.env'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">ENV</span>
                    </div>

                    {/* Console Content */}
                    <div className="p-3.5 space-y-2 font-mono text-xs text-zinc-300">
                      {viewingRecord.secret?.serviceName && (
                        <div className="text-zinc-500 flex gap-2">
                          <span className="select-none text-zinc-600">#</span>
                          <span>Provider: {viewingRecord.secret.serviceName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/80">
                        <div className="truncate min-w-0">
                          <span className="text-emerald-400 select-none mr-2">$</span>
                          <span className="text-zinc-400">export KEY=</span>
                          <span className="text-zinc-100 font-semibold select-all">
                            {revealedFields[`api-${viewingRecord.item.id}`]
                              ? `"${viewingRecord.secret?.apiKey}"`
                              : `"••••••••••••••••••••"`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => toggleFieldVisibility(`api-${viewingRecord.item.id}`)}
                            className="p-1 text-zinc-400 hover:text-zinc-200 transition focus-ring rounded"
                            title={revealedFields[`api-${viewingRecord.item.id}`] ? 'Hide API key' : 'Show API key'}
                          >
                            {revealedFields[`api-${viewingRecord.item.id}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(viewingRecord.secret?.apiKey || '', 'api-key', 'API key copied')}
                            className="p-1 text-zinc-400 hover:text-zinc-200 transition focus-ring rounded"
                            title="Copy API key"
                          >
                            {copiedId === 'api-key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* API Secret (if present) */}
                  {viewingRecord.secret?.apiSecret && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-medium text-zinc-300">API Secret / Private Token</label>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                        <span className="font-mono text-xs sm:text-sm text-zinc-100 select-all truncate min-w-0 flex-1">
                          {revealedFields[`apisecret-${viewingRecord.item.id}`]
                            ? viewingRecord.secret.apiSecret
                            : '••••••••••••••••••••••••••••••••'}
                        </span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => toggleFieldVisibility(`apisecret-${viewingRecord.item.id}`)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition focus-ring"
                            title={revealedFields[`apisecret-${viewingRecord.item.id}`] ? 'Hide secret' : 'Show secret'}
                          >
                            {revealedFields[`apisecret-${viewingRecord.item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(viewingRecord.secret.apiSecret, 'api-secret', 'Secret copied')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                          >
                            {copiedId === 'api-secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === 'api-secret' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API Endpoint (if present) */}
                  {viewingRecord.secret?.endpointUrl && (
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-medium text-zinc-300">API Endpoint URL</label>
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                        <span className="font-mono text-xs text-zinc-100 select-all truncate min-w-0 flex-1">
                          {viewingRecord.secret.endpointUrl}
                        </span>
                        <button
                          onClick={() => copyToClipboard(viewingRecord.secret.endpointUrl, 'api-endpoint', 'Endpoint copied')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring shrink-0"
                        >
                          {copiedId === 'api-endpoint' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === 'api-endpoint' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===================== SECURE NOTE VIEW ===================== */}
              {viewingRecord.item.type === 'SECURE_NOTE' && (
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Note Content</label>
                    <button
                      onClick={() => copyToClipboard(viewingRecord.secret?.content || '', 'modal-note-content', 'Content copied')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                    >
                      {copiedId === 'modal-note-content' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === 'modal-note-content' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] max-h-80 overflow-y-auto leading-relaxed select-text font-mono">
                    {viewingRecord.secret?.content || '—'}
                  </div>
                </div>
              )}

              {/* Shared Notes (for LOGIN, CARD, API_KEY) */}
              {viewingRecord.item.type !== 'SECURE_NOTE' && viewingRecord.secret?.notes && (
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
              <div className="pt-2 text-xs font-mono text-zinc-400 flex justify-between border-t border-zinc-800/60">
                <span>Created {new Date(viewingRecord.item.createdAt).toLocaleDateString()}</span>
                <span>Updated {new Date(viewingRecord.item.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
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
          <div className="relative z-10 w-full sm:w-[480px] max-w-[92vw] h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col min-w-0">
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shrink-0">
                  {editingItemId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 id="drawer-title" className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                    {editingItemId ? `Edit ${getTypeLabel(newItemType)}` : `New ${getTypeLabel(newItemType)}`}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    {editingItemId ? 'Update stored credentials' : 'Securely encrypted on your device'}
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
              {/* Type Switcher Segment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Record Type</label>
                  {editingItemId && (
                    <span className="text-[11px] text-zinc-500">Cannot change type while editing</span>
                  )}
                </div>

                {editingItemId ? (
                  <div className="flex items-center gap-2.5 px-3 py-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                    <RecordItemIconBadge type={newItemType} size="sm" />
                    <span className="text-xs font-medium text-zinc-200">{getTypeLabel(newItemType)}</span>
                    <span className="text-[11px] text-zinc-500 ml-auto">Editing existing item</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950/90 border border-zinc-800/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewItemType('LOGIN')}
                      className={`group py-2 px-1 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all focus-ring ${
                        newItemType === 'LOGIN'
                          ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <Key className={`w-3.5 h-3.5 shrink-0 transition-colors ${newItemType === 'LOGIN' ? 'text-zinc-100' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                      <span className="truncate">Login</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewItemType('CARD')}
                      className={`group py-2 px-1 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all focus-ring ${
                        newItemType === 'CARD'
                          ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <CreditCard className={`w-3.5 h-3.5 shrink-0 transition-colors ${newItemType === 'CARD' ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                      <span className="truncate">Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewItemType('API_KEY')}
                      className={`group py-2 px-1 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all focus-ring ${
                        newItemType === 'API_KEY'
                          ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <Terminal className={`w-3.5 h-3.5 shrink-0 transition-colors ${newItemType === 'API_KEY' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                      <span className="truncate">API Key</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewItemType('SECURE_NOTE')}
                      className={`group py-2 px-1 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all focus-ring ${
                        newItemType === 'SECURE_NOTE'
                          ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                      }`}
                    >
                      <FileText className={`w-3.5 h-3.5 shrink-0 transition-colors ${newItemType === 'SECURE_NOTE' ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                      <span className="truncate">Note</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Live Interactive Virtual Card Preview in Drawer */}
              {newItemType === 'CARD' && (
                <div className="py-1">
                  <VirtualCardPreview
                    cardholderName={cardHolder}
                    cardNumber={cardNumber}
                    expirationDate={cardExp}
                    isRevealed={true}
                  />
                </div>
              )}

              {/* Title Input (Universal) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  {newItemType === 'CARD'
                    ? 'Card Label / Bank Name'
                    : newItemType === 'API_KEY'
                    ? 'Key Name / Application'
                    : 'Record Title'}
                </label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder={
                    newItemType === 'LOGIN'
                      ? 'e.g. GitHub, Google, ProtonMail'
                      : newItemType === 'CARD'
                      ? 'e.g. Chase Sapphire, Personal Visa, Amex'
                      : newItemType === 'API_KEY'
                      ? 'e.g. OpenAI Production, AWS IAM Admin, Stripe'
                      : 'e.g. Recovery Codes, Server Config'
                  }
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              {/* ===================== LOGIN FIELDS ===================== */}
              {newItemType === 'LOGIN' && (
                <>
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
                        onClick={() => {
                          setGeneratorTarget('password');
                          setShowGenerator(true);
                        }}
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
                      placeholder="Enter or generate password..."
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
                          <FaviconBadge url={newItemUrl} type="LOGIN" size="sm" />
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
                </>
              )}

              {/* ===================== PAYMENT CARD FIELDS ===================== */}
              {newItemType === 'CARD' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="e.g. JOHN DOE"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Card Number</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4532 0000 0000 0000"
                      maxLength={23}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition tracking-widest"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Expires (MM/YY)</label>
                      <input
                        type="text"
                        required
                        value={cardExp}
                        onChange={(e) => setCardExp(formatCardExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">CVV / Security Code</label>
                      <input
                        type="password"
                        required
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition text-center tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex justify-between">
                      <span>Card PIN</span>
                      <span className="text-xs text-zinc-400">Optional</span>
                    </label>
                    <input
                      type="password"
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="ATM or purchase PIN"
                      maxLength={8}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition"
                    />
                  </div>
                </>
              )}

              {/* ===================== API KEY FIELDS ===================== */}
              {newItemType === 'API_KEY' && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">Service / Provider</label>
                      <div className="flex items-center gap-1">
                        {['OpenAI', 'Anthropic', 'Stripe', 'AWS'].map((prov) => (
                          <button
                            key={prov}
                            type="button"
                            onClick={() => {
                              setApiService(prov);
                              if (!newItemTitle) setNewItemTitle(`${prov} Key`);
                            }}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
                          >
                            {prov}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={apiService}
                      onChange={(e) => setApiService(e.target.value)}
                      placeholder="e.g. OpenAI, Stripe, Anthropic, AWS"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">API Key / Token</label>
                      <button
                        type="button"
                        onClick={() => {
                          setGeneratorTarget('apiKey');
                          setShowGenerator(true);
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1 transition-colors focus-ring rounded"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Token</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-proj-... or api_key_..."
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex justify-between">
                      <span>API Secret / Private Key</span>
                      <span className="text-xs text-zinc-400">Optional</span>
                    </label>
                    <input
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Secondary secret key or signing secret"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex justify-between">
                      <span>API Endpoint URL</span>
                      <span className="text-xs text-zinc-400">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                    />
                  </div>
                </>
              )}

              {/* ===================== SECURE NOTE FIELDS ===================== */}
              {newItemType === 'SECURE_NOTE' && (
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-zinc-300">Note Content</label>
                  <textarea
                    rows={6}
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter confidential notes, recovery phrases, server SSH commands, or license keys..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 outline-none resize-y min-h-[140px] max-h-96 font-mono leading-relaxed break-words break-all [overflow-wrap:anywhere]"
                  />
                </div>
              )}

              {/* Shared Notes Field (for LOGIN, CARD, API_KEY) */}
              {newItemType !== 'SECURE_NOTE' && (
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-zinc-300">Notes (Optional)</label>
                  <textarea
                    rows={3}
                    value={newItemNotes}
                    onChange={(e) => setNewItemNotes(e.target.value)}
                    placeholder="Recovery codes, security questions, notes..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 outline-none resize-y min-h-[80px] max-h-60 font-sans leading-relaxed break-words break-all [overflow-wrap:anywhere]"
                  />
                </div>
              )}

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
          if (generatorTarget === 'apiKey') {
            setApiKey(pwd);
          } else {
            setNewItemPassword(pwd);
          }
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

      {/* Companion Extension Pairing Modal */}
      {companion && (
        <CompanionPairingModal
          isOpen={showCompanionModal}
          onClose={() => setShowCompanionModal(false)}
          pairingCode={companion.pairingCode}
          isPaired={companion.isPaired}
          onRegenerateCode={companion.regeneratePairingCode}
          onUnpair={companion.unpair}
        />
      )}

      {/* Mobile Bottom Bar */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 z-20">
        <div className="p-2 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl flex items-center justify-around">
          <button
            onClick={() => openAddDrawer(selectedCategory !== 'ALL' ? selectedCategory : 'LOGIN')}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-zinc-100 text-zinc-950 font-semibold rounded-xl text-xs shadow-sm tactile-btn focus-ring"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>
          <div className="w-[1px] h-6 bg-zinc-800 mx-2" />
          <button
            onClick={() => {
              setGeneratorTarget('password');
              setShowGenerator(true);
            }}
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
