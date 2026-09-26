/**
 * Mountain Password Manager - Import Subsystem Types
 */

import { VaultItemType, LoginFields, SecureNoteFields, CardFields, ApiKeyFields } from '../models/vault.js';

export type ImportSourceFormat =
  | 'bitwarden_csv'
  | 'bitwarden_json'
  | 'chrome_csv'
  | 'onepassword_csv'
  | 'lastpass_csv'
  | 'apple_csv'
  | 'generic_csv';

export interface ParsedImportItem {
  type: VaultItemType;
  title: string;
  favorite?: boolean;
  secret: LoginFields | SecureNoteFields | CardFields | ApiKeyFields;
}

export interface ImportParseResult {
  format: ImportSourceFormat;
  formatLabel: string;
  items: ParsedImportItem[];
  warnings: string[];
  totalCount: number;
  loginCount: number;
  cardCount: number;
  noteCount: number;
}

export type ImportConflictStrategy = 'skip_duplicates' | 'overwrite_duplicates' | 'import_all';

export interface ImportOptions {
  conflictStrategy: ImportConflictStrategy;
  selectedIndices?: number[];
}

export interface ImportExecutionResult {
  importedCount: number;
  skippedCount: number;
  updatedCount: number;
  totalVaultItems: number;
}
