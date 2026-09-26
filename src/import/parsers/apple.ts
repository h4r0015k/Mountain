/**
 * Apple Passwords / Safari CSV Parser
 *
 * Headers typically:
 * Title,URL,Username,Password,Notes,OTPAuth
 */

import { ParsedImportItem } from '../types.js';
import { ParsedCsvTable } from '../csvParser.js';
import { extractTotpSecret, normalizeUrl } from './common.js';

export function isApplePasswordsCsv(table: ParsedCsvTable): boolean {
  const lowerHeaders = table.headers.map((h) => h.toLowerCase());
  return lowerHeaders.includes('otpauth') && lowerHeaders.includes('title') && lowerHeaders.includes('password');
}

export function parseApplePasswordsCsv(table: ParsedCsvTable): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];

  for (const row of table.rows) {
    const title = (row['Title'] || row['title'] || '').trim();
    const url = row['URL'] || row['url'] || '';
    const username = row['Username'] || row['username'] || '';
    const password = row['Password'] || row['password'] || '';
    const notes = (row['Notes'] || row['notes'] || '').trim();
    const otpAuth = row['OTPAuth'] || row['otpauth'] || '';
    const totpSecret = extractTotpSecret(otpAuth);

    if (!title && !username && !password) continue;

    items.push({
      type: 'LOGIN',
      title: title || (url ? new URL(normalizeUrl(url)!).hostname : 'Saved Login'),
      favorite: false,
      secret: {
        username: username.trim(),
        password,
        url: normalizeUrl(url),
        totpSecret,
        notes: notes || undefined,
      },
    });
  }

  return items;
}
