import React, { useState, useEffect } from 'react';
import { generatePassword, GeneratorOptions } from '../crypto/generator.js';
import { Copy, Check, RefreshCw, X, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword?: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<Props> = ({ isOpen, onClose, onSelectPassword }) => {
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

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!isOpen) return null;

  const length = options.length || 20;
  let entropyRating = 'Moderate Entropy';
  let entropyColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  if (length >= 20 && options.symbols && options.digits) {
    entropyRating = '128+ Bits Entropy (Military Grade)';
    entropyColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (length >= 14) {
    entropyRating = '80+ Bits Entropy (Strong)';
    entropyColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-md bg-[#0f1015] border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5 glow-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-neutral-800 flex items-center justify-center text-zinc-300">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-white">CSPRNG Key Generator</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Output */}
        <div className="space-y-2">
          <div className="p-3.5 bg-[#0a0b0e] border border-neutral-800 rounded-xl font-mono text-center text-base tracking-wider break-all select-all text-zinc-100 shadow-inner">
            {password || 'Select characters'}
          </div>

          <div className="flex items-center justify-between text-[11px] px-0.5">
            <span className={`px-2 py-0.5 rounded-full border font-mono ${entropyColor}`}>
              {entropyRating}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleCopy}
            disabled={!password}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-white text-black font-semibold text-xs rounded-xl transition tactile-btn disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={regenerate}
            title="Regenerate"
            className="p-2 bg-[#14161d] hover:bg-[#1a1c24] text-zinc-300 rounded-xl transition border border-neutral-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3.5 pt-2 border-t border-neutral-800/60 text-xs">
          <div>
            <div className="flex justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
              <span>Length</span>
              <span className="text-zinc-200 font-bold">{options.length}</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value, 10) })}
              className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-zinc-300">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.uppercase}
                onChange={(e) => setOptions({ ...options, uppercase: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span>Uppercase (A-Z)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.lowercase}
                onChange={(e) => setOptions({ ...options, lowercase: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span>Lowercase (a-z)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.digits}
                onChange={(e) => setOptions({ ...options, digits: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span>Digits (0-9)</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.symbols}
                onChange={(e) => setOptions({ ...options, symbols: e.target.checked })}
                className="rounded accent-zinc-200"
              />
              <span>Symbols (!@#$)</span>
            </label>
          </div>

          <label className="flex items-center space-x-2 text-[11px] text-zinc-500 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={options.avoidAmbiguous}
              onChange={(e) => setOptions({ ...options, avoidAmbiguous: e.target.checked })}
              className="rounded accent-zinc-200"
            />
            <span>Exclude ambiguous (0, O, 1, l, I)</span>
          </label>
        </div>

        {onSelectPassword && (
          <button
            onClick={() => {
              if (password) {
                onSelectPassword(password);
                onClose();
              }
            }}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl text-xs font-medium transition border border-neutral-700/60"
          >
            Insert into Form
          </button>
        )}
      </div>
    </div>
  );
};
