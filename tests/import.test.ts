import { describe, it, expect, beforeEach } from 'vitest';
import { parseCsvToGrid, parseCsvToTable } from '../src/import/csvParser.js';
import { parseImportFile } from '../src/import/index.js';
import { executeVaultImport } from '../src/import/importer.js';
import { deriveVaultKey, generateSalt } from '../src/crypto/kdf.js';
import { VaultSnapshot } from '../src/models/vault.js';
import 'fake-indexeddb/auto';

describe('Import Subsystem - CSV Parser & Format Detection', () => {
  it('parses basic CSV with quotes, escaped quotes, and commas', () => {
    const csv = `name,url,username,password\n"Google, Inc.","https://google.com","user@gmail.com","p@ss""word"`;
    const table = parseCsvToTable(csv);
    expect(table.headers).toEqual(['name', 'url', 'username', 'password']);
    expect(table.rows.length).toBe(1);
    expect(table.rows[0]['name']).toBe('Google, Inc.');
    expect(table.rows[0]['password']).toBe('p@ss"word');
  });

  it('handles multiline values within quotes and strips BOM', () => {
    const csv = `\uFEFFTitle,URL,Username,Password,Notes\nGitHub,https://github.com,octocat,ghp_secret,"Line 1\nLine 2\nLine 3"`;
    const table = parseCsvToTable(csv);
    expect(table.rows.length).toBe(1);
    expect(table.rows[0]['Notes']).toBe('Line 1\nLine 2\nLine 3');
  });

  it('correctly detects and parses Google Chrome CSV', () => {
    const chromeCsv = `name,url,username,password,note
Amazon,https://amazon.com,shopper@gmail.com,AmzPass123!,Personal account
Netflix,https://netflix.com,streamer@gmail.com,NetPass456!,`;

    const result = parseImportFile(chromeCsv);
    expect(result.format).toBe('chrome_csv');
    expect(result.formatLabel).toContain('Google Chrome');
    expect(result.totalCount).toBe(2);
    expect(result.loginCount).toBe(2);

    expect(result.items[0].title).toBe('Amazon');
    expect((result.items[0].secret as any).username).toBe('shopper@gmail.com');
    expect((result.items[0].secret as any).password).toBe('AmzPass123!');
    expect((result.items[0].secret as any).notes).toBe('Personal account');
  });

  it('correctly detects and parses Bitwarden CSV (Logins & Secure Notes)', () => {
    const bwCsv = `folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp
,1,login,GitHub,Developer account,,0,https://github.com,octocat,ghp_token,JBSWY3DPEHPK3PXP
,0,note,Server Backup Key,ssh-ed25519 AAAAC3...,,0,,,,`;

    const result = parseImportFile(bwCsv);
    expect(result.format).toBe('bitwarden_csv');
    expect(result.totalCount).toBe(2);
    expect(result.loginCount).toBe(1);
    expect(result.noteCount).toBe(1);

    const gh = result.items[0];
    expect(gh.type).toBe('LOGIN');
    expect(gh.favorite).toBe(true);
    expect((gh.secret as any).totpSecret).toBe('JBSWY3DPEHPK3PXP');

    const note = result.items[1];
    expect(note.type).toBe('SECURE_NOTE');
    expect((note.secret as any).content).toContain('ssh-ed25519');
  });

  it('correctly detects and parses Bitwarden JSON export', () => {
    const bwJson = JSON.stringify({
      encrypted: false,
      items: [
        {
          type: 1,
          name: 'Proton Mail',
          notes: 'Encrypted email',
          login: {
            uris: [{ uri: 'https://mail.proton.me' }],
            username: 'alice@proton.me',
            password: 'Pr0t0nPassword',
            totp: 'otpauth://totp/Proton:alice?secret=KRSXG5CTMVRXEZLU&issuer=Proton',
          },
        },
        {
          type: 3,
          name: 'Chase Sapphire',
          card: {
            cardholderName: 'Alice Smith',
            number: '4111222233334444',
            expMonth: '08',
            expYear: '2028',
            code: '123',
          },
        },
      ],
    });

    const result = parseImportFile(bwJson);
    expect(result.format).toBe('bitwarden_json');
    expect(result.totalCount).toBe(2);
    expect(result.loginCount).toBe(1);
    expect(result.cardCount).toBe(1);

    const login = result.items[0];
    expect((login.secret as any).totpSecret).toBe('KRSXG5CTMVRXEZLU');

    const card = result.items[1];
    expect(card.type).toBe('CARD');
    expect((card.secret as any).cardholderName).toBe('Alice Smith');
    expect((card.secret as any).expirationDate).toBe('08/28');
  });

  it('correctly detects and parses 1Password CSV', () => {
    const onePassCsv = `Title,URL,Username,Password,Notes,OTP
Figma,https://figma.com,designer@hyperion.dev,FigmaSecret99!,Work workspace,JBSWY3DPEHPK3PXP`;

    const result = parseImportFile(onePassCsv);
    expect(result.format).toBe('onepassword_csv');
    expect(result.totalCount).toBe(1);
    expect(result.items[0].title).toBe('Figma');
    expect((result.items[0].secret as any).totpSecret).toBe('JBSWY3DPEHPK3PXP');
  });

  it('correctly detects and parses LastPass CSV', () => {
    const lpCsv = `url,username,password,totp,extra,name,grouping,fav
https://digitalocean.com,dev@ocean.com,OceanPass123!,,Cloud VPS,DigitalOcean,Dev,1
http://sn,,,,Offline lockbox code,Safe Code,Personal,0`;

    const result = parseImportFile(lpCsv);
    expect(result.format).toBe('lastpass_csv');
    expect(result.totalCount).toBe(2);
    expect(result.loginCount).toBe(1);
    expect(result.noteCount).toBe(1);
    expect(result.items[0].title).toBe('DigitalOcean');
    expect(result.items[1].type).toBe('SECURE_NOTE');
  });

  it('correctly detects and parses Apple Passwords / Safari CSV', () => {
    const appleCsv = `Title,URL,Username,Password,Notes,OTPAuth
Discord,https://discord.com,gamer123,DiscordPass!,,otpauth://totp/Discord:gamer123?secret=HXDMVJECJJWSRB3H&issuer=Discord`;

    const result = parseImportFile(appleCsv);
    expect(result.format).toBe('apple_csv');
    expect(result.totalCount).toBe(1);
    expect((result.items[0].secret as any).totpSecret).toBe('HXDMVJECJJWSRB3H');
  });

  it('falls back gracefully to Generic CSV auto-detection', () => {
    const customCsv = `Site,Account,Pwd,Comments
Spotify,music_fan,spotty_pass,Family plan`;

    const result = parseImportFile(customCsv);
    expect(result.format).toBe('generic_csv');
    expect(result.totalCount).toBe(1);
    expect(result.items[0].title).toBe('Spotify');
    expect((result.items[0].secret as any).username).toBe('music_fan');
    expect((result.items[0].secret as any).password).toBe('spotty_pass');
  });
});

