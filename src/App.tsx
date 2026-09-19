import React, { useState, useEffect } from 'react';
import { VaultSnapshot } from './models/vault.js';
import { listVaultSnapshots, deleteVaultSnapshot, loadVaultSnapshot } from './storage/indexeddb.js';
import { decryptVaultRecord } from './crypto/vault.js';
import { VaultOnboarding } from './components/VaultOnboarding';
import { VaultUnlock } from './components/VaultUnlock';
import { VaultDashboard, DecryptedRecord } from './components/VaultDashboard';
import { ShowcaseDashboard } from './components/ShowcaseDashboard';
import { Shield, ArrowLeft } from 'lucide-react';

type VaultState = 'loading' | 'needs_setup' | 'locked' | 'unlocked';
type ViewMode = 'showcase' | 'vault';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('showcase');
  const [vaultState, setVaultState] = useState<VaultState>('loading');
  const [currentSnapshot, setCurrentSnapshot] = useState<VaultSnapshot | null>(null);
  const [activeKey, setActiveKey] = useState<CryptoKey | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<DecryptedRecord[]>([]);

  // Check IndexedDB on mount
  useEffect(() => {
    const init = async () => {
      try {
        const snapshots = await listVaultSnapshots();
        if (snapshots.length > 0) {
          // Vault exists! Lock it
          setCurrentSnapshot(snapshots[0]);
          setVaultState('locked');
        } else {
          setVaultState('needs_setup');
        }
      } catch (err) {
        console.error('Failed to access IndexedDB:', err);
        setVaultState('needs_setup');
      }
    };

    init();
  }, []);

  const handleVaultReady = async (key: CryptoKey, snapshot: VaultSnapshot) => {
    setActiveKey(key);
    setCurrentSnapshot(snapshot);
    await decryptAllItems(snapshot, key);
    setVaultState('unlocked');
  };

  const handleUnlocked = async (key: CryptoKey) => {
    if (!currentSnapshot) return;
    setActiveKey(key);
    await decryptAllItems(currentSnapshot, key);
    setVaultState('unlocked');
  };

  const decryptAllItems = async (snapshot: VaultSnapshot, key: CryptoKey) => {
    const results: DecryptedRecord[] = [];
    for (const item of snapshot.items) {
      try {
        const secret = await decryptVaultRecord(item.encryptedData, key);
        results.push({ item, secret });
      } catch (err) {
        console.warn(`Failed to decrypt item ${item.id}:`, err);
      }
    }
    setDecryptedItems(results);
  };

  const handleRefreshItems = async () => {
    if (!currentSnapshot || !activeKey) return;
    const reloaded = await loadVaultSnapshot(currentSnapshot.vaultId);
    if (reloaded) {
      setCurrentSnapshot(reloaded);
      await decryptAllItems(reloaded, activeKey);
    }
  };

  const handleLock = () => {
    setActiveKey(null);
    setDecryptedItems([]);
    setVaultState('locked');
  };

  const handleResetVault = async () => {
    if (currentSnapshot) {
      await deleteVaultSnapshot(currentSnapshot.vaultId);
    }
    setActiveKey(null);
    setCurrentSnapshot(null);
    setDecryptedItems([]);
    setVaultState('needs_setup');
  };

  // If viewing showcase / landing dashboard
  if (viewMode === 'showcase') {
    return (
      <ShowcaseDashboard
        hasExistingVault={vaultState === 'locked' || vaultState === 'unlocked'}
        vaultItemCount={currentSnapshot?.items.length || 0}
        onLaunchVault={() => setViewMode('vault')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Top Banner for returning to showcase */}
      <div className="bg-[#09090b] border-b border-zinc-800 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-zinc-400">
        <button
          onClick={() => setViewMode('showcase')}
          className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
          <span>← Overview & Standalone Tools</span>
        </button>
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>VAULT: {vaultState.toUpperCase()}</span>
        </div>
      </div>

      {vaultState === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-100">
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-3xl animate-pulse">
            <Shield className="w-12 h-12" />
          </div>
          <div className="text-sm font-medium text-slate-400">Opening Local Encrypted Storage...</div>
        </div>
      )}

      {vaultState === 'needs_setup' && (
        <div className="flex-1">
          <VaultOnboarding onVaultReady={handleVaultReady} />
        </div>
      )}

      {vaultState === 'locked' && currentSnapshot && (
        <div className="flex-1">
          <VaultUnlock
            snapshot={currentSnapshot}
            onUnlocked={handleUnlocked}
            onResetVault={handleResetVault}
          />
        </div>
      )}

      {vaultState === 'unlocked' && currentSnapshot && activeKey && (
        <div className="flex-1">
          <VaultDashboard
            snapshot={currentSnapshot}
            activeKey={activeKey}
            items={decryptedItems}
            onLock={handleLock}
            onRefreshItems={handleRefreshItems}
          />
        </div>
      )}
    </div>
  );
};

export default App;
