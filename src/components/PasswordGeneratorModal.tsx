import React, { useState, useEffect } from 'react';
import { generatePassword, GeneratorOptions } from '../crypto/generator.js';
import { Copy, Check, RefreshCw, X, KeyRound } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword?: (password: string) => void;
  onSelect?: (password: string) => void;
  title?: string;
  submitLabel?: string;
}

const LENGTH_PRESETS = [16, 20, 24, 32];

export const PasswordGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectPassword,
  onSelect,
  title = 'Password Generator',
  submitLabel = 'Use Password',
}) => {
  const handleSelect = onSelectPassword || onSelect;

  const [options, setOptions] = useState<GeneratorOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
    avoidAmbiguous: true,
  });

  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const regenerate = () => {
    try {
      const pwd = generatePassword(options);
      setPassword(pwd);
      setCopied(false);
    } catch {
      setPassword('');
    }
  };

  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, options]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!isOpen) return null;

  const length = options.length || 20;
  let entropyRating = 'Moderate';
  let entropyColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  if (length >= 20 && options.symbols && options.digits) {
    entropyRating = 'Very Strong (128-bit)';
    entropyColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (length >= 14) {
    entropyRating = 'Strong (80-bit)';
    entropyColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="generator-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
    >
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 id="generator-title" className="text-sm font-semibold text-white">
                {title}
              </h3>
              <p className="text-xs text-zinc-400">
                {title.toLowerCase().includes('api')
                  ? 'Cryptographically secure random key'
                  : 'Cryptographically secure random characters'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Output Box */}
        <div className="space-y-2">
          <div
            onClick={handleCopy}
            title="Click to copy"
            className="p-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl font-mono text-center text-base tracking-wide break-all select-all text-zinc-100 cursor-pointer transition shadow-inner flex items-center justify-between gap-2"
          >
            <span className="flex-1 font-medium">{password || 'Select characters'}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                regenerate();
              }}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
              title="Generate new"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs px-0.5">
            <span className={`px-2 py-0.5 rounded-full border text-xs font-mono ${entropyColor}`}>
              {entropyRating}
            </span>
            <span className="text-zinc-400 text-xs">{length} characters</span>
          </div>
        </div>

        {/* Action buttons: Use Password (Primary) & Copy (Secondary) */}
        <div className="flex items-center gap-2">
          {handleSelect && (
            <button
              type="button"
              onClick={() => {
                if (password) {
                  handleSelect(password);
                  onClose();
                }
              }}
              disabled={!password}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold text-xs rounded-xl transition shadow-sm disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{submitLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            disabled={!password}
            className={`flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs transition disabled:opacity-40 ${
              handleSelect
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium'
                : 'flex-1 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold tactile-btn'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Configuration Options */}
        <div className="space-y-3.5 pt-2 border-t border-zinc-800/80 text-xs">
          {/* Presets + Length Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
              <label htmlFor="length-slider">Length</label>
              <div className="flex items-center gap-1.5">
                {LENGTH_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setOptions({ ...options, length: p })}
                    className={`px-2 py-0.5 rounded-md text-xs font-mono transition border ${
                      options.length === p
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <input
              id="length-slider"
              type="range"
              min="8"
              max="64"
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value, 10) })}
              className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
            />
          </div>

          {/* Character types */}
          <div className="grid grid-cols-2 gap-2 text-zinc-300">
            <label className="flex items-center space-x-2 cursor-pointer select-none p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition">
              <input
                type="checkbox"
                checked={options.uppercase}
                onChange={(e) => setOptions({ ...options, uppercase: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span className="text-xs">Uppercase (A-Z)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition">
              <input
                type="checkbox"
                checked={options.lowercase}
                onChange={(e) => setOptions({ ...options, lowercase: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span className="text-xs">Lowercase (a-z)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition">
              <input
                type="checkbox"
                checked={options.digits}
                onChange={(e) => setOptions({ ...options, digits: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span className="text-xs">Digits (0-9)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition">
              <input
                type="checkbox"
                checked={options.symbols}
                onChange={(e) => setOptions({ ...options, symbols: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span className="text-xs">Symbols (!@#$)</span>
            </label>
          </div>

          <label className="flex items-center space-x-2 text-xs text-zinc-400 cursor-pointer select-none pt-0.5">
            <input
              type="checkbox"
              checked={options.avoidAmbiguous}
              onChange={(e) => setOptions({ ...options, avoidAmbiguous: e.target.checked })}
              className="rounded accent-zinc-200"
            />
            <span>Avoid ambiguous characters (0, O, 1, l, I)</span>
          </label>
        </div>
      </div>
    </div>
  );
};
