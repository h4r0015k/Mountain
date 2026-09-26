/**
 * Mountain Import Subsystem - Encryption & Persistence Engine
 */

import { VaultSnapshot, VaultItem } from '../models/vault.js';
import { encryptVaultRecord } from '../crypto/vault.js';
import { saveVaultSnapshot } from '../storage/indexeddb.js';
import { ParsedImportItem, ImportOptions, ImportExecutionResult } from './types.js';

export interface ExecuteImportParams {
  items: ParsedImportItem[];
  activeKey: CryptoKey;
  snapshot: VaultSnapshot;
  existingItems: { item: VaultItem; secret: any }[];
  options: ImportOptions;
}

export function findMatchingVaultItemIndex(
  incoming: ParsedImportItem,
  existingItems: { item: VaultItem; secret: any }[]
): number {
  return existingItems.findIndex(({ item, secret }) => {
    if (item.type !== incoming.type) return false;

    if (incoming.type === 'LOGIN') {
      const incUser = ((incoming.secret as any).username || '').trim().toLowerCase();
      const exUser = (secret?.username || '').trim().toLowerCase();
      if (incUser && exUser && incUser !== exUser) return false;

      const incTitle = incoming.title.trim().toLowerCase();
      const exTitle = item.title.trim().toLowerCase();
      const incUrl = ((incoming.secret as any).url || '').trim().toLowerCase();
      const exUrl = (secret?.url || '').trim().toLowerCase();

      return incTitle === exTitle || (incUrl && exUrl && incUrl === exUrl);
    }

    if (incoming.type === 'SECURE_NOTE') {
      return item.title.trim().toLowerCase() === incoming.title.trim().toLowerCase();
    }

    if (incoming.type === 'CARD') {
      const incNum = ((incoming.secret as any).cardNumber || '').replace(/\D/g, '');
      const exNum = (secret?.cardNumber || '').replace(/\D/g, '');
      if (incNum && exNum && incNum.slice(-4) === exNum.slice(-4)) {
        return true;
      }
      return item.title.trim().toLowerCase() === incoming.title.trim().toLowerCase();
    }

    return false;
  });
}

export async function executeVaultImport({
  items,
  activeKey,
  snapshot,
  existingItems,
  options,
}: ExecuteImportParams): Promise<{ result: ImportExecutionResult; updatedSnapshot: VaultSnapshot }> {
  const selectedIndices = options.selectedIndices
    ? new Set(options.selectedIndices)
    : new Set(items.map((_, idx) => idx));

  let importedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  const currentItems = [...snapshot.items];

  for (let i = 0; i < items.length; i++) {
    if (!selectedIndices.has(i)) continue;

    const incoming = items[i];
    const existingIdx = findMatchingVaultItemIndex(incoming, existingItems);

    if (existingIdx >= 0) {
      if (options.conflictStrategy === 'skip_duplicates') {
        skippedCount++;
        continue;
      } else if (options.conflictStrategy === 'overwrite_duplicates') {
        const existingRecord = existingItems[existingIdx];
        const encryptedData = await encryptVaultRecord(incoming.secret, activeKey);

        const updatedItem: VaultItem = {
          ...existingRecord.item,
          title: incoming.title || existingRecord.item.title,
          updatedAt: Date.now(),
          encryptedData,
        };

        const snapshotIdx = currentItems.findIndex((it) => it.id === existingRecord.item.id);
        if (snapshotIdx >= 0) {
          currentItems[snapshotIdx] = updatedItem;
        }
        updatedCount++;
        continue;
      }
    }

    // Import as new item
    const newItemId = crypto.randomUUID();
    const encryptedData = await encryptVaultRecord(incoming.secret, activeKey);

    const newItem: VaultItem = {
      id: newItemId,
      type: incoming.type,
      title: incoming.title || 'Imported Item',
      favorite: !!incoming.favorite,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      encryptedData,
    };

    currentItems.push(newItem);
    importedCount++;
  }

  const updatedSnapshot: VaultSnapshot = {
    ...snapshot,
    items: currentItems,
    updatedAt: Date.now(),
  };

  await saveVaultSnapshot(updatedSnapshot);

  return {
    result: {
      importedCount,
      skippedCount,
      updatedCount,
      totalVaultItems: updatedSnapshot.items.length,
    },
    updatedSnapshot,
  };
}
