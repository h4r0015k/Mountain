import React from 'react';
import { Copy, Check } from 'lucide-react';

export const TotpDisplay: React.FC<{
  code: string;
  secondsRemaining: number;
  onCopy?: (code: string) => void;
  copied?: boolean;
}> = ({ code, secondsRemaining, onCopy, copied = false }) => {
  const progressPercent = (secondsRemaining / 30) * 100;
  const isUrgent = secondsRemaining <= 5;
  const isWarning = secondsRemaining <= 10 && secondsRemaining > 5;

  const colorStyle = isUrgent
    ? 'text-rose-400 border-rose-800/80 bg-rose-950/20'
    : isWarning
    ? 'text-amber-400 border-amber-800/80 bg-amber-950/20'
    : 'text-emerald-400 border-emerald-800/80 bg-emerald-950/20';

  const barColor = isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-400';
  const badgeColor = isUrgent ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400';

  const formattedCode =
    code && code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code || '------';

  return (
    <div className={`p-3 rounded-xl border ${colorStyle} transition-all duration-300 relative overflow-hidden`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline space-x-2">
          <span className="font-mono text-xl sm:text-2xl font-bold tracking-wider select-all">
            {formattedCode}
          </span>
          <span className={`text-[11px] font-mono font-medium ${badgeColor}`}>
            {secondsRemaining}s
          </span>
        </div>

        {onCopy && code && (
          <button
            type="button"
            onClick={() => onCopy(code)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition focus-ring"
            title="Copy 6-digit TOTP code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>

      {/* Progress Bar Timer */}
      <div className="w-full h-1 bg-zinc-800/60 rounded-full mt-2.5 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-1000 ease-linear rounded-full`}
          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>
    </div>
  );
};
