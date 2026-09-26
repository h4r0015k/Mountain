import React from 'react';
import { VaultItemType } from '../../models/vault.js';
import { Key, CreditCard, Terminal, FileText } from 'lucide-react';
import { FaviconBadge } from './FaviconBadge.js';

export const getTypeIcon = (type: VaultItemType, className = 'w-4 h-4 text-zinc-200') => {
  switch (type) {
    case 'LOGIN':
      return <Key className={className} />;
    case 'CARD':
      return <CreditCard className={className} />;
    case 'API_KEY':
      return <Terminal className={className} />;
    case 'SECURE_NOTE':
      return <FileText className={className} />;
  }
};

export const getTypeLabel = (type: VaultItemType): string => {
  switch (type) {
    case 'LOGIN':
      return 'Login';
    case 'CARD':
      return 'Payment Card';
    case 'API_KEY':
      return 'API Key';
    case 'SECURE_NOTE':
      return 'Secure Note';
  }
};

export const CategoryTypeBadge: React.FC<{ type: VaultItemType }> = ({ type }) => {
  switch (type) {
    case 'LOGIN':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50">
          LOGIN
        </span>
      );
    case 'CARD':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/40 text-amber-300 border border-amber-600/30">
          CARD
        </span>
      );
    case 'API_KEY':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/40 text-indigo-300 border border-indigo-600/30">
          API KEY
        </span>
      );
    case 'SECURE_NOTE':
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/50">
          NOTE
        </span>
      );
  }
};

export const RecordItemIconBadge: React.FC<{
  type: VaultItemType;
  url?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  allowExternalFetch?: boolean;
}> = ({ type, url, title = '', size = 'md', allowExternalFetch = false }) => {
  if (type === 'LOGIN') {
    return <FaviconBadge url={url || title} fallbackText={title} size={size} allowExternalFetch={allowExternalFetch} />;
  }

  const sizeClass =
    size === 'sm' ? 'w-8 h-8 rounded-lg text-xs' : size === 'lg' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-lg';

  const iconClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  switch (type) {
    case 'CARD':
      return (
        <div className={`${sizeClass} bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs`}>
          <CreditCard className={`${iconClass} text-amber-400`} />
        </div>
      );
    case 'API_KEY':
      return (
        <div className={`${sizeClass} bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-xs`}>
          <Terminal className={`${iconClass} text-indigo-400`} />
        </div>
      );
    case 'SECURE_NOTE':
      return (
        <div className={`${sizeClass} bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 shadow-xs`}>
          <FileText className={`${iconClass} text-zinc-300`} />
        </div>
      );
    default:
      return (
        <div className={`${sizeClass} bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0 shadow-xs`}>
          <Key className={`${iconClass} text-zinc-300`} />
        </div>
      );
  }
};
