/**
 * Google Chrome / Chromium / Brave / Edge CSV Parser
 *
 * Headers typically:
 * name,url,username,password,note
 */

import { ParsedImportItem } from '../types.js';
import { ParsedCsvTable } from '../csvParser.js';
import { normalizeUrl } from './common.js';

export function isChromeCsv(table: ParsedCsvTable): boolean {
  const lowerHeaders = table.headers.map((h) => h.toLowerCase());
  return (
    lowerHeaders.includes('name') &&
    lowerHeaders.includes('url') &&
    lowerHeaders.includes('username') &&
    lowerHeaders.includes('password')
  );
}

export function parseChromeCsv(table: ParsedCsvTable): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];

  for (const row of table.rows) {
    // Find key case-insensitively
    const name = row['name'] || row['Name'] || '';
    const url = row['url'] || row['URL'] || '';
    const username = row['username'] || row['Username'] || '';
    const password = row['password'] || row['Password'] || '';
    const note = row['note'] || row['Note'] || row['notes'] || row['Notes'] || '';

    // Must have at least a password or username to be a valid credential
    if (!username && !password && !name) continue;

    let title = name.trim();
    if (!title && url) {
      try {
        title = new URL(normalizeUrl(url)!).hostname.replace(/^www\./, '');
      } catch {
        title = url;
      }
    }
    if (!title) title = 'Saved Login';

    items.push({
      type: 'LOGIN',
      title,
      favorite: false,
      secret: {
        username: username.trim(),
        password,
        url: normalizeUrl(url),
        notes: note.trim() || undefined,
      },
    });
  }

  return items;
}
