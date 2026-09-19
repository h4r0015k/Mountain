import React, { useState } from 'react';
import { VaultItem, VaultSnapshot, VaultItemType, LoginFields } from '../models/vault.js';
import { encryptVaultRecord } from '../crypto/vault.js';
import { saveVaultSnapshot } from '../storage/indexeddb.js';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import {
  Lock,
  Plus,
  Search,
  Key,
  FileText,
  CreditCard,
  Terminal,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  Database
} from 'lucide-react';

export interface DecryptedRecord {
  item: VaultItem;
  secret: any;
}

interface Props {
  snapshot: VaultSnapshot;
  activeKey: CryptoKey;
  items: DecryptedRecord[];
  onLock: () => void;
  onRefreshItems: () => Promise<void>;
}

export const VaultDashboard: React.FC<Props> = ({
  snapshot,
  activeKey,
  items,
  onLock,
  onRefreshItems,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | VaultItemType>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [newItemType, setNewItemType] = useState<VaultItemType>('LOGIN');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemUsername, setNewItemUsername] = useState('');
  const [newItemPassword, setNewItemPassword] = useState('');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      setIsSaving(true);

      const secretPayload: LoginFields = {
        username: newItemUsername,
        password: newItemPassword,
        url: newItemUrl || undefined,
        notes: newItemNotes || undefined,
      };

      const encryptedData = await encryptVaultRecord(secretPayload, activeKey);

      const newItem: VaultItem = {
        id: crypto.randomUUID(),
        type: newItemType,
        title: newItemTitle.trim(),
        favorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encryptedData,
      };

      const updatedSnapshot: VaultSnapshot = {
        ...snapshot,
        updatedAt: Date.now(),
        items: [...snapshot.items, newItem],
      };

      await saveVaultSnapshot(updatedSnapshot);
      await onRefreshItems();

      // Reset
      setNewItemTitle('');
      setNewItemUsername('');
      setNewItemPassword('');
      setNewItemUrl('');
      setNewItemNotes('');
      setShowAddModal(false);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Permanently delete this record?')) return;

    try {
      const updatedSnapshot: VaultSnapshot = {
        ...snapshot,
        updatedAt: Date.now(),
        items: snapshot.items.filter((i) => i.id !== itemId),
      };

      await saveVaultSnapshot(updatedSnapshot);
      await onRefreshItems();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredItems = items.filter((record) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      record.item.title.toLowerCase().includes(query) ||
      (record.secret.username && record.secret.username.toLowerCase().includes(query)) ||
      (record.secret.url && record.secret.url.toLowerCase().includes(query));

    const matchesType = selectedType === 'ALL' || record.item.type === selectedType;

    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: VaultItemType) => {
    switch (type) {
      case 'LOGIN': return <Key className="w-3.5 h-3.5 text-zinc-300" />;
      case 'SECURE_NOTE': return <FileText className="w-3.5 h-3.5 text-zinc-300" />;
      case 'CARD': return <CreditCard className="w-3.5 h-3.5 text-zinc-300" />;
      case 'API_KEY': return <Terminal className="w-3.5 h-3.5 text-zinc-300" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#08090c] text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-neutral-800/80 bg-[#0c0d12]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-black flex items-center justify-center font-black text-xs">
              ▲
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight text-white">Mountain</span>
              <div className="hidden sm:flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-neutral-800 text-[10px] text-zinc-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>AES-GCM Local</span>
              </div>
            </div>
          </div>

          {/* Sync status indicator */}
          <div className="flex items-center space-x-1.5 py-1 px-2.5 rounded-md bg-zinc-900/90 border border-neutral-800 text-[11px] text-zinc-400 font-mono">
            <Database className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="hidden sm:inline">IndexedDB Local</span>
            <span className="sm:hidden">Local</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGenerator(true)}
              className="hidden sm:flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium border border-neutral-800 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Generator</span>
            </button>
            <button
              onClick={onLock}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium border border-neutral-800 transition"
              title="Lock Vault"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-28 sm:pb-12">
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records by title, username, or URL..."
              className="w-full pl-9 pr-4 py-2 bg-[#0e1015] border border-neutral-800/80 focus:border-zinc-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 outline-none transition"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2">
            {/* Filter pills */}
            <div className="flex bg-[#0e1015] border border-neutral-800/80 rounded-xl p-1 text-[11px] overflow-x-auto">
              {(['ALL', 'LOGIN', 'SECURE_NOTE', 'CARD', 'API_KEY'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${
                    selectedType === type
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {type === 'ALL' ? 'All' : type.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="hidden sm:flex items-center space-x-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-white text-black text-xs font-semibold rounded-xl transition shadow-md tactile-btn whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Record</span>
            </button>
          </div>
        </div>

        {/* Item Cards / Dense List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 px-4 bg-[#0d0e13]/60 border border-dashed border-neutral-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-900 border border-neutral-800 flex items-center justify-center text-zinc-400">
              <Key className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-200">No credentials found</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                {searchQuery ? 'No records match your search filter.' : 'Your vault is empty. Click New Record to store your first login.'}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-1.5 py-2 px-3.5 bg-zinc-100 hover:bg-white text-black text-xs font-semibold rounded-xl transition shadow-md tactile-btn mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.map(({ item, secret }) => {
              const isRevealed = !!revealedPasswords[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-[#0e1016] border border-neutral-800/80 hover:border-neutral-700 rounded-xl p-4 space-y-3 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-2 bg-zinc-900 border border-neutral-800 rounded-lg flex-shrink-0">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-white text-sm truncate group-hover:text-zinc-100 transition">
                          {item.title}
                        </h4>
                        {secret.url && (
                          <a
                            href={secret.url.startsWith('http') ? secret.url : `https://${secret.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center space-x-1 truncate"
                          >
                            <span className="truncate">{secret.url.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-zinc-600 hover:text-rose-400 rounded-md transition opacity-0 group-hover:opacity-100"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Secret fields */}
                  <div className="space-y-1.5 text-xs font-mono">
                    {secret.username && (
                      <div className="flex items-center justify-between p-2 bg-[#090a0d] rounded-lg border border-neutral-800/60">
                        <span className="text-zinc-400 truncate pr-2">{secret.username}</span>
                        <button
                          onClick={() => copyToClipboard(secret.username, `user-${item.id}`)}
                          className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
                          title="Copy username"
                        >
                          {copiedId === `user-${item.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {secret.password && (
                      <div className="flex items-center justify-between p-2 bg-[#090a0d] rounded-lg border border-neutral-800/60">
                        <span className="text-zinc-300 truncate pr-2">
                          {isRevealed ? secret.password : '••••••••••••••••'}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => togglePasswordVisibility(item.id)}
                            className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
                            title={isRevealed ? 'Hide' : 'Reveal'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(secret.password, `pass-${item.id}`)}
                            className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
                            title="Copy password"
                          >
                            {copiedId === `pass-${item.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ADD ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg bg-[#0f1015] border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">New Encrypted Record</h3>
              <div className="w-8 h-1 bg-zinc-700 rounded-full mx-auto sm:hidden" />
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Title</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. GitHub, ProtonMail, AWS"
                  className="w-full px-3 py-2 bg-[#0a0b0e] border border-neutral-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Username</label>
                  <input
                    type="text"
                    value={newItemUsername}
                    onChange={(e) => setNewItemUsername(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 bg-[#0a0b0e] border border-neutral-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">URL</label>
                  <input
                    type="text"
                    value={newItemUrl}
                    onChange={(e) => setNewItemUrl(e.target.value)}
                    placeholder="https://github.com"
                    className="w-full px-3 py-2 bg-[#0a0b0e] border border-neutral-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(true)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newItemPassword}
                  onChange={(e) => setNewItemPassword(e.target.value)}
                  placeholder="Enter or generate..."
                  className="w-full px-3 py-2 bg-[#0a0b0e] border border-neutral-800 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  placeholder="Recovery keys, security questions..."
                  className="w-full px-3 py-2 bg-[#0a0b0e] border border-neutral-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 resize-none font-sans"
                />
              </div>

              <div className="flex space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2.5 px-4 bg-[#14161d] hover:bg-[#1a1c24] text-zinc-300 font-medium rounded-xl text-xs transition border border-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-black font-semibold rounded-xl text-xs transition shadow-md tactile-btn disabled:opacity-40"
                >
                  {isSaving ? 'Encrypting Record...' : 'Save & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSPRNG Generator Modal */}
      <PasswordGeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onSelectPassword={(pwd) => {
          setNewItemPassword(pwd);
          setShowGenerator(false);
        }}
      />

      {/* Sleek Mobile Bottom Dock */}
      <nav className="sm:hidden fixed bottom-3 left-4 right-4 z-40 bg-[#12141a]/95 backdrop-blur-xl border border-neutral-800/90 rounded-2xl px-6 py-2 flex items-center justify-between shadow-2xl">
        <button
          onClick={() => {
            setSelectedType('ALL');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center space-y-0.5 text-zinc-400 hover:text-white py-1"
        >
          <Key className="w-4 h-4" />
          <span className="text-[10px] font-medium">Vault</span>
        </button>

        {/* Center Primary Action Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center -mt-5 w-11 h-11 bg-zinc-100 text-black rounded-full shadow-lg shadow-black/60 active:scale-95 transition tactile-btn"
          title="Add New Record"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={() => setShowGenerator(true)}
          className="flex flex-col items-center space-y-0.5 text-zinc-400 hover:text-white py-1"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-medium">Generator</span>
        </button>

        <button
          onClick={onLock}
          className="flex flex-col items-center space-y-0.5 text-zinc-400 hover:text-rose-400 py-1"
        >
          <Lock className="w-4 h-4" />
          <span className="text-[10px] font-medium">Lock</span>
        </button>
      </nav>
    </div>
  );
};
