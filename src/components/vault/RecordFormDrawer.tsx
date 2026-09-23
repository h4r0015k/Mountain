import React, { useMemo } from 'react';
import { VaultItemType, VaultSecretPayload } from '../../models/vault.js';
import {
  X,
  Plus,
  Pencil,
  AlertTriangle,
  Key,
  CreditCard,
  Terminal,
  FileText,
  Sparkles,
} from 'lucide-react';
import { getTypeLabel, RecordItemIconBadge } from './CategoryBadges.js';
import { evaluatePasswordStrength } from '../../crypto/strength.js';

interface Props {
  isOpen: boolean;
  editingItemId: string | null;
  newItemType: VaultItemType;
  setNewItemType: (type: VaultItemType) => void;
  newItemTitle: string;
  setNewItemTitle: (val: string) => void;
  // LOGIN
  newItemUsername: string;
  setNewItemUsername: (val: string) => void;
  newItemPassword: string;
  setNewItemPassword: (val: string) => void;
  newItemUrl: string;
  setNewItemUrl: (val: string) => void;
  newItemTotpSecret: string;
  setNewItemTotpSecret: (val: string) => void;
  // CARD
  cardHolder: string;
  setCardHolder: (val: string) => void;
  cardNumber: string;
  setCardNumber: (val: string) => void;
  cardExp: string;
  setCardExp: (val: string) => void;
  cardCvv: string;
  setCardCvv: (val: string) => void;
  cardPin: string;
  setCardPin: (val: string) => void;
  // API_KEY
  apiService: string;
  setApiService: (val: string) => void;
  apiKey: string;
  setApiKey: (val: string) => void;
  apiSecret: string;
  setApiSecret: (val: string) => void;
  apiEndpoint: string;
  setApiEndpoint: (val: string) => void;
  // SECURE_NOTE
  noteContent: string;
  setNoteContent: (val: string) => void;
  // SHARED
  newItemNotes: string;
  setNewItemNotes: (val: string) => void;
  isSaving: boolean;
  drawerError: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenGenerator: (target: 'password' | 'apiKey') => void;
}

export const RecordFormDrawer: React.FC<Props> = ({
  isOpen,
  editingItemId,
  newItemType,
  setNewItemType,
  newItemTitle,
  setNewItemTitle,
  newItemUsername,
  setNewItemUsername,
  newItemPassword,
  setNewItemPassword,
  newItemUrl,
  setNewItemUrl,
  newItemTotpSecret,
  setNewItemTotpSecret,
  cardHolder,
  setCardHolder,
  cardNumber,
  setCardNumber,
  cardExp,
  setCardExp,
  cardCvv,
  setCardCvv,
  cardPin,
  setCardPin,
  apiService,
  setApiService,
  apiKey,
  setApiKey,
  apiSecret,
  setApiSecret,
  apiEndpoint,
  setApiEndpoint,
  noteContent,
  setNoteContent,
  newItemNotes,
  setNewItemNotes,
  isSaving,
  drawerError,
  onClose,
  onSubmit,
  onOpenGenerator,
}) => {
  if (!isOpen) return null;

  const passwordStrength = useMemo(() => {
    return evaluatePasswordStrength(newItemPassword);
  }, [newItemPassword]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 flex justify-end animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
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
                {editingItemId ? 'Update encrypted record' : 'Encrypted with AES-256-GCM client-side'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors focus-ring shrink-0"
            title="Close drawer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {drawerError && (
          <div className="m-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-snug">{drawerError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-w-0">
          {/* Type Switcher */}
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
                {(['LOGIN', 'CARD', 'API_KEY', 'SECURE_NOTE'] as VaultItemType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewItemType(t)}
                    className={`py-2 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all focus-ring ${
                      newItemType === t
                        ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                  >
                    {t === 'LOGIN' && <Key className="w-3.5 h-3.5" />}
                    {t === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
                    {t === 'API_KEY' && <Terminal className="w-3.5 h-3.5 text-indigo-400" />}
                    {t === 'SECURE_NOTE' && <FileText className="w-3.5 h-3.5" />}
                    <span className="truncate">{t === 'LOGIN' ? 'Login' : t === 'CARD' ? 'Card' : t === 'API_KEY' ? 'Key' : 'Note'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="e.g. GitHub, AWS Production, Personal Debit"
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
            />
          </div>

          {/* Type Specific Fields */}
          {newItemType === 'LOGIN' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Username / Email</label>
                <input
                  type="text"
                  value={newItemUsername}
                  onChange={(e) => setNewItemUsername(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => onOpenGenerator('password')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 focus-ring rounded"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <input
                  type="password"
                  value={newItemPassword}
                  onChange={(e) => setNewItemPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
                {newItemPassword && (
                  <div className="pt-1 space-y-1">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-zinc-500">Strength:</span>
                      <span className="text-zinc-300 font-semibold">{passwordStrength.label}</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Website URL</label>
                <input
                  type="text"
                  value={newItemUrl}
                  onChange={(e) => setNewItemUrl(e.target.value)}
                  placeholder="https://github.com/login"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">2FA Secret Key (TOTP)</label>
                <input
                  type="text"
                  value={newItemTotpSecret}
                  onChange={(e) => setNewItemTotpSecret(e.target.value)}
                  placeholder="e.g. JBSWY3DPEHPK3PXP"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition uppercase"
                />
              </div>
            </div>
          )}

          {newItemType === 'CARD' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Cardholder Name</label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Full Name as on Card"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="•••• •••• •••• ••••"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono tracking-widest text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Expiry</label>
                  <input
                    type="text"
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">CVV</label>
                  <input
                    type="password"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">PIN (Opt)</label>
                  <input
                    type="password"
                    value={cardPin}
                    onChange={(e) => setCardPin(e.target.value)}
                    placeholder="••••"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {newItemType === 'API_KEY' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Service Name</label>
                <input
                  type="text"
                  value={apiService}
                  onChange={(e) => setApiService(e.target.value)}
                  placeholder="e.g. OpenAI, Stripe, AWS"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">API Key / Token</label>
                  <button
                    type="button"
                    onClick={() => onOpenGenerator('apiKey')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 focus-ring rounded"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Key</span>
                  </button>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_live_..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">API Secret (Optional)</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Endpoint URL (Optional)</label>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none transition"
                />
              </div>
            </div>
          )}

          {newItemType === 'SECURE_NOTE' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Secret Note Content</label>
              <textarea
                rows={6}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write private notes, server configurations, backup recovery seeds..."
                className="w-full p-3.5 bg-zinc-950 border border-zinc-800 focus-ring rounded-xl text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-500 outline-none transition resize-y"
              />
            </div>
          )}

          {/* Shared Notes */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
            <label className="text-xs font-medium text-zinc-400">Notes (Optional)</label>
            <textarea
              rows={2}
              value={newItemNotes}
              onChange={(e) => setNewItemNotes(e.target.value)}
              placeholder="Any additional context or details"
              className="w-full p-3 bg-zinc-950/70 border border-zinc-800/80 focus-ring rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none transition resize-y"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newItemTitle.trim()}
              className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-sm tactile-btn disabled:opacity-40 disabled:pointer-events-none focus-ring"
            >
              {isSaving ? 'Encrypting & Saving...' : editingItemId ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
