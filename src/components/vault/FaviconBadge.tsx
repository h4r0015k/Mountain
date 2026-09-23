import React, { useMemo, useState } from 'react';

export function extractDomain(url?: string): string | null {
  if (!url || !url.trim()) return null;
  try {
    const raw = url.trim();
    const clean = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
    const parsed = new URL(clean);
    const host = parsed.hostname.replace(/^www\./, '');
    if (!host || !host.includes('.')) return null;
    return host;
  } catch {
    return null;
  }
}

function getDeterministicColor(domainOrTitle: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-emerald-950/70 border-emerald-700/50', text: 'text-emerald-300' },
    { bg: 'bg-indigo-950/70 border-indigo-700/50', text: 'text-indigo-300' },
    { bg: 'bg-blue-950/70 border-blue-700/50', text: 'text-blue-300' },
    { bg: 'bg-violet-950/70 border-violet-700/50', text: 'text-violet-300' },
    { bg: 'bg-cyan-950/70 border-cyan-700/50', text: 'text-cyan-300' },
    { bg: 'bg-amber-950/70 border-amber-700/50', text: 'text-amber-300' },
    { bg: 'bg-rose-950/70 border-rose-700/50', text: 'text-rose-300' },
  ];
  let hash = 0;
  for (let i = 0; i < domainOrTitle.length; i++) {
    hash = (hash << 5) - hash + domainOrTitle.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export const FaviconBadge: React.FC<{
  url?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  allowExternalFetch?: boolean;
}> = ({
  url,
  fallbackText = '•',
  size = 'md',
  className = '',
  allowExternalFetch = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const domain = useMemo(() => extractDomain(url), [url]);

  const sizeDimensions =
    size === 'sm'
      ? 'w-7 h-7 text-xs rounded-md'
      : size === 'lg'
      ? 'w-11 h-11 text-base rounded-xl'
      : 'w-9 h-9 text-sm rounded-lg';

  const letter = (domain ? domain[0] : fallbackText[0] || '•').toUpperCase();
  const theme = getDeterministicColor(domain || fallbackText);

  // If user disabled external favicon fetching or no domain, render zero-leakage local letter badge
  if (!allowExternalFetch || !domain || imgFailed) {
    return (
      <div
        className={`${sizeDimensions} ${theme.bg} ${theme.text} border font-semibold flex items-center justify-center font-mono select-none shrink-0 shadow-xs ${className}`}
      >
        <span>{letter}</span>
      </div>
    );
  }

  const iconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  return (
    <div
      className={`${sizeDimensions} bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1.5 shrink-0 overflow-hidden ${className}`}
    >
      <img
        src={iconUrl}
        alt=""
        className="w-full h-full object-contain"
        onError={() => setImgFailed(true)}
        loading="lazy"
      />
    </div>
  );
};
