import React, { useState, useEffect } from 'react';
import { VaultSnapshot } from './models/vault.js';
import { listVaultSnapshots, deleteVaultSnapshot, loadVaultSnapshot } from './storage/indexeddb.js';
import { decryptVaultRecord } from './crypto/vault.js';
import { VaultOnboarding } from './components/VaultOnboarding';
import { VaultUnlock } from './components/VaultUnlock';
import { VaultDashboard, DecryptedRecord } from './components/VaultDashboard';
import { ShowcaseDashboard, MountainIcon } from './components/ShowcaseDashboard';

type VaultState = 'loading' | 'needs_setup' | 'locked' | 'unlocked';
type ViewMode = 'showcase' | 'vault';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('showcase');
  const [vaultState, setVaultState] = useState<VaultState>('loading');
  const [currentSnapshot, setCurrentSnapshot] = useState<VaultSnapshot | null>(null);
  const [activeKey, setActiveKey] = useState<CryptoKey | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<DecryptedRecord[]>([]);
  const [onboardingInitialMode, setOnboardingInitialMode] = useState<'choice' | 'restore'>('choice');

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

      {vaultState === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-100">
          <div className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl animate-pulse">
            <MountainIcon className="w-10 h-10 text-zinc-200" />
          </div>
          <div className="text-sm font-medium text-slate-400">Opening Local Encrypted Storage...</div>
        </div>
      )}

      {vaultState === 'needs_setup' && (
        <div className="flex-1">
          <VaultOnboarding
            initialMode={onboardingInitialMode}
            onVaultReady={handleVaultReady}
            onCancel={currentSnapshot ? () => setVaultState('locked') : undefined}
          />
        </div>
      )}

      {vaultState === 'locked' && currentSnapshot && (
        <div className="flex-1">
          <VaultUnlock
            snapshot={currentSnapshot}
            onUnlocked={handleUnlocked}
            onResetVault={handleResetVault}
            onRestoreBackup={() => {
              setOnboardingInitialMode('restore');
              setVaultState('needs_setup');
            }}
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