describe('Import Subsystem - Encryption & Conflict Resolution', () => {
  let activeKey: CryptoKey;
  let baseSnapshot: VaultSnapshot;

  beforeEach(async () => {
    const salt = generateSalt(16);
    const keyBundle = await deriveVaultKey('test master password', salt, 10000);
    activeKey = keyBundle.key;

    baseSnapshot = {
      format: 'mountain-vault',
      version: 1,
      vaultId: 'import-test-vault',
      salt: 'c2FsdA==',
      kdfIterations: 10000,
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  it('imports new items with authenticated AES-256-GCM encryption and persists to IndexedDB', async () => {
    const importItems = [
      {
        type: 'LOGIN' as const,
        title: 'Stripe',
        favorite: true,
        secret: {
          username: 'billing@company.com',
          password: 'SecretPassword123',
          url: 'https://stripe.com',
        },
      },
    ];

    const { result, updatedSnapshot } = await executeVaultImport({
      items: importItems,
      activeKey,
      snapshot: baseSnapshot,
      existingItems: [],
      options: { conflictStrategy: 'skip_duplicates' },
    });

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(updatedSnapshot.items.length).toBe(1);
    expect(updatedSnapshot.items[0].encryptedData.iv).toBeDefined();
    expect(updatedSnapshot.items[0].encryptedData.ciphertext).toBeDefined();
  });

  it('honors conflictStrategy: skip_duplicates when an item already exists', async () => {
    const existing = [
      {
        item: {
          id: 'existing-stripe-id',
          type: 'LOGIN' as const,
          title: 'Stripe',
          favorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          encryptedData: { iv: 'aaa', ciphertext: 'bbb', version: 1 },
        },
        secret: {
          username: 'billing@company.com',
          password: 'OldPassword',
          url: 'https://stripe.com',
        },
      },
    ];

    const incoming = [
      {
        type: 'LOGIN' as const,
        title: 'Stripe',
        secret: {
          username: 'billing@company.com',
          password: 'NewPassword',
          url: 'https://stripe.com',
        },
      },
      {
        type: 'LOGIN' as const,
        title: 'GitHub',
        secret: {
          username: 'newuser@github.com',
          password: 'GhPassword',
        },
      },
    ];

    const { result, updatedSnapshot } = await executeVaultImport({
      items: incoming,
      activeKey,
      snapshot: { ...baseSnapshot, items: [existing[0].item] },
      existingItems: existing,
      options: { conflictStrategy: 'skip_duplicates' },
    });

    expect(result.importedCount).toBe(1); // GitHub
    expect(result.skippedCount).toBe(1); // Stripe was skipped
    expect(updatedSnapshot.items.length).toBe(2);
  });

  it('honors conflictStrategy: overwrite_duplicates by replacing existing record secret', async () => {
    const existing = [
      {
        item: {
          id: 'existing-stripe-id',
          type: 'LOGIN' as const,
          title: 'Stripe',
          favorite: true,
          createdAt: Date.now() - 10000,
          updatedAt: Date.now() - 10000,
          encryptedData: { iv: 'aaa', ciphertext: 'bbb', version: 1 },
        },
        secret: {
          username: 'billing@company.com',
          password: 'OldPassword',
          url: 'https://stripe.com',
        },
      },
    ];

    const incoming = [
      {
        type: 'LOGIN' as const,
        title: 'Stripe Billing Updated',
        secret: {
          username: 'billing@company.com',
          password: 'UpdatedNewPassword123!',
          url: 'https://stripe.com',
        },
      },
    ];

    const { result, updatedSnapshot } = await executeVaultImport({
      items: incoming,
      activeKey,
      snapshot: { ...baseSnapshot, items: [existing[0].item] },
      existingItems: existing,
      options: { conflictStrategy: 'overwrite_duplicates' },
    });

    expect(result.updatedCount).toBe(1);
    expect(result.importedCount).toBe(0);
    expect(updatedSnapshot.items.length).toBe(1);
    expect(updatedSnapshot.items[0].id).toBe('existing-stripe-id');
    expect(updatedSnapshot.items[0].title).toBe('Stripe Billing Updated');
  });
});
