import React, { useState, useEffect, useCallback } from 'react';
import { VaultSnapshot, VaultItem, LoginFields } from './models/vault.js';
import { listVaultSnapshots, deleteVaultSnapshot, loadVaultSnapshot, saveVaultSnapshot } from './storage/indexeddb.js';
import { decryptVaultRecord, encryptVaultRecord } from './crypto/vault.js';
import { verifyVaultKey, createAuthCheckPayload } from './backup/index.js';
import { VaultOnboarding } from './components/VaultOnboarding';
import { VaultUnlock } from './components/VaultUnlock';
import { VaultDashboard, DecryptedRecord } from './components/VaultDashboard';
import { ShowcaseDashboard, MountainIcon } from './components/ShowcaseDashboard';
import { useCompanionBridge } from './companion/useCompanionBridge.js';

type VaultState = 'loading' | 'needs_setup' | 'locked' | 'unlocked';
type ViewMode = 'showcase' | 'vault';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('showcase');
  const [vaultState, setVaultState] = useState<VaultState>('loading');
  const [currentSnapshot, setCurrentSnapshot] = useState<VaultSnapshot | null>(null);
  const [activeKey, setActiveKey] = useState<CryptoKey | null>(null);
  const [decryptedItems, setDecryptedItems] = useState<DecryptedRecord[]>([]);
  const [onboardingInitialMode, setOnboardingInitialMode] = useState<'choice' | 'restore'>('choice');

  const handleCompanionSaveLogin = async (data: { username: string; password: string; url?: string; title?: string }) => {
    if (!currentSnapshot || !activeKey) {
      throw new Error('Vault is locked');
    }

    let domain = '';
    if (data.url) {
      try {
        domain = new URL(data.url).hostname.replace(/^www\./, '');
      } catch {
        domain = data.url;
      }
    }
    const title = data.title || domain || 'Saved Login';

    const secretPayload: LoginFields = {
      username: data.username,
      password: data.password,
      url: data.url,
    };
    const encryptedData = await encryptVaultRecord(secretPayload, activeKey);

    let updatedItems = [...currentSnapshot.items];
    const existingIndex = decryptedItems.findIndex((rec) => {
      if (rec.item.type !== 'LOGIN') return false;
      const recUser = (rec.secret?.username || '').trim().toLowerCase();
      const inputUser = data.username.trim().toLowerCase();
      if (!recUser || recUser !== inputUser) return false;

      let recDomain = '';
      if (rec.secret?.url) {
        try {
          recDomain = new URL(rec.secret.url).hostname.replace(/^www\./, '');
        } catch {
          recDomain = rec.secret.url;
        }
      }
      return (
        recDomain === domain ||
        rec.item.title.toLowerCase().includes(domain.toLowerCase()) ||
        domain.includes(rec.item.title.toLowerCase())
      );
    });

    let savedId: string;
    if (existingIndex >= 0) {
      const existing = decryptedItems[existingIndex].item;
      savedId = existing.id;
      const updatedItem: VaultItem = {
        ...existing,
        updatedAt: Date.now(),
        encryptedData,
      };
      const idxInSnapshot = updatedItems.findIndex((i) => i.id === existing.id);
      if (idxInSnapshot >= 0) {
        updatedItems[idxInSnapshot] = updatedItem;
      } else {
        updatedItems.push(updatedItem);
      }
    } else {
      savedId = crypto.randomUUID();
      const newItem: VaultItem = {
        id: savedId,
        type: 'LOGIN',
        title,
        favorite: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        encryptedData,
      };
      updatedItems.push(newItem);
    }

    let authCheck = currentSnapshot.authCheck;
    if (!authCheck) {
      try {
        authCheck = await createAuthCheckPayload(activeKey, currentSnapshot.vaultId);
      } catch {}
    }

    const updatedSnapshot: VaultSnapshot = {
      ...currentSnapshot,
      authCheck,
      updatedAt: Date.now(),
      items: updatedItems,
    };

    await saveVaultSnapshot(updatedSnapshot);
    setCurrentSnapshot(updatedSnapshot);
    await decryptAllItems(updatedSnapshot, activeKey);

    return { success: true, id: savedId };
  };

  // Activate companion extension bridge across all vault states
  const companion = useCompanionBridge({
    isUnlocked: vaultState === 'unlocked',
    items: decryptedItems,
    onSaveLogin: handleCompanionSaveLogin,
  });

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

    const isValid = await verifyVaultKey(key, currentSnapshot);
    if (!isValid) {
      console.error('Unlock aborted: key failed cryptographic verification.');
      return;
    }

    setActiveKey(key);
    await decryptAllItems(currentSnapshot, key);

    // If legacy snapshot lacks authCheck canary, generate and store it now
    if (!currentSnapshot.authCheck) {
      try {
        const authCheck = await createAuthCheckPayload(key, currentSnapshot.vaultId);
        const updated = { ...currentSnapshot, authCheck };
        await saveVaultSnapshot(updated);
        setCurrentSnapshot(updated);
      } catch (err) {
        console.warn('Failed to upgrade snapshot with authCheck canary:', err);
      }
    }

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
    if (snapshot.items.length > 0 && results.length === 0) {
      throw new Error('Failed to decrypt any vault items. Master key may be invalid.');
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

  const handleLock = useCallback(() => {
    setActiveKey(null);
    setDecryptedItems([]);
    setVaultState('locked');
  }, []);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">

      {vaultState === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-zinc-100">
          <div className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl animate-pulse">
            <MountainIcon className="w-10 h-10 text-zinc-200" />
          </div>
          <div className="text-sm font-medium text-zinc-400">Opening Local Encrypted Storage...</div>
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
            onReturnToOverview={() => setViewMode('showcase')}
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
            companion={companion}
            onReturnToOverview={() => setViewMode('showcase')}
          />
        </div>
      )}
    </div>
  );
};

export default App;
