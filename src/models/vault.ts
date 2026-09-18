/**
 * Mountain Core Domain Models - Strongly Typed Vault Schema
 *
 * Defines the structure of unencrypted records, encrypted items,
 * and the complete portable vault snapshot format for Google Drive sync.
 */

import { EncryptedVaultPayload } from "../crypto/vault.js";

export type VaultItemType = "LOGIN" | "SECURE_NOTE" | "CARD" | "API_KEY";

export interface LoginFields {
  username: string;
  password: string;
  url?: string;
  totpSecret?: string; // 2FA Secret Key
  notes?: string;
}

export interface SecureNoteFields {
  title: string;
  content: string; // Markdown supported
}

export interface CardFields {
  cardholderName: string;
  cardNumber: string;
  expirationDate: string; // MM/YY
  cvv: string;
  pin?: string;
}

export interface ApiKeyFields {
  serviceName: string;
  apiKey: string;
  apiSecret?: string;
  endpointUrl?: string;
}

export type VaultSecretPayload = LoginFields | SecureNoteFields | CardFields | ApiKeyFields;

/**
 * An individual item stored in the vault.
 * Metadata (id, type, timestamps) is unencrypted to enable fast indexing and sorting.
 * The sensitive content is locked inside `encryptedData` (AES-256-GCM).
 */
export interface VaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  favorite: boolean;
  createdAt: number; // Epoch timestamp
  updatedAt: number; // Epoch timestamp
  encryptedData: EncryptedVaultPayload;
}

/**
 * The root container for a user's vault.
 * Serialized to JSON for local persistence (IndexedDB) and cloud sync (Google Drive appDataFolder).
 */
export interface VaultSnapshot {
  format: "mountain-vault";
  version: 1;
  vaultId: string;
  salt: string; // Base64 16-byte KDF salt
  kdfIterations: number; // 600,000 rounds
  items: VaultItem[];
  createdAt: number;
  updatedAt: number;
}
