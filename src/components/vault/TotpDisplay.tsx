import React from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';

export const TotpDisplay: React.FC<{
  code: string;
  secondsRemaining: number;
  onCopy?: (code: string) => void;
  copied?: boolean;
}> = ({ code, secondsRemaining, onCopy, copied = false }) => {
  const isUrgent = secondsRemaining <= 5;
  const isWarning = secondsRemaining <= 10 && secondsRemaining > 5;

  // Split code into two 3-digit segments for clean legibility
  const part1 = code && code.length >= 3 ? code.slice(0, 3) : code || '---';
  const part2 = code && code.length >= 6 ? code.slice(3, 6) : '';

  // Circular timer geometry (radius = 7.5, circumference = 2 * PI * 7.5 ~= 47.12)
  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / 30));
  const strokeDashoffset = circumference * (1 - progressRatio);

  const timerColor = isUrgent
    ? 'text-rose-400'
    : isWarning
    ? 'text-amber-400'
    : 'text-emerald-400';

  return (
    <div
      onClick={() => onCopy && code && onCopy(code)}
      className={`group relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-150 cursor-pointer select-none ${
        copied
          ? 'bg-emerald-950/20 border-emerald-500/50 shadow-xs'
          : 'bg-zinc-950 hover:bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
      }`}
      title={onCopy && code ? 'Click anywhere to copy verification code' : undefined}
    >
      {/* Left: Shield Icon + Digits */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>

        <div className="flex items-center gap-2 font-mono text-xl sm:text-2xl font-bold tracking-wider text-zinc-100 group-hover:text-white transition">
          <span>{part1}</span>
          {part2 && <span className="text-zinc-600 text-lg font-normal">•</span>}
          {part2 && <span>{part2}</span>}
        </div>
      </div>

      {/* Right Controls: Circular Ring Countdown + Copy Button */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Circular Countdown Ring */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
          <svg className="w-4 h-4 -rotate-90 shrink-0" viewBox="0 0 20 20">
            <circle
              cx="10"
              cy="10"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-zinc-800"
            />
            <circle
              cx="10"
              cy="10"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-[stroke-dashoffset] duration-1000 ease-linear ${timerColor}`}
            />
          </svg>
          <span className={`font-mono text-xs font-semibold tabular-nums ${timerColor}`}>
            {secondsRemaining}s
          </span>
        </div>

        {/* Copy Action */}
        {onCopy && code && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(code);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition focus-ring ${
              copied
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-xs'
                : 'bg-zinc-900 group-hover:bg-zinc-800 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
            }`}
            title="Copy verification code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
