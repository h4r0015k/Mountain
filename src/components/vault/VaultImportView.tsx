import React, { useState, useRef, useMemo } from 'react';
import { VaultSnapshot, DecryptedRecord } from '../../models/vault.js';
import { parseImportFile } from '../../import/index.js';
import {
  executeVaultImport,
  findMatchingVaultItemIndex,
} from '../../import/importer.js';
import {
  ImportConflictStrategy,
  ImportExecutionResult,
  ImportParseResult,
} from '../../import/types.js';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Key,
  CreditCard,
  StickyNote,
  Clock,
  Search,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Info,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface Props {
  snapshot: VaultSnapshot;
  activeKey: CryptoKey;
  existingItems: DecryptedRecord[];
  onBack: () => void;
  onImportComplete: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

type GuideSource = 'chrome' | 'bitwarden' | 'apple' | 'onepassword' | 'lastpass' | 'generic';

const EXPORT_GUIDES: Record<
  GuideSource,
  { label: string; steps: string[]; tip?: string }
> = {
  chrome: {
    label: 'Chrome / Brave / Edge',
    steps: [
      'Open Settings → Autofill and passwords → Password Manager',
      'Click Settings in the left sidebar, then click Export passwords',
      'Save the resulting .csv file to your computer',
    ],
  },
  bitwarden: {
    label: 'Bitwarden',
    steps: [
      'Log into your Bitwarden Web Vault',
      'Click Tools in the top navigation, then select Export Vault',
      'Choose either .json or .csv as the file format and download',
    ],
    tip: 'JSON exports preserve your credit cards and custom fields.',
  },
  apple: {
    label: 'Apple Passwords',
    steps: [
      'On Mac: Open System Settings → Passwords',
      'Click the "…" menu button and choose Export All Passwords…',
      'Confirm with your Mac password or Touch ID to save the .csv',
    ],
    tip: 'Mountain automatically imports and generates your 2FA TOTP codes.',
  },
  onepassword: {
    label: '1Password',
    steps: [
      'Open the 1Password desktop application',
      'Select File → Export in the menu bar',
      'Choose CSV format and select the items to export',
    ],
  },
  lastpass: {
    label: 'LastPass',
    steps: [
      'Log into your LastPass vault in your browser',
      'Click Advanced Options in the left sidebar menu',
      'Click Export and enter your master password to save the .csv',
    ],
  },
  generic: {
    label: 'Custom CSV',
    steps: [
      'Ensure your file has headers like site/title, username/email, and password',
      'Optional columns: url, notes, and 2fa/totp secret',
      'Comma, semicolon, and tab delimiters are all supported',
    ],
  },
};

export const VaultImportView: React.FC<Props> = ({
  snapshot,
  activeKey,
  existingItems,
  onBack,
  onImportComplete,
  onShowToast,
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'success'>('upload');
  const [activeGuide, setActiveGuide] = useState<GuideSource>('chrome');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ImportConflictStrategy>('skip_duplicates');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportExecutionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    try {
      setError(null);
      setFileName(file.name);
      const text = await file.text();

      const parsed = parseImportFile(text, file.name);
      if (parsed.items.length === 0) {
        setError(`No valid credentials or notes found in "${file.name}".`);
        return;
      }

      setParseResult(parsed);
      setSelectedIndices(new Set(parsed.items.map((_, i) => i)));
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Could not parse the selected file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const toggleItemSelection = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const toggleSelectAll = () => {
    if (!parseResult) return;
    if (selectedIndices.size === parseResult.items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(parseResult.items.map((_, i) => i)));
    }
  };

  const togglePasswordVisibility = (idx: number) => {
    setRevealedPasswords((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Duplicate lookup
  const duplicateMatchMap = useMemo(() => {
    if (!parseResult) return new Map<number, { matchIndex: number; matchTitle: string }>();
    const map = new Map<number, { matchIndex: number; matchTitle: string }>();

    parseResult.items.forEach((item, idx) => {
      const matchIdx = findMatchingVaultItemIndex(item, existingItems);
      if (matchIdx >= 0) {
        map.set(idx, {
          matchIndex: matchIdx,
          matchTitle: existingItems[matchIdx].item.title,
        });
      }
    });

    return map;
  }, [parseResult, existingItems]);

  // Filtered items based on search query
  const filteredIndexedItems = useMemo(() => {
    if (!parseResult) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return parseResult.items.map((item, idx) => ({ item, originalIndex: idx }));
    }

    return parseResult.items
      .map((item, idx) => ({ item, originalIndex: idx }))
      .filter(({ item }) => {
        if (item.title.toLowerCase().includes(query)) return true;
        if (item.type === 'LOGIN') {
          const sec = item.secret as any;
          if (sec.username?.toLowerCase().includes(query)) return true;
          if (sec.url?.toLowerCase().includes(query)) return true;
        }
        if (item.type === 'SECURE_NOTE') {
          const sec = item.secret as any;
          if (sec.content?.toLowerCase().includes(query)) return true;
        }
        return false;
      });
  }, [parseResult, searchQuery]);

  const selectedCount = selectedIndices.size;
  const duplicateSelectedCount = useMemo(() => {
    let count = 0;
    selectedIndices.forEach((idx) => {
      if (duplicateMatchMap.has(idx)) count++;
    });
    return count;
  }, [selectedIndices, duplicateMatchMap]);

  const handleExecuteImport = async () => {
    if (!parseResult || selectedCount === 0) return;

    try {
      setIsProcessing(true);
      setStep('processing');
      setError(null);

      const { result: execResult } = await executeVaultImport({
        items: parseResult.items,
        activeKey,
        snapshot,
        existingItems,
        options: {
          conflictStrategy,
          selectedIndices: Array.from(selectedIndices),
        },
      });

      setResult(execResult);
      setStep('success');
      await onImportComplete();
      onShowToast(
        `Imported ${execResult.importedCount} items${
          execResult.skippedCount > 0 ? ` (${execResult.skippedCount} skipped)` : ''
        }`
      );
    } catch (err: any) {
      setError(err.message || 'Import failed.');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetToUpload = () => {
    setStep('upload');
    setFileName('');
    setParseResult(null);
    setSelectedIndices(new Set());
    setSearchQuery('');
    setRevealedPasswords({});
    setError(null);
    setResult(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden font-sans">
      {/* Scrollable Canvas */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="max-w-3xl mx-auto mt-6 px-4">
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start space-x-2.5 shadow-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD & EXPORT INSTRUCTIONS */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-sm">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                Import into Mountain
              </h1>
              <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                Migrate passwords, cards, and secure notes from your browser or another password manager.
              </p>
            </div>

            {/* Tactile Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-10 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3.5 group ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-950/20'
                  : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900/70 shadow-xs'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.tsv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-11 h-11 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-zinc-600 transition">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-medium text-zinc-200">
                  Drag and drop your file here, or{' '}
                  <span className="text-emerald-400 font-semibold underline underline-offset-4">
                    browse files
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-mono pt-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400">
                    .csv
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400">
                    .json
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Export Guides */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center sm:text-left">
                Export Instructions
              </div>

              {/* Source Selector Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.keys(EXPORT_GUIDES) as GuideSource[]).map((src) => {
                  const isSelected = activeGuide === src;
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActiveGuide(src)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'bg-zinc-800 text-white border border-zinc-700 shadow-xs'
                          : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-zinc-800/60'
                      }`}
                    >
                      {EXPORT_GUIDES[src].label}
                    </button>
                  );
                })}
              </div>

              {/* Active Guide Content */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-2.5">
                <div className="space-y-1.5">
                  {EXPORT_GUIDES[activeGuide].steps.map((st, i) => (
                    <div key={i} className="flex items-start space-x-2.5 text-xs text-zinc-300">
                      <span className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{st}</span>
                    </div>
                  ))}
                </div>

                {EXPORT_GUIDES[activeGuide].tip && (
                  <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{EXPORT_GUIDES[activeGuide].tip}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy reassurance */}
            <div className="p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-xl flex items-center justify-center space-x-2 text-xs text-zinc-400 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Processed locally in your browser. Nothing is ever sent to a server.</span>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & SELECTION WORKSPACE */}
        {step === 'preview' && parseResult && (
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
            {/* Summary Bar */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-zinc-100">{fileName}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      {parseResult.formatLabel}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 flex items-center gap-3 flex-wrap">
                    <span>{parseResult.totalCount} items found</span>
                    {parseResult.loginCount > 0 && <span>• {parseResult.loginCount} logins</span>}
                    {parseResult.cardCount > 0 && <span>• {parseResult.cardCount} cards</span>}
                    {parseResult.noteCount > 0 && <span>• {parseResult.noteCount} notes</span>}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetToUpload}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-200 py-1.5 px-3 rounded-lg border border-zinc-700/60 hover:border-zinc-500 transition shrink-0"
              >
                Choose another file
              </button>
            </div>

            {/* Warnings if any */}
            {parseResult.warnings.length > 0 && (
              <div className="p-3.5 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Notice</span>
                </div>
                {parseResult.warnings.map((w, idx) => (
                  <p key={idx} className="text-amber-200/80 leading-relaxed text-[11px]">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* Duplicate policy & Search toolbar */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <div className="text-xs font-semibold text-zinc-300">
                  If an item already exists in your vault:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
                  {[
                    {
                      id: 'skip_duplicates' as ImportConflictStrategy,
                      label: 'Skip duplicates',
                      sub: 'Keep your current vault item',
                    },
                    {
                      id: 'overwrite_duplicates' as ImportConflictStrategy,
                      label: 'Overwrite',
                      sub: 'Update existing with imported data',
                    },
                    {
                      id: 'import_all' as ImportConflictStrategy,
                      label: 'Import all',
                      sub: 'Keep both as separate items',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConflictStrategy(opt.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        conflictStrategy === opt.id
                          ? 'border-emerald-500 bg-emerald-950/20 text-zinc-100 shadow-xs'
                          : 'border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{opt.label}</span>
                        {conflictStrategy === opt.id && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter and Bulk Selection */}
              <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center space-x-2 text-xs text-zinc-300 hover:text-white py-1 px-2 rounded-md hover:bg-zinc-800 transition"
                  >
                    {selectedCount === parseResult.items.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500" />
                    )}
                    <span>
                      {selectedCount === parseResult.items.length
                        ? 'Deselect all'
                        : 'Select all'}
                    </span>
                  </button>
                  <span className="text-xs text-zinc-400 font-mono">
                    {selectedCount} of {parseResult.items.length} selected
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search imported items..."
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            </div>

            {/* Readable Data Table */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-[11px] font-medium">
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                      <th className="py-2.5 px-3">Item / Service</th>
                      <th className="py-2.5 px-3">Username / Account</th>
                      <th className="py-2.5 px-3">Password</th>
                      <th className="py-2.5 px-3">Details</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {filteredIndexedItems.map(({ item, originalIndex }) => {
                      const isSelected = selectedIndices.has(originalIndex);
                      const isRevealed = revealedPasswords[originalIndex];
                      const duplicateInfo = duplicateMatchMap.get(originalIndex);
                      const sec = item.secret as any;

                      return (
                        <tr
                          key={originalIndex}
                          onClick={() => toggleItemSelection(originalIndex)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-zinc-900/50 hover:bg-zinc-800/40 text-zinc-200'
                              : 'bg-zinc-950/40 hover:bg-zinc-900/30 text-zinc-500'
                          }`}
                        >
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(originalIndex);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(originalIndex)}
                              className="accent-emerald-500 rounded cursor-pointer"
                            />
                          </td>

                          {/* Title & Type */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="p-1 rounded bg-zinc-800 text-zinc-400 shrink-0">
                                {item.type === 'LOGIN' && <Key className="w-3.5 h-3.5 text-blue-400" />}
                                {item.type === 'CARD' && <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
                                {item.type === 'SECURE_NOTE' && <StickyNote className="w-3.5 h-3.5 text-emerald-400" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-zinc-200 truncate">{item.title}</div>
                                {sec?.url && (
                                  <div className="text-[10px] text-zinc-500 truncate font-mono">
                                    {sec.url}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Username */}
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300">
                            {item.type === 'LOGIN' && (sec?.username || <span className="text-zinc-600">—</span>)}
                            {item.type === 'CARD' && (sec?.cardholderName || <span className="text-zinc-600">—</span>)}
                            {item.type === 'SECURE_NOTE' && <span className="text-zinc-500 font-sans">Secure Note</span>}
                          </td>

                          {/* Password */}
                          <td className="py-2.5 px-3">
                            {item.type === 'LOGIN' && sec?.password ? (
                              <div
                                className="flex items-center space-x-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="font-mono text-[11px] text-zinc-300">
                                  {isRevealed ? sec.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(originalIndex)}
                                  className="p-1 text-zinc-500 hover:text-zinc-300 transition rounded"
                                  title={isRevealed ? 'Hide password' : 'Show password'}
                                >
                                  {isRevealed ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>

                          {/* Badges / Extras */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              {sec?.totpSecret && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  2FA TOTP
                                </span>
                              )}
                              {sec?.notes && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                                  Note
                                </span>
                              )}
                              {item.type === 'CARD' && sec?.cardNumber && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                  •••• {sec.cardNumber.slice(-4)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            {duplicateInfo ? (
                              <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Existing ({duplicateInfo.matchTitle})
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                New
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredIndexedItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-zinc-500">
                          No items match your search &quot;{searchQuery}&quot;
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="sticky bottom-4 z-10 p-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-300">
                <span className="font-semibold text-white">{selectedCount}</span> items selected to import.
                {duplicateSelectedCount > 0 && conflictStrategy === 'skip_duplicates' && (
                  <span className="text-amber-400/90 ml-1.5">
                    ({duplicateSelectedCount} existing will be skipped)
                  </span>
                )}
                {duplicateSelectedCount > 0 && conflictStrategy === 'overwrite_duplicates' && (
                  <span className="text-amber-400/90 ml-1.5">
                    ({duplicateSelectedCount} existing will be updated)
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0 || isProcessing}
                  onClick={handleExecuteImport}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 text-xs font-semibold rounded-xl transition shadow-md focus-ring"
                >
                  Import {selectedCount} items
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSING */}
        {step === 'processing' && (
          <div className="max-w-md mx-auto py-20 text-center space-y-4 px-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 animate-spin">
              <Loader2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-100">
                Encrypting and saving credentials...
              </h3>
              <p className="text-xs text-zinc-400">
                Deriving cryptographic vectors and saving to local storage.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && result && (
          <div className="max-w-md mx-auto py-16 text-center space-y-6 px-4 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/50 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Check className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-100">Import Complete</h2>
              <p className="text-xs text-zinc-400">
                Your credentials are now securely stored in your local encrypted vault.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {result.importedCount}
                </div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                  Added
                </div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-amber-400 font-mono">
                  {result.updatedCount}
                </div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                  Updated
                </div>
              </div>

              <div className="text-center">
                <div className="text-lg font-bold text-zinc-400 font-mono">
                  {result.skippedCount}
                </div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                  Skipped
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetToUpload}
                className="w-full sm:w-auto px-4 py-2.5 border border-zinc-700/80 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition"
              >
                Import another file
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-xs transition shadow-sm"
              >
                Go to Vault
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
