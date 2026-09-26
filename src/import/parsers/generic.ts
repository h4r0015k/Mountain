/**
 * Generic Smart-Matching CSV Parser
 *
 * Scans headers for common aliases across any password manager:
 * - Title: title, name, account, label, site
 * - URL: url, website, uri, link, host, domain
 * - Username: username, user, login, email, id
 * - Password: password, pass, pwd
 * - TOTP: totp, otp, 2fa, secret
 * - Notes: notes, note, comments, remark, extra
 */

import { ParsedImportItem } from '../types.js';
import { ParsedCsvTable } from '../csvParser.js';
import { extractTotpSecret, normalizeUrl } from './common.js';

export function parseGenericCsv(table: ParsedCsvTable): ParsedImportItem[] {
  const items: ParsedImportItem[] = [];

  // Map header aliases
  const headerMap: Record<string, string> = {};
  for (const h of table.headers) {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    headerMap[clean] = h;
  }

  const findValue = (row: Record<string, string>, aliases: string[]): string => {
    for (const alias of aliases) {
      if (headerMap[alias] && row[headerMap[alias]] !== undefined) {
        return row[headerMap[alias]];
      }
    }
    return '';
  };

  const titleAliases = ['site', 'sitename', 'service', 'title', 'name', 'app', 'label'];
  const urlAliases = ['url', 'website', 'uri', 'link', 'host', 'domain'];
  const usernameAliases = ['username', 'user', 'login', 'email', 'account', 'accountname', 'loginname'];
  const passwordAliases = ['password', 'pass', 'pwd', 'loginpassword'];
  const totpAliases = ['totp', 'otp', '2fa', 'secret', 'authenticator', 'logintotp', 'otpauth'];
  const notesAliases = ['notes', 'note', 'comments', 'comment', 'extra', 'remark', 'description'];

  for (const row of table.rows) {
    const rawTitle = findValue(row, titleAliases).trim();
    const rawUrl = findValue(row, urlAliases).trim();
    const rawUsername = findValue(row, usernameAliases).trim();
    const rawPassword = findValue(row, passwordAliases);
    const rawNotes = findValue(row, notesAliases).trim();
    const rawTotp = findValue(row, totpAliases);

    if (!rawTitle && !rawUsername && !rawPassword) continue;

    let title = rawTitle;
    if (!title && rawUrl) {
      try {
        title = new URL(normalizeUrl(rawUrl)!).hostname.replace(/^www\./, '');
      } catch {
        title = rawUrl;
      }
    }
    if (!title) title = 'Saved Login';

    items.push({
      type: 'LOGIN',
      title,
      favorite: false,
      secret: {
        username: rawUsername,
        password: rawPassword,
        url: normalizeUrl(rawUrl),
        totpSecret: extractTotpSecret(rawTotp),
        notes: rawNotes || undefined,
      },
    });
  }

  return items;
}
