/**
 * LastPass CSV Parser
 *
 * Headers typically:
 * url,username,password,totp,extra,name,grouping,fav
 */

import { ParsedImportItem } from '../types.js';
import { ParsedCsvTable } from '../csvParser.js';
import { extractTotpSecret, normalizeUrl } from './common.js';

export function isLastPassCsv(table: ParsedCsvTable): boolean {
  const lowerHeaders = table.headers.map((h) => h.toLowerCase());
  return lowerHeaders.includes('extra') && lowerHeaders.includes('grouping') && lowerHeaders.includes('url');
}

export function parseLastPassCsv(table: ParsedCsvTable): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];

  for (const row of table.rows) {
    const url = row['url'] || '';
    const username = row['username'] || '';
    const password = row['password'] || '';
    const totp = extractTotpSecret(row['totp']);
    const extra = (row['extra'] || '').trim();
    const name = (row['name'] || '').trim();
    const fav = row['fav'] === '1';

    if (url === 'http://sn') {
      // LastPass Secure Note
      items.push({
        type: 'SECURE_NOTE',
        title: name || 'Secure Note',
        favorite: fav,
        secret: {
          title: name || 'Secure Note',
          content: extra,
        },
      });
    } else {
      if (!name && !username && !password) continue;

      let title = name;
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
        favorite: fav,
        secret: {
          username: username.trim(),
          password,
          url: normalizeUrl(url),
          totpSecret: totp,
          notes: extra || undefined,
        },
      });
    }
  }

  return items;
}
