import React from 'react';
import { DecryptedRecord } from '../../models/vault.js';
import {
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Key,
  Lock,
} from 'lucide-react';
import { formatCardNumber, getCardBrand } from './VirtualCardPreview.js';
import { TotpDisplay } from './TotpDisplay.js';
import { CategoryTypeBadge, RecordItemIconBadge } from './CategoryBadges.js';

interface Props {
  record: DecryptedRecord;
  revealedFields: Record<string, boolean>;
  copiedId: string | null;
  confirmDeleteId: string | null;
  totpCodes: Record<string, { code: string; secondsRemaining: number }>;
  allowExternalFavicon?: boolean;
  inline?: boolean;
  onClose: () => void;
  onToggleField: (fieldKey: string) => void;
  onCopy: (text: string, id: string, label?: string) => void;
  onEdit: (record: DecryptedRecord) => void;
  onDelete: (itemId: string) => void;
  onSetConfirmDelete: (itemId: string | null) => void;
}

export const RecordDetailPane: React.FC<Props> = ({
  record,
  revealedFields,
  copiedId,
  confirmDeleteId,
  totpCodes,
  allowExternalFavicon = false,
  inline = false,
  onClose,
  onToggleField,
  onCopy,
  onEdit,
  onDelete,
  onSetConfirmDelete,
}) => {
  const { item, secret } = record;

  const innerContent = (
    <div
      role={inline ? 'region' : undefined}
      aria-label={inline ? 'Record Details' : undefined}
      className={`flex flex-col min-w-0 ${
        inline
          ? 'h-full w-full bg-zinc-950/60 overflow-hidden'
          : 'relative z-10 w-full sm:w-[480px] max-w-[92vw] h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl'
      }`}
    >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b border-zinc-800/80 shrink-0 ${inline ? 'bg-zinc-950/80' : 'bg-zinc-900'}`}>
          <div className={`${inline ? 'max-w-2xl xl:max-w-3xl w-full mx-auto' : 'w-full'} flex items-center justify-between gap-4`}>
            <div className="flex items-center space-x-3.5 min-w-0">
              <RecordItemIconBadge
                type={item.type}
                url={item.type === 'LOGIN' ? secret?.url : item.type === 'API_KEY' ? secret?.endpointUrl : undefined}
                title={item.title}
                size="md"
                allowExternalFetch={allowExternalFavicon}
              />
              <div className="min-w-0">
                <h3 id="record-detail-title" className="text-base sm:text-lg font-bold text-zinc-100 truncate tracking-tight">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <CategoryTypeBadge type={item.type} />
                  {item.type === 'CARD' && secret?.cardNumber && getCardBrand(secret.cardNumber) !== 'generic' && (
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                      {getCardBrand(secret.cardNumber).toUpperCase()}
                    </span>
                  )}
                  {item.type === 'LOGIN' && secret?.url && (
                    <a
                      href={secret.url.startsWith('http') ? secret.url : `https://${secret.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors truncate focus-ring rounded"
                    >
                      <span className="truncate max-w-[180px]">
                        {secret.url.replace(/^https?:\/\//, '')}
                      </span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Actions cluster */}
            <div className="flex items-center space-x-2 shrink-0">
              {inline && (
                <>
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onDelete(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition shadow-xs focus-ring"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </button>
                      <button
                        onClick={() => onSetConfirmDelete(null)}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition focus-ring"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSetConfirmDelete(item.id)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 border border-zinc-800 hover:border-rose-900/40 transition focus-ring"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onEdit(record)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-xs tactile-btn focus-ring"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition focus-ring shrink-0"
                aria-label={inline ? 'Deselect item' : 'Close record detail'}
                title={inline ? 'Deselect item (Esc)' : 'Close (Esc)'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable details body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-w-0">
          <div className={`${inline ? 'max-w-2xl xl:max-w-3xl w-full mx-auto' : 'w-full'} space-y-4`}>
            {/* LOGIN */}
            {item.type === 'LOGIN' && (
              <>
                {!secret?.username && !secret?.password && !secret?.url && !secret?.totpSecret && (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
                      <Key className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-zinc-200">No credentials saved yet</div>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        This login entry only has a title. Click &quot;Edit Record&quot; to add a username, password, or website.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-xs tactile-btn"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Add Credentials</span>
                    </button>
                  </div>
                )}

                {secret?.username && (
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-zinc-300">Username / Email</label>
                    <div
                      onClick={() => onCopy(secret.username, 'modal-user', 'Username copied')}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-2 min-w-0 ${
                        copiedId === 'modal-user'
                          ? 'bg-emerald-950/25 border-emerald-500/50'
                          : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      title="Click anywhere to copy username"
                    >
                      <span className="font-mono text-sm text-zinc-100 select-all truncate min-w-0 flex-1">
                        {secret.username}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopy(secret.username, 'modal-user', 'Username copied');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition focus-ring shrink-0 ${
                          copiedId === 'modal-user'
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      >
                        {copiedId === 'modal-user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === 'modal-user' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {secret?.password && (
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-zinc-300">Password</label>
                    <div
                      onClick={() => onCopy(secret.password, 'modal-pass', 'Password copied (auto-clears in 30s)')}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-2 min-w-0 ${
                        copiedId === 'modal-pass'
                          ? 'bg-emerald-950/25 border-emerald-500/50'
                          : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      title="Click anywhere to copy password"
                    >
                      <span className="font-mono text-sm text-zinc-100 tracking-wider truncate min-w-0 flex-1">
                        {revealedFields[`pass-${item.id}`] ? secret.password : '••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onToggleField(`pass-${item.id}`)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                          title={revealedFields[`pass-${item.id}`] ? 'Hide password' : 'Show password'}
                        >
                          {revealedFields[`pass-${item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopy(secret.password, 'modal-pass', 'Password copied (auto-clears in 30s)')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition focus-ring ${
                            copiedId === 'modal-pass'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        >
                          {copiedId === 'modal-pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === 'modal-pass' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {secret?.totpSecret && (
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-zinc-300">Two-Factor Authentication</label>
                    {totpCodes[item.id] ? (
                      <TotpDisplay
                        code={totpCodes[item.id].code}
                        secondsRemaining={totpCodes[item.id].secondsRemaining}
                        onCopy={(c) => onCopy(c, 'modal-totp', 'TOTP code copied')}
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

            {/* CARD */}
            {item.type === 'CARD' && (
              <div className="space-y-4">
                {!secret?.cardNumber && !secret?.cardholderName && (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-amber-400">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-zinc-200">No card details saved</div>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        Click &quot;Edit Record&quot; to add your cardholder name, number, expiration, and CVV.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-xs tactile-btn"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Add Card Details</span>
                    </button>
                  </div>
                )}

                {secret?.cardNumber && (
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">Card Number</label>
                      {getCardBrand(secret.cardNumber) !== 'generic' && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                          {getCardBrand(secret.cardNumber).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div
                      onClick={() => onCopy(secret.cardNumber.replace(/\s+/g, ''), 'card-num', 'Card number copied')}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-2 min-w-0 ${
                        copiedId === 'card-num'
                          ? 'bg-emerald-950/25 border-emerald-500/50'
                          : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      title="Click anywhere to copy card number"
                    >
                      <span className="font-mono text-sm sm:text-base tracking-widest text-zinc-100 truncate min-w-0 flex-1">
                        {revealedFields[`card-${item.id}`]
                          ? formatCardNumber(secret.cardNumber)
                          : `•••• •••• •••• ${secret.cardNumber.replace(/\s+/g, '').slice(-4)}`}
                      </span>
                      <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onToggleField(`card-${item.id}`)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                          title={revealedFields[`card-${item.id}`] ? 'Mask card number' : 'Reveal card number'}
                        >
                          {revealedFields[`card-${item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopy(secret.cardNumber.replace(/\s+/g, ''), 'card-num', 'Card number copied')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition focus-ring ${
                            copiedId === 'card-num'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        >
                          {copiedId === 'card-num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === 'card-num' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cardholder Name */}
                {secret?.cardholderName && (
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-zinc-300">Cardholder Name</label>
                    <div
                      onClick={() => onCopy(secret.cardholderName, 'card-holder', 'Cardholder copied')}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-2 min-w-0 ${
                        copiedId === 'card-holder'
                          ? 'bg-emerald-950/25 border-emerald-500/50'
                          : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      title="Click anywhere to copy name"
                    >
                      <span className="font-mono text-sm text-zinc-100 uppercase truncate min-w-0 flex-1">
                        {secret.cardholderName}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopy(secret.cardholderName, 'card-holder', 'Cardholder copied');
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition focus-ring ${
                          copiedId === 'card-holder'
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      >
                        {copiedId === 'card-holder' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === 'card-holder' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Expiry, CVV, and PIN grid */}
                {(secret?.expirationDate || secret?.cvv || secret?.pin) && (
                  <div className={`grid gap-3 min-w-0 ${secret?.pin ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
                    {secret?.expirationDate && (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-medium text-zinc-300">Expires</label>
                        <div
                          onClick={() => onCopy(secret.expirationDate, 'card-exp', 'Expiration date copied')}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-1.5 min-w-0 ${
                            copiedId === 'card-exp'
                              ? 'bg-emerald-950/25 border-emerald-500/50'
                              : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                          }`}
                          title="Click anywhere to copy expiration date"
                        >
                          <span className="font-mono text-sm text-zinc-100 truncate min-w-0 flex-1">
                            {secret.expirationDate}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopy(secret.expirationDate, 'card-exp', 'Expiration date copied');
                            }}
                            className={`p-1.5 rounded-lg border text-xs transition focus-ring ${
                              copiedId === 'card-exp'
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                            }`}
                            title="Copy expiration date"
                          >
                            {copiedId === 'card-exp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {secret?.cvv && (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-medium text-zinc-300">CVV / CVC</label>
                        <div
                          onClick={() => onCopy(secret.cvv, 'card-cvv', 'CVV copied')}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-1.5 min-w-0 ${
                            copiedId === 'card-cvv'
                              ? 'bg-emerald-950/25 border-emerald-500/50'
                              : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                          }`}
                          title="Click anywhere to copy CVV"
                        >
                          <span className="font-mono text-sm text-zinc-100 tracking-wider truncate min-w-0 flex-1">
                            {revealedFields[`cvv-${item.id}`] ? secret.cvv : '•••'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => onToggleField(`cvv-${item.id}`)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                              title={revealedFields[`cvv-${item.id}`] ? 'Hide CVV' : 'Reveal CVV'}
                            >
                              {revealedFields[`cvv-${item.id}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onCopy(secret.cvv, 'card-cvv', 'CVV copied')}
                              className={`p-1.5 rounded-lg border text-xs transition focus-ring ${
                                copiedId === 'card-cvv'
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                  : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                              }`}
                              title="Copy CVV"
                            >
                              {copiedId === 'card-cvv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {secret?.pin && (
                      <div className="space-y-1.5 min-w-0">
                        <label className="text-xs font-medium text-zinc-300">Card PIN</label>
                        <div
                          onClick={() => onCopy(secret.pin, 'card-pin', 'PIN copied')}
                          className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-1.5 min-w-0 ${
                            copiedId === 'card-pin'
                              ? 'bg-emerald-950/25 border-emerald-500/50'
                              : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                          }`}
                          title="Click anywhere to copy PIN"
                        >
                          <span className="font-mono text-sm text-zinc-100 tracking-wider truncate min-w-0 flex-1">
                            {revealedFields[`pin-${item.id}`] ? secret.pin : '••••'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => onToggleField(`pin-${item.id}`)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                              title={revealedFields[`pin-${item.id}`] ? 'Hide PIN' : 'Reveal PIN'}
                            >
                              {revealedFields[`pin-${item.id}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onCopy(secret.pin, 'card-pin', 'PIN copied')}
                              className={`p-1.5 rounded-lg border text-xs transition focus-ring ${
                                copiedId === 'card-pin'
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                  : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                              }`}
                              title="Copy PIN"
                            >
                              {copiedId === 'card-pin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* API_KEY */}
            {item.type === 'API_KEY' && (
              <div className="space-y-3">
                {!secret?.apiKey && (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-indigo-400">
                      <Terminal className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-zinc-200">No API key saved</div>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        Click &quot;Edit Record&quot; to enter your service API key, token, or endpoint URL.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-xs tactile-btn"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Add API Key</span>
                    </button>
                  </div>
                )}

                {secret?.apiKey && (
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-zinc-300">API Key / Token</label>
                    <div
                      onClick={() => onCopy(secret.apiKey, 'api-key', 'API key copied')}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-2 min-w-0 ${
                        copiedId === 'api-key'
                          ? 'bg-emerald-950/25 border-emerald-500/50'
                          : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      title="Click anywhere to copy API key"
                    >
                      <span className="font-mono text-xs text-zinc-100 truncate min-w-0 flex-1">
                        {revealedFields[`api-${item.id}`] ? secret.apiKey : '••••••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onToggleField(`api-${item.id}`)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                          title={revealedFields[`api-${item.id}`] ? 'Hide API key' : 'Show API key'}
                        >
                          {revealedFields[`api-${item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopy(secret.apiKey, 'api-key', 'API key copied')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition focus-ring ${
                            copiedId === 'api-key'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        >
                          {copiedId === 'api-key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === 'api-key' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {secret?.apiSecret && (
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-zinc-300">API Secret / Client Secret</label>
                    <div
                      onClick={() => onCopy(secret.apiSecret, 'api-secret', 'API secret copied')}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none gap-2 min-w-0 ${
                        copiedId === 'api-secret'
                          ? 'bg-emerald-950/25 border-emerald-500/50'
                          : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                      title="Click anywhere to copy API secret"
                    >
                      <span className="font-mono text-xs text-zinc-100 truncate min-w-0 flex-1">
                        {revealedFields[`secret-${item.id}`] ? secret.apiSecret : '••••••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onToggleField(`secret-${item.id}`)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition focus-ring"
                          title={revealedFields[`secret-${item.id}`] ? 'Hide API secret' : 'Show API secret'}
                        >
                          {revealedFields[`secret-${item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopy(secret.apiSecret, 'api-secret', 'API secret copied')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition focus-ring ${
                            copiedId === 'api-secret'
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                              : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                          }`}
                        >
                          {copiedId === 'api-secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === 'api-secret' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECURE_NOTE */}
            {item.type === 'SECURE_NOTE' && (
              <div className="space-y-1.5">
                {!secret?.content ? (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-emerald-400">
                      <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-zinc-200">Empty secure note</div>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        Click &quot;Edit Record&quot; to write encrypted private notes, recovery codes, or sensitive info.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-xs tactile-btn"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Write Note</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="text-xs font-medium text-zinc-300">Note Content</label>
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                      {secret.content}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Shared Notes */}
            {secret?.notes && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <label className="text-xs font-medium text-zinc-400">Additional Notes</label>
                <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 text-xs text-zinc-300 whitespace-pre-wrap">
                  {secret.notes}
                </div>
              </div>
            )}

            {/* Timestamps & Security Badge */}
            <div className="pt-4 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Lock className="w-3 h-3 text-zinc-400" />
                <span>Encrypted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Only for mobile drawer when not inline) */}
        {!inline && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
            {confirmDeleteId === item.id ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onDelete(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition shadow-sm focus-ring"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete</span>
                </button>
                <button
                  onClick={() => onSetConfirmDelete(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition focus-ring"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSetConfirmDelete(item.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs font-medium transition focus-ring"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={() => onEdit(record)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition shadow-sm tactile-btn focus-ring"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Record</span>
            </button>
          </div>
        )}
      </div>
  );

  if (inline) {
    return innerContent;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-detail-title"
      className="fixed inset-0 z-50 flex justify-end animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      {innerContent}
    </div>
  );
};

