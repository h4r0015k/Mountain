import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  ExternalLink,
  Cpu,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  Zap,
  Terminal,
  CloudOff,
  Layers,
  KeyRound,
  FileCheck2,
  HelpCircle,
  Database,
  Smartphone,
  RefreshCw,
  FolderLock,
  Menu,
  X
} from 'lucide-react';

const MATRIX_GLYPHS = '0123456789ABCDEF$#@%&*<>{}[]/?~!=+';

const ROTATING_ONE_LINERS = [
  'Only on your devices.',
  'Zero corporate servers.',
  'Your 12-word paper key.',
  'Zero accounts to breach.',
  'Encrypted at your edge.',
  '100% private. Free forever.'
];

interface MatrixScrambleProps {
  targetText: string;
  className?: string;
}

const MatrixScrambleText: React.FC<MatrixScrambleProps> = ({
  targetText,
  className = ''
}) => {
  const [displayText, setDisplayText] = useState(targetText);
  const [progressIndex, setProgressIndex] = useState(0);
  const [isScrambling, setIsScrambling] = useState(true);

  useEffect(() => {
    setIsScrambling(true);
    let step = 0;
    const totalSteps = targetText.length;

    const interval = setInterval(() => {
      setDisplayText(() => {
        return targetText
          .split('')
          .map((char, idx) => {
            if (char === ' ') return ' ';
            if (idx < Math.floor(step)) {
              return targetText[idx];
            }
            return MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
          })
          .join('');
      });

      setProgressIndex(Math.floor(step));

      if (step >= totalSteps) {
        clearInterval(interval);
        setDisplayText(targetText);
        setIsScrambling(false);
      }

      step += 0.8;
    }, 30);

    return () => clearInterval(interval);
  }, [targetText]);

  return (
    <span className={`inline-block ${className}`}>
      {displayText.split('').map((char, idx) => {
        const isResolved = !isScrambling || idx < progressIndex;
        const isLeadingChar = isScrambling && idx === progressIndex;

        let style = 'text-zinc-400 transition-colors duration-100';
        if (isLeadingChar) {
          style = 'text-emerald-300 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]';
        } else if (!isResolved) {
          style = 'text-emerald-500/70 select-none';
        }

        return (
          <span key={idx} className={style}>
            {char}
          </span>
        );
      })}
    </span>
  );
};

export const MountainIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Ridge line for mountain depth */}
    <path d="M12 5 L12 17.5" opacity="0.45" />
    {/* Secondary Peak (Right) */}
    <path d="M16.5 13.5 L21 8.5 L29 25 H22" />
    {/* Main Mountain with Keyhole Cutout Base */}
    <path d="M10.2 25 H3 L12 5 L22 25 H13.8 L13.2 21.2 A 1.8 1.8 0 1 0 10.8 21.2 L10.2 25 Z" />
  </svg>
);

interface Props {
  hasExistingVault: boolean;
  vaultItemCount?: number;
  onLaunchVault?: () => void;
}

