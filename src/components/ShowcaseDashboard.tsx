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
  Smartphone,
  RefreshCw,
  FolderLock,
  Menu,
  X,
  Puzzle,
  Download,
  Sparkles,
  MousePointerClick,
  ShieldCheck,
  FileSpreadsheet,
  Repeat,
  Globe,
  Check,
} from 'lucide-react';

const MATRIX_GLYPHS = '0123456789ABCDEF$#@%&*<>{}[]/?~!=+';

const ROTATING_ONE_LINERS = [
  'Only on your hardware.',
  'No servers. No telemetry.',
  'Sealed with AES-256-GCM.',
  'Offline by default.',
  'Never on someone else\'s cloud.',
  'Your keys. Your custody.',
  'Zero accounts to breach.',
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Companion Extension Interactive Demo State
  const [companionDemoTab, setCompanionDemoTab] = useState<'cycle' | 'capture' | 'generate'>('cycle');
  const [cycleIndex, setCycleIndex] = useState(0);
  const [capturedSaved, setCapturedSaved] = useState(false);
  const [demoPassword, setDemoPassword] = useState('x9#mK2$pQ8*vL1@zY4!b');
  const [hasCopiedGen, setHasCopiedGen] = useState(false);

  const DEMO_LOGINS = [
    { username: 'alex.developer@company.com', role: 'Production Dashboard', label: '1 of 3' },
    { username: 'alex.admin@company.com', role: 'Staging Administrator', label: '2 of 3' },
    { username: 'alex.audit@company.com', role: 'Security & Compliance', label: '3 of 3' },
  ];

  const handleNextCycle = () => {
    setCycleIndex((prev) => (prev + 1) % DEMO_LOGINS.length);
  };

  const handleGenerateNew = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 20; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDemoPassword(res);
    setHasCopiedGen(true);
    setTimeout(() => setHasCopiedGen(false), 1800);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % ROTATING_ONE_LINERS.length);
    }, 3800);

    return () => clearInterval(interval);
  }, []);

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
            <span className="font-semibold text-sm tracking-tight text-white">Mountain</span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-xs text-zinc-400 font-medium">
            <a
              href="#companion-extension"
              className="px-3 py-1.5 rounded-md hover:text-white hover:bg-zinc-900/60 transition-colors"
            >
              Extension
            </a>
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
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2">
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
              href="#companion-extension"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Companion Extension
            </a>
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
              {hasExistingVault && (
                <div className="flex items-center justify-end text-xs text-zinc-500 font-mono px-1">
                  <span className="text-[11px]">{vaultItemCount} items saved</span>
                </div>
              )}
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
            <span>ZERO-KNOWLEDGE • LOCAL-FIRST • OPEN SOURCE</span>
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
            An open-source, local-first password manager. Encrypted client-side, optionally backed up to your personal Google Drive, and completely free of company-hosted databases.
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

          {/* Product Pillars Dock */}
          <div className="mt-14 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 shadow-2xl backdrop-blur-md overflow-hidden animate-fade-in-delayed-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 divide-zinc-800/70">
              {/* Pillar 1: Privacy */}
              <div className="group p-4 sm:p-5 hover:bg-zinc-900/40 transition-colors duration-150 flex flex-col justify-between border-r border-zinc-800/70">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-150">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-medium">Privacy</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">100% Local</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-normal">Zero server storage</div>
                </div>
              </div>

              {/* Pillar 2: Accounts */}
              <div className="group p-4 sm:p-5 hover:bg-zinc-900/40 transition-colors duration-150 flex flex-col justify-between border-r border-zinc-800/70">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform duration-150">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-medium">Custody</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">Zero Signups</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-normal">No email or login needed</div>
                </div>
              </div>

              {/* Pillar 3: Recovery */}
              <div className="group p-4 sm:p-5 hover:bg-zinc-900/40 transition-colors duration-150 flex flex-col justify-between border-r border-zinc-800/70">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform duration-150">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-medium">Recovery</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">12-Word Key</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-normal">BIP-39 paper master key</div>
                </div>
              </div>

              {/* Pillar 4: Cloud Sync */}
              <div className="group p-4 sm:p-5 hover:bg-zinc-900/40 transition-colors duration-150 flex flex-col justify-between border-r border-zinc-800/70">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-105 transition-transform duration-150">
                    <HardDrive className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-medium">Backup</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">Personal Drive</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-normal">Encrypted Google Drive</div>
                </div>
              </div>

              {/* Pillar 5: Migration */}
              <div className="group p-4 sm:p-5 hover:bg-zinc-900/40 transition-colors duration-150 flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform duration-150">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-medium">Migration</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-white tracking-tight">1-Click Import</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-normal">Bitwarden, 1Pass, Chrome</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Companion Extension Showcase Section (Second Section) */}
      <section id="companion-extension" className="py-20 px-4 sm:px-6 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                <Puzzle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Browser Companion (MV3)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Seamless Autofill. Zero Stored Passwords.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                A stateless Manifest V3 companion that talks directly to your unlocked Mountain tab. Autofill on demand, cycle through multiple accounts, and capture new logins on submission—without persistent secrets ever touching extension storage.
              </p>
            </div>

            <div className="flex sm:flex-col items-start sm:items-end gap-1.5 text-xs font-mono text-zinc-500 shrink-0">
              <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                Manifest V3
              </span>
              <span className="text-[11px]">Direct Tab Handshake</span>
            </div>
          </div>

          {/* Interactive Simulation Window */}
          <div className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-2xl overflow-hidden backdrop-blur-xs">
            {/* Interactive Mode Selector Header */}
            <div className="px-4 py-3 bg-zinc-950/80 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/40 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 inline-block" />
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>https://dashboard.stripe.com/login</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    Host Isolated
                  </span>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCompanionDemoTab('cycle')}
                  className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    companionDemoTab === 'cycle'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <span>⌘⇧L Cycling</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompanionDemoTab('capture')}
                  className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    companionDemoTab === 'capture'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Auto-Capture</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompanionDemoTab('generate')}
                  className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    companionDemoTab === 'generate'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generator</span>
                </button>
              </div>
            </div>

            {/* Viewport Content */}
            <div className="p-6 sm:p-8 relative min-h-[320px] flex items-center justify-center bg-radial from-zinc-900/30 to-zinc-950/80">
              {/* TAB 1: Multi-Account Cycling */}
              {companionDemoTab === 'cycle' && (
                <div className="w-full max-w-lg space-y-4 animate-fade-in">
                  {/* Toast Simulation */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-emerald-500/30 shadow-lg text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-100 flex items-center gap-2">
                          <span>Autofilled credential</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                            {DEMO_LOGINS[cycleIndex].label}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {DEMO_LOGINS[cycleIndex].role}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextCycle}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center gap-1.5 transition active:scale-95 shrink-0"
                    >
                      <kbd className="px-1 py-0.2 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300">
                        ⌘⇧L
                      </kbd>
                      <span>Cycle Next</span>
                    </button>
                  </div>

                  {/* Form Mockup */}
                  <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-inner space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs">
                      <span className="font-medium text-zinc-300">Sign in to Stripe Dashboard</span>
                      <span className="font-mono text-[11px] text-zinc-500">dashboard.stripe.com</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-zinc-400">Email Address</label>
                      <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-100 flex items-center justify-between">
                        <span>{DEMO_LOGINS[cycleIndex].username}</span>
                        <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          auto-filled
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-zinc-400">Password</label>
                      <div className="p-2.5 rounded-lg bg-zinc-900 border border-emerald-500/50 text-xs font-mono text-emerald-400 flex items-center justify-between">
                        <span>••••••••••••••••••••</span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>account {DEMO_LOGINS[cycleIndex].label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[11px] font-mono text-zinc-500">
                    Host isolation active: credentials for <code className="text-zinc-400">billing.stripe.com</code> are isolated and will not match here.
                  </div>
                </div>
              )}

              {/* TAB 2: Form Auto-Capture */}
              {companionDemoTab === 'capture' && (
                <div className="w-full max-w-lg space-y-4 animate-fade-in">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700/80 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                          <MountainIcon className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span className="text-xs font-semibold text-white">Save Credential to Mountain?</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Zero-Knowledge Seal
                      </span>
                    </div>

                    {!capturedSaved ? (
                      <>
                        <div className="text-xs text-zinc-300 space-y-1.5 mb-4">
                          <p>
                            New credentials submitted on <strong className="text-white">dashboard.stripe.com</strong>:
                          </p>
                          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300 flex items-center justify-between">
                            <span>alex.developer@company.com</span>
                            <span className="text-zinc-500 text-[11px]">••••••••••••</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCapturedSaved(true)}
                            className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-xs text-center transition active:scale-98 shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-zinc-950" />
                            <span>Save to Local Vault</span>
                          </button>
                          <button
                            type="button"
                            className="py-2 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs text-center transition"
                          >
                            Never
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-center space-y-3">
                        <div className="inline-flex p-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          <Check className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-semibold text-white">
                          Encrypted & Saved to Mountain Vault
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Ciphertext sealed with authenticated AES-256-GCM before database write.
                        </div>
                        <button
                          type="button"
                          onClick={() => setCapturedSaved(false)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline font-mono"
                        >
                          Reset Demo
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[11px] font-mono text-zinc-500">
                    Captures inputs right at form submission before the page redirects or clears state.
                  </div>
                </div>
              )}

              {/* TAB 3: Instant Password Generator */}
              {companionDemoTab === 'generate' && (
                <div className="w-full max-w-lg space-y-4 animate-fade-in">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-white">Context Menu Password Generator</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500">20 Characters • CSPRNG</span>
                    </div>

                    <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-700/80 space-y-2">
                      <div className="text-[11px] text-zinc-400">Right-click on any password input:</div>
                      <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs">
                        <span className="text-amber-300 tracking-wider truncate select-all">{demoPassword}</span>
                        <span className="text-[10px] text-zinc-500 shrink-0 ml-2">High Entropy</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleGenerateNew}
                        className="flex-1 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-medium transition active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-300" />
                        <span>{hasCopiedGen ? 'Copied & Replaced!' : 'Generate Another Secret'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-center text-[11px] font-mono text-zinc-500">
                    Simultaneously injects the generated secret into the form and writes it to your clipboard.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feature Matrix Grid (Balanced 3-Column Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {/* Card 1 */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Repeat className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-white">Cmd+Shift+L Cycling</div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Multiple accounts for one site? Successive keypresses automatically cycle through every matching login with a live count indicator.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-white">Strict Subdomain Isolation</div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Authoritative host matching strictly isolates sibling subdomains (<code className="text-zinc-300 font-mono text-[11px]">billing.stripe.com</code> vs <code className="text-zinc-300 font-mono text-[11px]">dashboard.stripe.com</code>), eliminating cross-environment leakage.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-white">Zero Extension Storage</div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The extension stores zero passwords, seeds, or keys. Credentials stay inside your active tab and are delivered on demand over volatile memory.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-white">Native Event Dispatch</div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dispatches trusted DOM <code className="text-zinc-300 font-mono text-[11px]">input</code> and <code className="text-zinc-300 font-mono text-[11px]">change</code> events so modern reactive apps (React, Vue, Angular) immediately recognize filled values.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-white">Submit Auto-Capture</div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Detects registrations and password changes when forms submit, buffering fields and presenting a 1-click confirmation before page navigation.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-white">Context Menu Generator</div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Right-click any password box to generate a high-entropy 20-character secret sampled from hardware CSPRNG entropy, instantly staging both input and clipboard.
              </p>
            </div>
          </div>

          {/* Developer Install / Pair Guide */}
          <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Guide Header & Actions */}
            <div className="p-5 sm:p-6 border-b border-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
                    <Puzzle className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Load the Extension in 3 Steps
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    Chrome • Brave • Edge
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                  Mountain operates as an unpacked extension in Developer Mode. No Web Store tracking, zero remote code execution.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                <a
                  href="https://github.com/h4r0015k/Mountain/releases/download/v1.1.0/mountain-companion-extension-v1.1.0.zip"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition-all active:scale-[0.98] shadow-sm"
                  title="Download companion extension zip archive"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-900" />
                  <span>Download Extension .zip</span>
                </a>

                <a
                  href="https://github.com/h4r0015k/Mountain/tree/main/companion-extension"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-xs transition-colors"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </div>
            </div>

            {/* 3 Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80">
              {/* Step 1 */}
              <div className="p-4 sm:p-5 space-y-1.5 hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-mono font-semibold text-zinc-300 flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-semibold text-zinc-200">Unpack the Archive</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                  Download the <code className="text-zinc-300 font-mono text-[11px]">mountain-companion.zip</code> file and extract it to a persistent local folder.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 sm:p-5 space-y-1.5 hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-mono font-semibold text-zinc-300 flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-semibold text-zinc-200">Load in Browser</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                  Open <code className="text-zinc-300 font-mono bg-zinc-800/80 px-1 py-0.2 rounded text-[11px]">chrome://extensions</code>, turn on <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 sm:p-5 space-y-1.5 hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 text-[11px] font-mono font-semibold text-zinc-300 flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-semibold text-zinc-200">Pair with Mountain</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed pl-7">
                  In Mountain, navigate to <strong>Settings &rarr; Companion Extension</strong> and click <strong>Pair</strong> to establish a local cryptographic session.
                </p>
              </div>
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
                Instead of relying on a password that can be forgotten or guessed, Mountain generates a 12-word master recovery phrase (BIP-39). Written down offline, it serves as your permanent, self-custodied master key.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Smartphone className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Fast Daily Unlock</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                You don't need to type 12 words on every unlock. An optional daily PIN unlocks a local cryptographic envelope on your trusted device, while your recovery phrase remains the permanent master key.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <FolderLock className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Optional Google Drive or Local File Backups</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Export encrypted .json backup files directly to your machine, or optionally connect your personal Google Drive for multi-device sync. Vault snapshots are sealed with authenticated AES-256-GCM before ever leaving your browser sandbox.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <FileSpreadsheet className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Zero-Knowledge Vault Migration</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Switching from Bitwarden, 1Password, Chrome, Apple Passwords, or LastPass? Import CSV or JSON exports directly in your browser. All parsing, conflict resolution, and encryption execute client-side without ever touching external servers.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Globe className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Strict Subdomain & Host Isolation</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Security boundaries between subdomains are strictly enforced. Separate services and subdomains (like <code className="text-zinc-300 font-mono">billing.stripe.com</code> vs <code className="text-zinc-300 font-mono">dashboard.stripe.com</code>) never cross-contaminate credentials.
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
                How does key derivation defend against brute-force attacks?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your 12-word mnemonic master root key is derived using <strong>PBKDF2-HMAC-SHA256</strong> with <strong>600,000 iterations</strong> and a unique 16-byte cryptographic salt (exceeding OWASP password storage recommendations). Optional quick-unlock PINs use an isolated 100,000-iteration local envelope to decrypt the root mnemonic exclusively on your authorized device.
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

            {/* Q6: Host & Subdomain Isolation */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">06 // Host Isolation & Anti-Phishing</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  Authoritative Matching
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                How does Mountain prevent credential leakage across sibling subdomains?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Mountain enforces strict origin and host hierarchy in the companion bridge. Distinct subdomains (e.g. <code className="text-zinc-300 font-mono">billing.stripe.com</code> vs <code className="text-zinc-300 font-mono">dashboard.stripe.com</code>) are strictly isolated and never cross-pollinated or loosely resolved against titles. When a stored credential has an explicit domain, matching is authoritative, ensuring testing, staging, and internal portals cannot receive credentials intended for other services.
              </p>
            </div>
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
                  <a href="#companion-extension" className="hover:text-zinc-300 transition-colors">
                    Companion Extension
                  </a>
                </li>
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

          <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-500 font-mono text-[11px]">
            <div>Mountain v1.1.0 • Free & Open Source under ISC License</div>
            <div>PBKDF2-HMAC-SHA256 • AES-256-GCM • BIP-39</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
