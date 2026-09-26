/**
 * Mountain Import Subsystem - Master Coordinator
 */

import { ImportParseResult, ParsedImportItem } from './types.js';
import { parseCsvToTable } from './csvParser.js';
import { isChromeCsv, parseChromeCsv } from './parsers/chrome.js';
import { isBitwardenCsv, parseBitwardenCsv, isBitwardenJson, parseBitwardenJson } from './parsers/bitwarden.js';
import { isOnePasswordCsv, parseOnePasswordCsv } from './parsers/onePassword.js';
import { isLastPassCsv, parseLastPassCsv } from './parsers/lastpass.js';
import { isApplePasswordsCsv, parseApplePasswordsCsv } from './parsers/apple.js';
import { parseGenericCsv } from './parsers/generic.js';

export * from './types.js';
export * from './csvParser.js';
export * from './importer.js';

/**
 * Automatically detects the format of the import file and parses all records.
 */
export function parseImportFile(content: string, _fileName?: string): ImportParseResult {
  const clean = content.trim();
  if (!clean) {
    throw new Error('Import file is empty.');
  }

  // 1. Check if JSON
  if (clean.startsWith('{') || clean.startsWith('[')) {
    try {
      const parsedJson = JSON.parse(clean);

      // Check if user accidentally uploaded a Mountain backup
      if (parsedJson.format === 'mountain-vault') {
        throw new Error(
          'This file is an encrypted Mountain vault backup. Please use the "Backup & Restore" menu to restore this backup.'
        );
      }

      if (isBitwardenJson(parsedJson)) {
        const items = parseBitwardenJson(parsedJson);
        return buildResult('bitwarden_json', 'Bitwarden (JSON)', items);
      }

      throw new Error('Unrecognized JSON import format. Expected Bitwarden unencrypted JSON.');
    } catch (err: any) {
      if (err.message.includes('Mountain vault backup') || err.message.includes('Unrecognized JSON')) {
        throw err;
      }
      // If JSON parse failed, fall through to CSV
    }
  }

  // 2. CSV parsing
  const table = parseCsvToTable(clean);
  if (table.headers.length === 0 || table.rows.length === 0) {
    throw new Error('No valid CSV rows or headers found in the file.');
  }

  // Detect format in prioritized order
  if (isBitwardenCsv(table)) {
    const items = parseBitwardenCsv(table);
    return buildResult('bitwarden_csv', 'Bitwarden (CSV)', items);
  }

  if (isApplePasswordsCsv(table)) {
    const items = parseApplePasswordsCsv(table);
    return buildResult('apple_csv', 'Apple Passwords / Safari (CSV)', items);
  }

  if (isLastPassCsv(table)) {
    const items = parseLastPassCsv(table);
    return buildResult('lastpass_csv', 'LastPass (CSV)', items);
  }

  if (isOnePasswordCsv(table)) {
    const items = parseOnePasswordCsv(table);
    return buildResult('onepassword_csv', '1Password (CSV)', items);
  }

  if (isChromeCsv(table)) {
    const items = parseChromeCsv(table);
    return buildResult('chrome_csv', 'Google Chrome / Brave / Edge (CSV)', items);
  }

  // Fallback to smart generic CSV
  const items = parseGenericCsv(table);
  return buildResult('generic_csv', 'Auto-Detected CSV Format', items);
}

function buildResult(
  format: ImportParseResult['format'],
  formatLabel: string,
  items: ParsedImportItem[]
): ImportParseResult {
  const warnings: string[] = [];
  if (items.length === 0) {
    warnings.push('No valid credentials could be extracted from this file.');
  }

  let loginCount = 0;
  let cardCount = 0;
  let noteCount = 0;

  for (const it of items) {
    if (it.type === 'LOGIN') loginCount++;
    else if (it.type === 'CARD') cardCount++;
    else if (it.type === 'SECURE_NOTE') noteCount++;
  }

  return {
    format,
    formatLabel,
    items,
    warnings,
    totalCount: items.length,
    loginCount,
    cardCount,
    noteCount,
  };
}
