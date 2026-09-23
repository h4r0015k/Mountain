import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ExternalLink, Copy, Check } from 'lucide-react';

export const GoogleOAuthHelpGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedScope, setCopiedScope] = useState(false);

  const driveScope = 'https://www.googleapis.com/auth/drive.file';

  const handleCopyScope = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(driveScope);
      setCopiedScope(true);
      setTimeout(() => setCopiedScope(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden text-xs transition">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 sm:p-3 flex items-center justify-between text-zinc-300 hover:text-white hover:bg-zinc-900/50 transition text-left focus-ring"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2 font-medium min-w-0 pr-2">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">How to generate a Google Drive Access Token (1-min guide)</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="p-3 pt-2 border-t border-zinc-800/80 space-y-2.5 bg-zinc-950 max-h-56 overflow-y-auto text-xs">
          {/* Step 1 */}
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-zinc-200 font-medium">Open </span>
              <a
                href="https://developers.google.com/oauthplayground/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                <span>OAuth 2.0 Playground</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-zinc-300">
                In <strong>Step 1</strong>, paste scope under <em>Input your own scopes</em>:
              </div>
              <div className="flex items-center justify-between gap-1.5 p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg min-w-0">
                <code className="text-[10px] font-mono text-zinc-300 truncate select-all flex-1">
                  {driveScope}
                </code>
                <button
                  type="button"
                  onClick={handleCopyScope}
                  className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-medium rounded transition flex items-center gap-1 shrink-0 border border-zinc-700/60 focus-ring"
                >
                  {copiedScope ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5 text-zinc-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-zinc-400 text-[11px]">
                Click <strong className="text-zinc-200">Authorize APIs</strong> and select your Google account.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div className="min-w-0 flex-1 text-zinc-300">
              In <strong>Step 2</strong>, click <strong className="text-zinc-200">Exchange authorization code for tokens</strong>.
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              4
            </span>
            <div className="min-w-0 flex-1 text-zinc-300">
              Copy the <strong className="text-emerald-400">Access token</strong> (<code className="text-zinc-200 font-mono text-[10px] bg-zinc-900 px-1 py-0.5 rounded">ya29...</code>) into the input above.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
