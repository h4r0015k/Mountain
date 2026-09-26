/**
 * Bitwarden CSV & JSON Parser
 */

import { ParsedImportItem } from '../types.js';
import { ParsedCsvTable } from '../csvParser.js';
import { extractTotpSecret, normalizeUrl } from './common.js';

export function isBitwardenCsv(table: ParsedCsvTable): boolean {
  const lowerHeaders = table.headers.map((h) => h.toLowerCase());
  return lowerHeaders.includes('login_uri') && lowerHeaders.includes('login_password');
}

export function parseBitwardenCsv(table: ParsedCsvTable): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];

  for (const row of table.rows) {
    const type = (row['type'] || 'login').toLowerCase().trim();
    const name = (row['name'] || '').trim();
    const notes = (row['notes'] || '').trim();
    const isFav = row['favorite'] === '1' || row['favorite']?.toLowerCase() === 'true';

    if (type === 'login' || !type) {
      const url = row['login_uri'] || '';
      const username = row['login_username'] || '';
      const password = row['login_password'] || '';
      const totp = extractTotpSecret(row['login_totp']);

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
        favorite: isFav,
        secret: {
          username: username.trim(),
          password,
          url: normalizeUrl(url),
          totpSecret: totp,
          notes: notes || undefined,
        },
      });
    } else if (type === 'note' || type === 'secure_note') {
      items.push({
        type: 'SECURE_NOTE',
        title: name || 'Secure Note',
        favorite: isFav,
        secret: {
          title: name || 'Secure Note',
          content: notes,
        },
      });
    } else if (type === 'card') {
      // Bitwarden CSV doesn't export raw card details in CSV for security reasons in older versions,
      // but if extra fields exist:
      items.push({
        type: 'CARD',
        title: name || 'Credit Card',
        favorite: isFav,
        secret: {
          cardholderName: '',
          cardNumber: '',
          expirationDate: '',
          cvv: '',
          notes: notes || undefined,
        },
      });
    }
  }

  return items;
}

export function isBitwardenJson(data: any): boolean {
  if (typeof data !== 'object' || !data) return false;
  // Bitwarden unencrypted JSON has an `items` array and optionally `encrypted: false`
  return Array.isArray(data.items) && (data.encrypted === false || data.items.some((i: any) => i.login || i.type !== undefined));
}

export function parseBitwardenJson(data: any): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];
  const rawItems: any[] = data.items || [];

  for (const it of rawItems) {
    const isFav = !!it.favorite;
    const name = (it.name || '').trim();
    const notes = (it.notes || '').trim();

    // Type 1: Login
    if (it.type === 1 || it.login) {
      const login = it.login || {};
      const uri = login.uris && login.uris.length > 0 ? login.uris[0].uri : '';
      const username = login.username || '';
      const password = login.password || '';
      const totp = extractTotpSecret(login.totp);

      let title = name;
      if (!title && uri) {
        try {
          title = new URL(normalizeUrl(uri)!).hostname.replace(/^www\./, '');
        } catch {
          title = uri;
        }
      }
      if (!title) title = 'Saved Login';

      items.push({
        type: 'LOGIN',
        title,
        favorite: isFav,
        secret: {
          username: username.trim(),
          password,
          url: normalizeUrl(uri),
          totpSecret: totp,
          notes: notes || undefined,
        },
      });
    }
    // Type 2: Secure Note
    else if (it.type === 2) {
      items.push({
        type: 'SECURE_NOTE',
        title: name || 'Secure Note',
        favorite: isFav,
        secret: {
          title: name || 'Secure Note',
          content: notes,
        },
      });
    }
    // Type 3: Card
    else if (it.type === 3 && it.card) {
      const card = it.card;
      const expMonth = String(card.expMonth || '').padStart(2, '0');
      const expYear = String(card.expYear || '').slice(-2);
      const expirationDate = expMonth && expYear ? `${expMonth}/${expYear}` : '';

      items.push({
        type: 'CARD',
        title: name || 'Credit Card',
        favorite: isFav,
        secret: {
          cardholderName: (card.cardholderName || '').trim(),
          cardNumber: (card.number || '').trim(),
          expirationDate,
          cvv: (card.code || '').trim(),
          notes: notes || undefined,
        },
      });
    }
  }

  return items;
}
