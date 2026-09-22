import React, { useState } from 'react';
import { X, Copy, Check, RefreshCw, ShieldCheck, Unlink, Puzzle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pairingCode: string;
  isPaired: boolean;
  onRegenerateCode: () => void;
  onUnpair: () => void;
}

export const CompanionPairingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pairingCode,
  isPaired,
  onRegenerateCode,
  onUnpair,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formattedCode =
    pairingCode.length === 6
      ? `${pairingCode.slice(0, 3)} ${pairingCode.slice(3)}`
      : pairingCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
              <Puzzle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Companion Extension</h2>
              <p className="text-xs text-zinc-400">Authenticated Autofill Bridge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isPaired ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-emerald-300">
                    Extension Connected & Authorized
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your browser companion is authenticated with an ephemeral in-memory session token.
                    Autofill requests from other tabs are accepted only via this paired channel.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">
                  Channel Security Status
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-300 font-mono">
                  <span>Authentication</span>
                  <span className="text-emerald-400">Pairing Token Verified</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-300 font-mono">
                  <span>Scope</span>
                  <span>Active Session Only</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onUnpair}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-800 hover:bg-rose-950/40 hover:border-rose-700/60 hover:text-rose-300 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-medium transition"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect & Revoke Extension Access</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                To prevent unauthorized scripts or rogue extensions from accessing your vault, enter
                this one-time 6-digit code into your Mountain Companion popup.
              </p>

              {/* Code Display Box */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  One-Time Pairing Code
                </div>
                <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-white select-all">
                  {formattedCode}
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 transition active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onRegenerateCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
                    title="Generate new pairing code"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-2 text-xs text-zinc-400 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
                <div className="font-medium text-zinc-300">How to connect:</div>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                  <li>Click the Mountain icon in your browser extension toolbar.</li>
                  <li>Enter the 6-digit code above and click <strong>Authorize</strong>.</li>
                  <li>Autofill will be instantly active and authenticated.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
