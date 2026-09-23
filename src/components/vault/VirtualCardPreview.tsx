import React, { useMemo } from 'react';

export function getCardBrand(num: string): 'visa' | 'mastercard' | 'amex' | 'discover' | 'generic' {
  const clean = num.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^6(011|5)/.test(clean)) return 'discover';
  return 'generic';
}

export function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatCardExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

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
      <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

      {/* Top Row: Chip & Brand */}
      <div className="flex items-center justify-between z-10">
        <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-400/80 via-amber-200/90 to-amber-500/70 border border-amber-300/60 p-1 flex flex-col justify-around shadow-sm opacity-90">
          <div className="h-0.5 w-full bg-amber-700/40 rounded-full" />
          <div className="h-0.5 w-3/4 bg-amber-700/40 rounded-full" />
          <div className="h-0.5 w-full bg-amber-700/40 rounded-full" />
        </div>
        <div className="font-mono text-xs uppercase tracking-wider font-bold text-zinc-300 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50">
          {brand === 'visa' && 'VISA'}
          {brand === 'mastercard' && 'MASTERCARD'}
          {brand === 'amex' && 'AMEX'}
          {brand === 'discover' && 'DISCOVER'}
          {brand === 'generic' && 'CARD'}
        </div>
      </div>

      {/* Middle Row: Card Number */}
      <div className="z-10 my-auto py-2">
        <div className="font-mono text-base sm:text-lg tracking-widest text-zinc-100 drop-shadow-sm font-medium">
          {displayNum}
        </div>
      </div>

      {/* Bottom Row: Holder & Expiry */}
      <div className="flex items-end justify-between z-10 text-xs">
        <div className="space-y-0.5 max-w-[65%]">
          <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono">
            Cardholder
          </div>
          <div className="font-medium text-zinc-200 truncate uppercase tracking-wide">
            {cardholderName || 'NAME ON CARD'}
          </div>
        </div>
        <div className="space-y-0.5 text-right">
          <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono">
            Expires
          </div>
          <div className="font-mono font-medium text-zinc-200">
            {expirationDate ? formatCardExpiry(expirationDate) : 'MM/YY'}
          </div>
        </div>
      </div>
    </div>
  );
};
