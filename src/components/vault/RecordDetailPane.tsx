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
} from 'lucide-react';
import { VirtualCardPreview, formatCardNumber } from './VirtualCardPreview.js';
import { TotpDisplay } from './TotpDisplay.js';
import { CategoryTypeBadge, RecordItemIconBadge } from './CategoryBadges.js';

interface Props {
  record: DecryptedRecord;
  revealedFields: Record<string, boolean>;
  copiedId: string | null;
  confirmDeleteId: string | null;
  totpCodes: Record<string, { code: string; secondsRemaining: number }>;
  allowExternalFavicon?: boolean;
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
  onClose,
  onToggleField,
  onCopy,
  onEdit,
  onDelete,
  onSetConfirmDelete,
}) => {
  const { item, secret } = record;

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

      {/* Right-docked Side Pane */}
      <div className="relative z-10 w-full sm:w-[480px] max-w-[92vw] h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <RecordItemIconBadge
              type={item.type}
              url={item.type === 'LOGIN' ? secret?.url : item.type === 'API_KEY' ? secret?.endpointUrl : undefined}
              title={item.title}
              size="md"
              allowExternalFetch={allowExternalFavicon}
            />
            <div className="min-w-0">
              <h3 id="record-detail-title" className="text-sm sm:text-base font-semibold text-zinc-100 truncate">
                {item.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <CategoryTypeBadge type={item.type} />
                {item.type === 'LOGIN' && secret?.url && (
                  <a
                    href={secret.url.startsWith('http') ? secret.url : `https://${secret.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors truncate focus-ring rounded"
                  >
                    <span className="truncate max-w-[160px]">
                      {secret.url.replace(/^https?:\/\//, '')}
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition focus-ring shrink-0"
            aria-label="Close record detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable details body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-w-0">
          {/* LOGIN */}
          {item.type === 'LOGIN' && (
            <>
              {secret?.username && (
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-zinc-300">Username / Email</label>
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                    <span className="font-mono text-sm text-zinc-100 select-all truncate min-w-0 flex-1">
                      {secret.username}
                    </span>
                    <button
                      onClick={() => onCopy(secret.username, 'modal-user', 'Username copied')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring shrink-0"
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
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                    <span className="font-mono text-sm text-zinc-100 tracking-wider select-all truncate min-w-0 flex-1">
                      {revealedFields[`pass-${item.id}`] ? secret.password : '••••••••••••••••••••'}
                    </span>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => onToggleField(`pass-${item.id}`)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition focus-ring"
                        title={revealedFields[`pass-${item.id}`] ? 'Hide password' : 'Show password'}
                      >
                        {revealedFields[`pass-${item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => onCopy(secret.password, 'modal-pass', 'Password copied (auto-clears in 30s)')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
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
              <VirtualCardPreview
                cardholderName={secret?.cardholderName}
                cardNumber={secret?.cardNumber}
                expirationDate={secret?.expirationDate}
                isRevealed={revealedFields[`card-${item.id}`]}
              />

              {secret?.cardNumber && (
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Card Number</label>
                    <button
                      onClick={() => onToggleField(`card-${item.id}`)}
                      className="text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1"
                    >
                      {revealedFields[`card-${item.id}`] ? (
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
                      {revealedFields[`card-${item.id}`]
                        ? formatCardNumber(secret.cardNumber)
                        : `•••• •••• •••• ${secret.cardNumber.replace(/\s+/g, '').slice(-4)}`}
                    </span>
                    <button
                      onClick={() => onCopy(secret.cardNumber.replace(/\s+/g, ''), 'card-num', 'Card number copied')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                    >
                      {copiedId === 'card-num' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'card-num' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API_KEY */}
          {item.type === 'API_KEY' && (
            <div className="space-y-3">
              {secret?.apiKey && (
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-zinc-300">API Key / Token</label>
                  <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800 gap-2 min-w-0">
                    <span className="font-mono text-xs text-zinc-100 truncate min-w-0 flex-1">
                      {revealedFields[`api-${item.id}`] ? secret.apiKey : '••••••••••••••••••••••••'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onToggleField(`api-${item.id}`)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition focus-ring"
                      >
                        {revealedFields[`api-${item.id}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => onCopy(secret.apiKey, 'api-key', 'API key copied')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition focus-ring"
                      >
                        {copiedId === 'api-key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECURE_NOTE */}
          {item.type === 'SECURE_NOTE' && secret?.content && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Note Content</label>
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                {secret.content}
              </div>
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

          {/* Timestamps */}
          <div className="pt-4 border-t border-zinc-800 text-[11px] font-mono text-zinc-500 flex justify-between">
            <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Footer Actions */}
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
      </div>
    </div>
  );
};
