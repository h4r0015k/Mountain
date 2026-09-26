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

/**
 * Extracts a distinctive 1-to-2 letter monogram for offline site badges.
 * Handles subdomains intelligently:
 * e.g. "billing.stripe.com"          -> "BI"
 *      "dashboard.stripe.com"        -> "DA"
 *      "irctc.co.in"                 -> "IR"
 *      "github.com"                  -> "GI"
 */
export function extractMonogram(url?: string, fallbackText = '•'): string {
  const domain = extractDomain(url);
  if (!domain) {
    const clean = fallbackText.trim();
    if (!clean) return '•';
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words[0] && words[1]) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }

  const parts = domain.toLowerCase().split('.');
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Handle multi-part TLDs (e.g. .co.in, .com.au, .org)
  const isMultiTld =
    parts.length > 2 &&
    parts[parts.length - 1].length <= 3 &&
    parts[parts.length - 2].length <= 3;
  const tldCount = isMultiTld ? 2 : 1;
  const domainParts = parts.slice(0, parts.length - tldCount);
  const sld = domainParts[domainParts.length - 1]; // e.g. "stripe"
  const subdomains = domainParts.slice(0, domainParts.length - 1); // e.g. ["billing"]

  if (subdomains.length > 0) {
    const rawSub = subdomains[subdomains.length - 1];
    // Strip common technical environment prefixes: dev-, staging-, test-, api-, prod-
    const cleanSub = rawSub.replace(
      /^(dev|staging|stg|test|prod|qa|uat|api|admin|app|auth|portal|web)[-_.]/i,
      ''
    );
    if (cleanSub) {
      const subWords = cleanSub.split(/[-_]/).filter(Boolean);
      if (subWords.length >= 2) {
        return (subWords[0][0] + subWords[1][0]).toUpperCase();
      }
      return cleanSub.slice(0, 2).toUpperCase();
    }
    return (rawSub[0] + (sld ? sld[0] : '')).toUpperCase();
  }

  if (sld && sld.length >= 2) {
    return sld.slice(0, 2).toUpperCase();
  }
  return (sld || domain[0]).toUpperCase();
}

function getDeterministicColor(key: string): { bg: string; text: string; border: string } {
  const colors = [
    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300' },
    { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-300' },
    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300' },
    { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-300' },
    { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300' },
    { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300' },
    { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-300' },
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
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
      ? 'w-8 h-8 text-[11px] rounded-lg'
      : size === 'lg'
      ? 'w-11 h-11 text-sm rounded-xl'
      : 'w-9 h-9 text-xs rounded-lg';

  const monogram = useMemo(() => extractMonogram(url, fallbackText), [url, fallbackText]);
  const theme = useMemo(
    () => getDeterministicColor(domain || fallbackText || monogram),
    [domain, fallbackText, monogram]
  );

  // If user disabled external favicon fetching or no domain, render zero-leakage local monogram badge
  if (!allowExternalFetch || !domain || imgFailed) {
    return (
      <div
        className={`${sizeDimensions} ${theme.bg} ${theme.border} ${theme.text} border font-semibold flex items-center justify-center font-mono select-none shrink-0 shadow-xs tracking-wide ${className}`}
      >
        <span>{monogram}</span>
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
