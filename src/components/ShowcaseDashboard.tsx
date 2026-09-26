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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Local-First • Zero-Knowledge • Open Source</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12] mb-5">
            The password manager that <span className="text-zinc-400">never leaves your hardware.</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed mb-8">
            Mountain encrypts everything client-side using authenticated AES-256-GCM and a 12-word BIP-39 recovery key. No user accounts to breach, no telemetry, and zero remote database reliance.
          </p>

          {/* Action Button Group */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              onClick={onLaunchVault}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-xs sm:text-sm transition-all active:scale-[0.98] shadow-sm"
            >
              <Lock className="w-4 h-4 text-zinc-950" />
              <span>{hasExistingVault ? 'Unlock Password Vault' : 'Launch Password Vault'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-700" />
            </button>

            <a
              href="#companion-extension"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 font-medium text-xs sm:text-sm transition-colors"
            >
              <span>Browser Extension</span>
            </a>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-200 font-medium text-xs sm:text-sm transition-colors"
            >
              <span>Architecture</span>
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

          <div className="text-[11px] font-mono text-zinc-500">
            Free & Open Source under ISC License • Zero analytics • Offline-first
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
              Architecture & Custody
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Built for custody, not subscription lock-in
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-2xl">
              Most password managers require trusting a centralized backend with your encrypted vault blobs. Mountain operates as a local utility, keeping all cryptographic operations entirely on your device.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <HardDrive className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Zero Remote Databases</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Data is persisted solely to your browser's origin-isolated IndexedDB storage. There are no corporate accounts or cloud databases to target or breach.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <KeyRound className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">BIP-39 Master Recovery Key</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your vault root is generated from 128 bits of CSPRNG hardware entropy mapped to a 12-word recovery phrase. Kept offline, it guarantees permanent self-custody.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Smartphone className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Local Envelope PIN Unlock</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Typing 12 words on every unlock isn't practical. An optional PIN wraps your root mnemonic in a local 100,000-iteration PBKDF2 envelope on authorized devices.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <FolderLock className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Encrypted Cloud Sync & Export</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Export encrypted .json backup snapshots directly to disk, or sync to your personal Google Drive appDataFolder via OAuth 2.0 PKCE with client-side AEAD encryption.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <FileSpreadsheet className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Client-Side Vault Migration</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Switching from Bitwarden, 1Password, Chrome, Apple Passwords, or LastPass? Import CSV or JSON exports directly in your browser without network transit.
              </p>
            </div>

            <div className="group p-5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                <Globe className="w-4 h-4 text-zinc-200" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Strict Subdomain Isolation</h3>
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
                <span>Security Specifications</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Cryptographic Architecture & Primitives
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xl">
                Formal implementation specifications of Mountain's client-side zero-knowledge security and persistence model.
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

          {/* Cryptographic Specifications Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Spec 1: Encryption */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white">Payload Encryption</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    AES-256-GCM
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Native Web Cryptography API implementation conforming to NIST SP 800-38D. Every saved credential receives a unique 12-byte initialization vector (IV) generated via <code className="text-zinc-300 font-mono text-[11px]">crypto.getRandomValues()</code>. 128-bit authentication tags provide tamper-evident AEAD integrity, failing closed on any ciphertext modification.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Key length: 256 bits</span>
                <span>Nonce: 96 bits unique IV</span>
              </div>
            </div>

            {/* Spec 2: KDF */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white">Key Derivation</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    PBKDF2-HMAC-SHA256
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Master root keys are derived from the mnemonic seed using PBKDF2-HMAC-SHA256 with 600,000 iterations and a 16-byte CSPRNG salt, exceeding OWASP password storage recommendations. Optional quick-unlock PINs use an isolated 100,000-iteration envelope to decrypt the root key exclusively on authorized local hardware.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Master: 600,000 rounds</span>
                <span>PIN: 100,000 rounds</span>
              </div>
            </div>

            {/* Spec 3: Mnemonic */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white">Master Identity & Seed</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    BIP-39 Standard
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Vault identity derives from 128 bits of CSPRNG hardware entropy mapped to 12 words from the standardized 2,048-word English dictionary, verified by a SHA-256 checksum. Master seeds expand deterministically into 512-bit root keys without requiring third-party verification servers.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Entropy: 128-bit CSPRNG</span>
                <span>Checksum: SHA-256</span>
              </div>
            </div>

            {/* Spec 4: Storage */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white">Client Persistence</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    IndexedDB Sandbox
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  All records are stored asynchronously in the browser's origin-isolated IndexedDB database (<code className="text-zinc-300 font-mono text-[11px]">mountain_vault_db</code>). Snapshots are persisted strictly in encrypted AEAD format. The application contains zero analytics trackers, zero external fonts, and sends zero telemetry requests.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Origin: Same-origin isolated</span>
                <span>Telemetry: Zero network calls</span>
              </div>
            </div>

            {/* Spec 5: Sync */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white">Private Cloud Sync</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    OAuth 2.0 PKCE
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Direct communication with Google OAuth 2.0 PKCE endpoints without intermediary servers. Encrypted snapshots are written to the sandboxed Google Drive <code className="text-zinc-300 font-mono text-[11px]">appDataFolder</code>. Because encryption occurs client-side prior to transit, Google and network observers see only opaque ciphertext.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Scope: drive.appdata</span>
                <span>Storage: Client-sealed</span>
              </div>
            </div>

            {/* Spec 6: Host Isolation */}
            <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-semibold text-white">Subdomain Isolation</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 shrink-0">
                    Authoritative Matching
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The companion bridge enforces strict host hierarchy. Separate subdomains (such as <code className="text-zinc-300 font-mono text-[11px]">billing.stripe.com</code> vs <code className="text-zinc-300 font-mono text-[11px]">dashboard.stripe.com</code>) are strictly isolated and never cross-pollinate credentials. When a record defines a domain, matching is authoritative to prevent credential leakage.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800/60 font-mono text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Boundary: Full hostname match</span>
                <span>Cross-origin: Disallowed</span>
              </div>
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