export const ShowcaseDashboard: React.FC<Props> = ({
  hasExistingVault,
  vaultItemCount = 0,
  onLaunchVault,
}) => {
  // Rotating Hero One-Liners
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Diagnostics & In-Browser Self-Test State
  const [webCryptoAvailable, setWebCryptoAvailable] = useState<boolean | null>(null);
  const [indexedDbAvailable, setIndexedDbAvailable] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % ROTATING_ONE_LINERS.length);
    }, 3800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setWebCryptoAvailable(typeof window !== 'undefined' && !!window.crypto?.subtle);
    setIndexedDbAvailable(typeof window !== 'undefined' && 'indexedDB' in window);
  }, []);

  // Run a live in-browser WebCrypto AES-256-GCM self-test for technical users
  const runSelfTest = async () => {
    setTesting(true);
    try {
      const start = performance.now();
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const payload = new TextEncoder().encode('mountain_integrity_check');
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        payload
      );
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      const decoded = new TextDecoder().decode(decrypted);
      const elapsed = (performance.now() - start).toFixed(2);

      if (decoded === 'mountain_integrity_check') {
        setTestResult(`Test Passed in ${elapsed}ms: AES-256-GCM AEAD encryption verified on your device hardware.`);
      } else {
        setTestResult('Integrity verification failed');
      }
    } catch (err: any) {
      setTestResult(`Self-test error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white flex flex-col">
      {/* Top Hairline Header */}
      <header className="border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
              <MountainIcon className="w-4 h-4 text-zinc-200" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">Mountain</span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                Free & Open Source
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-xs text-zinc-400 font-medium">
            <a
              href="#how-it-works"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-zinc-900/60 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#technical-section"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-zinc-900/60 transition-colors"
            >
              Technical Breakdown
            </a>
            <a
              href="https://github.com/h4r0015k/Mountain"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-zinc-900/60 transition-colors flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3 h-3 text-zinc-500" />
            </a>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Runs on your device</span>
            </div>

            <a
              href="https://github.com/h4r0015k/Mountain"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="GitHub Repository"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>

            <button
              onClick={onLaunchVault}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition-all active:scale-[0.98] shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-900" />
              <span>Launch Tool</span>
              {hasExistingVault && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800">
                  {vaultItemCount} items
                </span>
              )}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800/80 bg-[#09090b]/98 backdrop-blur-lg px-4 py-3 space-y-1 animate-fade-in">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#technical-section"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Technical Breakdown
            </a>
            <a
              href="https://github.com/h4r0015k/Mountain"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </a>

            <div className="pt-3 pb-1 border-t border-zinc-800/80 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLaunchVault?.();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-sm transition-all"
              >
                <Lock className="w-4 h-4 text-zinc-950" />
                <span>Launch Password Vault</span>
              </button>
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Runs on your device</span>
                </div>
                <span className="text-zinc-500 text-[11px]">{hasExistingVault ? `${vaultItemCount} items` : 'Ready'}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section (Product / Layman Focus) */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-b border-zinc-800/80 relative overflow-hidden">
        {/* Soft Ambient Breathing Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-gradient-to-tr from-zinc-800/20 via-zinc-700/10 to-transparent rounded-full blur-[90px] pointer-events-none -z-10 animate-pulse-slow" />

        <div className="max-w-4xl mx-auto">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>LOCAL-FIRST // 100% PRIVATE // OPEN SOURCE</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-5 animate-fade-in-delayed-1">
            <div>Your passwords.</div>
            <div className="mt-1.5 sm:mt-2 min-h-[3.6rem] sm:min-h-[2.5rem] md:min-h-[3rem] lg:min-h-[3.8rem] flex items-center">
              <MatrixScrambleText
                targetText={ROTATING_ONE_LINERS[phraseIndex]}
                className="font-mono text-xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight"
              />
            </div>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed mb-8 animate-fade-in-delayed-2">
            An open-source, local-first password manager. Encrypted client-side, backed up to your personal Google Drive, and completely free of company-hosted databases.
          </p>

          {/* Action Button Group */}
          <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-delayed-3">
            <button
              onClick={onLaunchVault}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-xs sm:text-sm transition-all active:scale-[0.98] shadow-sm"
            >
              <Lock className="w-4 h-4 text-zinc-950" />
              <span>{hasExistingVault ? 'Unlock Password Vault' : 'Launch Password Vault'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-700" />
            </button>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 font-medium text-xs sm:text-sm transition-colors"
            >
              <span>See How It Works</span>
            </a>

            <a
              href="https://github.com/h4r0015k/Mountain"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 font-medium text-xs sm:text-sm transition-colors"
            >
              <svg className="w-4 h-4 fill-current text-zinc-300" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </a>
          </div>

          <div className="text-[11px] font-mono text-zinc-500 animate-fade-in-delayed-3">
            • Free forever • No subscriptions • Zero tracking • No account creation needed
          </div>

          {/* Product Pillars Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-14 animate-fade-in-delayed-3">
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 hover:-translate-y-0.5 transition-all duration-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Privacy</div>
              <div className="text-base font-semibold text-zinc-100 mt-1">100% Local</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Lives on your device</div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 hover:-translate-y-0.5 transition-all duration-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Accounts</div>
              <div className="text-base font-semibold text-zinc-100 mt-1">Zero Signups</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">No email or login needed</div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 hover:-translate-y-0.5 transition-all duration-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Recovery</div>
              <div className="text-base font-semibold text-zinc-100 mt-1">12-Word Key</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Paper backup you control</div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 hover:-translate-y-0.5 transition-all duration-200">
              <div className="text-[11px] font-mono text-zinc-500 uppercase">Cloud Sync</div>
              <div className="text-base font-semibold text-zinc-100 mt-1">Personal Drive</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Your private Google Drive</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Product Features in Plain English) */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 border-b border-zinc-800/80">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              Core Concept
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Why Mountain is built differently
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl">
              Traditional password managers ask you to trust their corporate servers with your most sensitive credentials. Mountain changes that relationship completely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <HardDrive className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">No Company Servers</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When a regular password manager company gets breached, your encrypted vault is out there. With Mountain, there is no company server to hack. The app runs straight in your web browser and stores data only in your local browser storage.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <KeyRound className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">A 12-Word Paper Key</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Instead of making up a password that can be forgotten or guessed, Mountain creates a 12-word master recovery phrase. Write it down on a piece of paper. It serves as your permanent, unhackable master key.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Smartphone className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Fast Daily Unlock</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You don't need to type your 12 words every time you open the app. You can set a fast daily PIN or passcode to quickly open your vault on your phone or laptop.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <FolderLock className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Backups on Your Own Google Drive</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Want to sync passwords across your phone and laptop? Mountain connects directly to your own Google Drive. Your vault is fully locked with military-grade encryption before it ever leaves your browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Technical Breakdown Section */}
      <section id="technical-section" className="py-20 px-4 sm:px-6 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="max-w-4xl mx-auto">
          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>For Engineers & Cryptographers</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Technical Architecture & Security
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl">
                Answers to technical questions about encryption primitives, key derivation, memory lifecycle, and threat models.
              </p>
            </div>

            <a
              href="https://github.com/h4r0015k/Mountain"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium transition-colors"
            >
              <span>View Source Code</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </a>
          </div>

          {/* Technical Q&A / Spec Matrix */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40 divide-y divide-zinc-800 mb-8">
            {/* Q1: Encryption */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">01 // Payload Encryption</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  AES-256-GCM
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                How are credentials encrypted and protected against tampering?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Mountain uses <strong>AES-256-GCM</strong> (Authenticated Encryption with Associated Data, NIST SP 800-38D) directly via the browser's native Web Cryptography API. Every saved credential receives a fresh, cryptographically random 12-byte initialization vector (IV) generated with <code className="text-zinc-300 font-mono">crypto.getRandomValues()</code>. This guarantees nonce uniqueness and detects any ciphertext modification or bit-flipping attacks immediately.
              </p>
            </div>

            {/* Q2: KDF */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">02 // Key Derivation</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  PBKDF2 (600,000 rounds)
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                How does quick PIN unlock defend against brute-force attacks?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your daily PIN or passphrase is run through <strong>PBKDF2-HMAC-SHA256</strong> with <strong>600,000 iterations</strong> and a unique 16-byte random cryptographic salt. This conforms to OWASP 2024 password storage guidelines and introduces sufficient computational delay to render GPU, FPGA, and ASIC-accelerated rainbow table searches impractical.
              </p>
            </div>

            {/* Q3: Mnemonic */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">03 // Master Identity</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  BIP-39 Standard
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                How does the 12-word recovery seed work mathematically?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Mountain implements the Bitcoin BIP-39 standard using the audited <code className="text-zinc-300 font-mono">@scure/bip39</code> library. 128 bits of CSPRNG entropy are sampled from the system hardware, mapped to 12 words from the standardized 2,048-word English dictionary, and verified via a SHA-256 checksum. Master seeds can be deterministically expanded into 512-bit root keys without relying on third-party verification servers.
              </p>
            </div>

            {/* Q4: Storage */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">04 // Client Persistence</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  Native IndexedDB
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                Where is the encrypted data stored on the machine?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All data is saved asynchronously to your browser's origin-isolated IndexedDB database (<code className="text-zinc-300 font-mono">mountain_vault_db</code>). Snapshots are stored exclusively in their encrypted AEAD form. The application contains zero analytics trackers, zero external fonts, and sends zero telemetry requests.
              </p>
            </div>

            {/* Q5: Sync */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">05 // Private Cloud Sync</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  Google Drive appDataFolder
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                How does sync work without intermediate servers?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Mountain communicates directly with Google's OAuth 2.0 PKCE endpoints without an intermediary backend. Encrypted snapshot files are written to the hidden Google Drive <code className="text-zinc-300 font-mono">appDataFolder</code>—a special directory accessible only by Mountain. Because data is encrypted before transmission, Google and network observers see only opaque ciphertext.
              </p>
            </div>
          </div>

          {/* In-Browser Hardware Crypto Verification Test */}
          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-300">
                  <Database className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Hardware & Browser Sandbox Verification</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Run a live encryption/decryption round-trip directly in your browser's WebCrypto subsystem.
                </p>
              </div>

              <button
                onClick={runSelfTest}
                disabled={testing}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-medium text-xs transition-colors shrink-0"
              >
                <Zap className={`w-3.5 h-3.5 text-amber-400 ${testing ? 'animate-bounce' : ''}`} />
                <span>{testing ? 'Testing...' : 'Test Browser Crypto Speed'}</span>
              </button>
            </div>

            {/* Diagnostic Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-3 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className={`w-2 h-2 rounded-full ${webCryptoAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span>WebCrypto API: {webCryptoAvailable ? 'ACTIVE' : 'UNAVAILABLE'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className={`w-2 h-2 rounded-full ${indexedDbAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span>IndexedDB: {indexedDbAvailable ? 'READY' : 'UNAVAILABLE'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <span className={`w-2 h-2 rounded-full ${hasExistingVault ? 'bg-indigo-400' : 'bg-zinc-600'}`} />
                <span>Local Snapshot: {hasExistingVault ? `DETECTED (${vaultItemCount} records)` : 'READY TO INIT'}</span>
              </div>
            </div>

            {/* Live Test Readout */}
            {testResult && (
              <div className="mt-3.5 p-2.5 rounded-lg bg-black/60 border border-zinc-800 font-mono text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="mt-auto py-12 border-t border-zinc-800/80 text-xs text-zinc-400 bg-[#070709]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <MountainIcon className="w-3.5 h-3.5 text-zinc-200" />
                </div>
                <span className="font-semibold text-sm text-white">Mountain</span>
              </div>
              <p className="text-zinc-500 leading-relaxed text-xs max-w-xs">
                A free, local-first open-source password manager designed to run entirely in your browser with zero remote database reliance.
              </p>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 font-semibold mb-3">
                Navigation
              </div>
              <ul className="space-y-2 text-zinc-500">
                <li>
                  <a href="#how-it-works" className="hover:text-zinc-300 transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#technical-section" className="hover:text-zinc-300 transition-colors">
                    Technical Architecture
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-300 font-semibold mb-3">
                Source & Project
              </div>
              <ul className="space-y-2 text-zinc-500">
                <li>
                  <a
                    href="https://github.com/h4r0015k/Mountain"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-300 transition-colors flex items-center gap-1"
                  >
                    GitHub Repository <ExternalLink className="w-3 h-3 text-zinc-600" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/h4r0015k/Mountain/blob/main/LICENSE"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-300 transition-colors flex items-center gap-1"
                  >
                    Open Source (ISC License) <ExternalLink className="w-3 h-3 text-zinc-600" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-600 font-mono text-[11px]">
            <div>Created by Nikhil Sahani • GitHub Pages Ready</div>
            <div>PBKDF2-HMAC-SHA256 • AES-256-GCM • BIP-39</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
