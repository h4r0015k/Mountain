/**
 * 1Password CSV Parser
 */

import { ParsedImportItem } from '../types.js';
import { ParsedCsvTable } from '../csvParser.js';
import { extractTotpSecret, normalizeUrl } from './common.js';

export function isOnePasswordCsv(table: ParsedCsvTable): boolean {
  const lowerHeaders = table.headers.map((h) => h.toLowerCase());
  const hasTitle = lowerHeaders.includes('title');
  const hasUrl = lowerHeaders.includes('url') || lowerHeaders.includes('website');
  const hasPassword = lowerHeaders.includes('password');
  // Distinguish from Chrome CSV by checking for 'title' instead of 'name', or presence of 'otp'
  return hasTitle && hasUrl && hasPassword;
}

export function parseOnePasswordCsv(table: ParsedCsvTable): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];

  for (const row of table.rows) {
    const title = (row['Title'] || row['title'] || '').trim();
    const url = row['URL'] || row['url'] || row['website'] || row['Website'] || '';
    const username = row['Username'] || row['username'] || '';
    const password = row['Password'] || row['password'] || '';
    const notes = (row['Notes'] || row['notes'] || '').trim();
    const otp = extractTotpSecret(row['OTP'] || row['otp'] || row['one-time password'] || row['One-Time Password']);

    if (!title && !username && !password) continue;

    items.push({
      type: 'LOGIN',
      title: title || (url ? new URL(normalizeUrl(url)!).hostname : 'Saved Login'),
      favorite: false,
      secret: {
        username: username.trim(),
        password,
        url: normalizeUrl(url),
        totpSecret: otp,
        notes: notes || undefined,
      },
    });
  }

  return items;
}
