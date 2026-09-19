/**
 * Mountain Local Storage Engine - Native IndexedDB Adapter
 *
 * Implements asynchronous, non-blocking local-first persistence for encrypted
 * vault snapshots using the browser's native IndexedDB database.
 * Zero external runtime dependencies.
 */

import { VaultSnapshot } from "../models/vault.js";

const DB_NAME = "mountain_vault_db";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";

/**
 * Opens or upgrades the native IndexedDB instance for Mountain.
 */
export function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Primary key is vaultId
        db.createObjectStore(STORE_NAME, { keyPath: "vaultId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
  });
}

/**
 * Saves or updates an encrypted VaultSnapshot in IndexedDB.
 *
 * @param snapshot - The complete encrypted vault snapshot container
 */
export async function saveVaultSnapshot(snapshot: VaultSnapshot): Promise<void> {
  if (!snapshot || !snapshot.vaultId) {
    throw new Error("Invalid snapshot: vaultId is required");
  }

  const db = await openVaultDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.put(snapshot);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to save vault snapshot: ${request.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

/**
 * Loads the stored encrypted VaultSnapshot for a given vaultId.
 * Returns null if no snapshot exists locally.
 *
 * @param vaultId - The unique identifier of the user's vault
 */
export async function loadVaultSnapshot(vaultId: string): Promise<VaultSnapshot | null> {
  if (!vaultId) {
    throw new Error("vaultId must be specified");
  }

  const db = await openVaultDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.get(vaultId);

    request.onsuccess = () => {
      resolve(request.result ? (request.result as VaultSnapshot) : null);
    };
    request.onerror = () => reject(new Error(`Failed to load vault snapshot: ${request.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

/**
 * Permanently wipes a vault snapshot from local IndexedDB storage.
 *
 * @param vaultId - The vault to delete
 */
export async function deleteVaultSnapshot(vaultId: string): Promise<void> {
  if (!vaultId) {
    throw new Error("vaultId must be specified");
  }

  const db = await openVaultDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const request = store.delete(vaultId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Failed to delete vault snapshot: ${request.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}

/**
 * Lists all stored vault snapshots in local IndexedDB.
 */
export async function listVaultSnapshots(): Promise<VaultSnapshot[]> {
  const db = await openVaultDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`Failed to list vault snapshots: ${request.error?.message}`));
    tx.oncomplete = () => db.close();
  });
}
