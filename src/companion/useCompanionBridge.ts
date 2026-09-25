import { useEffect, useState, useCallback, useRef } from 'react';
import { DecryptedRecord } from '../models/vault';
import { generatePassword } from '../crypto/generator';

/**
 * Extracts a normalized hostname from a URL string for credential matching.
 */
export function normalizeDomain(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withProto).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return trimmed.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0].trim();
  }
}

/**
 * Extracts root brand name (e.g. "instagram" from "instagram.com" or "m.instagram.com").
 */
export function getRootDomain(domain: string): string {
  if (!domain) return '';
  const clean = normalizeDomain(domain);
  const parts = clean.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return clean;
}

/**
 * Robust matching between stored vault items and the current webpage domain.
 */
export function matchesDomainOrTitle(itemUrl: string, itemTitle: string, targetDomain: string): boolean {
  if (!targetDomain) return false;
  const cleanTarget = normalizeDomain(targetDomain);
  if (!cleanTarget) return false;
  const targetRoot = getRootDomain(cleanTarget);

  const cleanItemDomain = normalizeDomain(itemUrl || '');
  const itemRoot = getRootDomain(cleanItemDomain);
  const titleLower = (itemTitle || '').toLowerCase().trim();

  // If itemUrl has a domain specified, enforce strict domain hierarchy
  if (cleanItemDomain) {
    // 1. Exact match
    if (cleanItemDomain === cleanTarget) return true;

    // 2. Subdomain match (e.g. login.dev.to <-> dev.to, or dev.to <-> app.dev.to)
    if (
      cleanItemDomain.endsWith(`.${cleanTarget}`) ||
      cleanTarget.endsWith(`.${cleanItemDomain}`)
    ) {
      return true;
    }

    // Security: If both item URL and target have explicit domains, require matching TLD
    // to prevent cross-site phishing (e.g. paypal.com vs paypal.xyz)
    const getTld = (d: string) => {
      const parts = d.split('.');
      return parts.length >= 2 ? parts[parts.length - 1] : '';
    };
    if (getTld(cleanItemDomain) !== getTld(cleanTarget)) {
      return false;
    }

    // 3. Same root brand under same TLD (e.g. root "dev" under .to)
    if (targetRoot && itemRoot && targetRoot === itemRoot) return true;
  }

  // 4. Exact title match with clean target or target root
  if (titleLower && (titleLower === cleanTarget || titleLower === targetRoot)) return true;

  // 5. Title contains target domain or target root (e.g. Title "Dev.to Account" or "DEV Community", targetRoot "dev")
  if (cleanTarget && titleLower.includes(cleanTarget)) return true;
  if (targetRoot && targetRoot.length >= 2 && titleLower.includes(targetRoot)) return true;

  // 6. Target domain contains title (e.g. target "dev.to" contains title "dev" or "dev.to")
  if (titleLower.length >= 2 && cleanTarget.includes(titleLower)) return true;

  // 7. Punctuation-stripped comparison (e.g. title "dev to" or "devto" vs target "dev.to")
  const strippedTarget = cleanTarget.replace(/[^a-z0-9]/g, '');
  const strippedTitle = titleLower.replace(/[^a-z0-9]/g, '');
  if (strippedTitle && strippedTarget) {
    if (strippedTitle === strippedTarget) return true;
    if (strippedTitle.length >= 3 && strippedTarget.includes(strippedTitle)) return true;
    if (strippedTarget.length >= 3 && strippedTitle.includes(strippedTarget)) return true;
  }

  // 8. If itemUrl was not provided or empty, also check if title itself looks like a domain that matches
  if (!cleanItemDomain && titleLower.includes('.')) {
    const titleAsDomain = normalizeDomain(titleLower);
    if (titleAsDomain === cleanTarget || titleAsDomain.endsWith(`.${cleanTarget}`) || cleanTarget.endsWith(`.${titleAsDomain}`)) {
      return true;
    }
  }

  return false;
}

function generateRandomCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const num = (arr[0] % 900000) + 100000;
  return num.toString();
}

export interface SaveLoginData {
  username: string;
  password: string;
  url?: string;
  title?: string;
}

export interface CompanionBridgeOptions {
  isUnlocked?: boolean;
  items: DecryptedRecord[];
  onSaveLogin?: (data: SaveLoginData) => Promise<{ success: boolean; id: string }>;
}

export interface CompanionBridgeHook {
  isPaired: boolean;
  pairingCode: string;
  regeneratePairingCode: () => string;
  unpair: () => void;
}

const SESSION_STORAGE_KEY = 'mountain_companion_session_token';

export function useCompanionBridge(arg: DecryptedRecord[] | CompanionBridgeOptions): CompanionBridgeHook {
  const isUnlocked = Array.isArray(arg) ? true : !!arg.isUnlocked;
  const items = Array.isArray(arg) ? arg : (arg.items || []);
  const onSaveLogin = Array.isArray(arg) ? undefined : arg.onSaveLogin;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const isUnlockedRef = useRef(isUnlocked);
  isUnlockedRef.current = isUnlocked;

  const onSaveLoginRef = useRef(onSaveLogin);
  onSaveLoginRef.current = onSaveLogin;

  const [pairingCode, setPairingCode] = useState<string>(() => generateRandomCode());
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      } catch {}
    }
    return null;
  });

  const sessionTokenRef = useRef<string | null>(sessionToken);
  sessionTokenRef.current = sessionToken;

  const pairingCodeRef = useRef<string>(pairingCode);
  pairingCodeRef.current = pairingCode;

  // Brute-force protection: track consecutive failed pairing attempts and lockout expiry
  const failedPairingAttemptsRef = useRef<number>(0);
  const pairingLockoutUntilRef = useRef<number>(0);

  const regeneratePairingCode = useCallback(() => {
    const newCode = generateRandomCode();
    setPairingCode(newCode);
    failedPairingAttemptsRef.current = 0;
    pairingLockoutUntilRef.current = 0;
    return newCode;
  }, []);

  const updateSessionToken = useCallback((newToken: string | null) => {
    setSessionToken(newToken);
    sessionTokenRef.current = newToken;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        if (newToken) {
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, newToken);
        } else {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch {}
    }
  }, []);

  const unpair = useCallback(() => {
    updateSessionToken(null);
    regeneratePairingCode();
  }, [updateSessionToken, regeneratePairingCode]);

  // When vault locks, wipe session pairing token immediately
  useEffect(() => {
    if (!isUnlocked) {
      updateSessionToken(null);
    }
  }, [isUnlocked, updateSessionToken]);

  // Broadcast updated status whenever unlock state, item count, or sessionToken changes
  const broadcastStatus = useCallback(() => {
    (window as any).__MOUNTAIN_SPA_LOADED__ = true;
    (window as any).__MOUNTAIN_SPA_UNLOCKED__ = isUnlockedRef.current;

    const targetOrigin = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '*';

    window.postMessage(
      {
        source: 'MOUNTAIN_SPA',
        type: 'VAULT_STATUS_BROADCAST',
        unlocked: isUnlockedRef.current,
        isPaired: !!sessionTokenRef.current,
        itemCount: isUnlockedRef.current ? itemsRef.current.length : 0,
      },
      targetOrigin
    );
  }, []);

  useEffect(() => {
    broadcastStatus();
  }, [isUnlocked, items.length, sessionToken, broadcastStatus]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const targetOrigin = window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '*';
      window.postMessage(
        {
          source: 'MOUNTAIN_SPA',
          type: 'VAULT_STATUS_BROADCAST',
          unlocked: false,
          isPaired: false,
          itemCount: 0,
        },
        targetOrigin
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const targetOrigin = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '*';

    broadcastStatus();

    const handleMessage = async (event: MessageEvent) => {
      // Security: Accept messages originating from this tab window
      if (event.source !== window) {
        return;
      }
      if (event.origin && event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }
      if (!event.data || event.data.source !== 'MOUNTAIN_EXTENSION_CONTENT_SCRIPT') {
        return;
      }

      const { action, requestId, domain, options, code, token, username, password, url, title } = event.data;

      switch (action) {
        case 'PING':
        case 'CHECK_STATUS': {
          window.postMessage(
            {
              source: 'MOUNTAIN_SPA',
              type: 'PONG',
              requestId,
              unlocked: isUnlockedRef.current,
              isPaired: !!sessionTokenRef.current,
              itemCount: isUnlockedRef.current ? itemsRef.current.length : 0,
            },
            targetOrigin
          );
          break;
        }

        case 'PAIR_WITH_CODE': {
          if (!isUnlockedRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'PAIR_RESPONSE',
                requestId,
                success: false,
                error: 'VAULT_LOCKED',
              },
              targetOrigin
            );
            break;
          }

          // Active lockout check
          const now = Date.now();
          if (now < pairingLockoutUntilRef.current) {
            const waitSec = Math.ceil((pairingLockoutUntilRef.current - now) / 1000);
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'PAIR_RESPONSE',
                requestId,
                success: false,
                error: 'PAIRING_LOCKED_OUT',
                message: `Too many failed pairing attempts. Please wait ${waitSec}s before retrying.`,
              },
              targetOrigin
            );
            break;
          }

          const cleanedInput = String(code || '').replace(/\D/g, '');
          const cleanedCurrent = pairingCodeRef.current.replace(/\D/g, '');

          if (cleanedInput && cleanedInput === cleanedCurrent) {
            failedPairingAttemptsRef.current = 0;
            pairingLockoutUntilRef.current = 0;
            const newToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
            updateSessionToken(newToken);

            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'PAIR_RESPONSE',
                requestId,
                success: true,
                sessionToken: newToken,
              },
              targetOrigin
            );
            broadcastStatus();
          } else {
            failedPairingAttemptsRef.current += 1;
            if (failedPairingAttemptsRef.current >= 3) {
              // Enforce 60-second lockout and invalidate the pairing code
              pairingLockoutUntilRef.current = Date.now() + 60000;
              failedPairingAttemptsRef.current = 0;
              regeneratePairingCode();

              window.postMessage(
                {
                  source: 'MOUNTAIN_SPA',
                  type: 'PAIR_RESPONSE',
                  requestId,
                  success: false,
                  error: 'PAIRING_LOCKED_OUT',
                  message: 'Too many invalid attempts. The pairing code has been revoked and regenerated for security.',
                },
                targetOrigin
              );
            } else {
              window.postMessage(
                {
                  source: 'MOUNTAIN_SPA',
                  type: 'PAIR_RESPONSE',
                  requestId,
                  success: false,
                  error: 'INVALID_PAIRING_CODE',
                  attemptsRemaining: 3 - failedPairingAttemptsRef.current,
                },
                targetOrigin
              );
            }
          }
          break;
        }

        case 'UNPAIR': {
          updateSessionToken(null);
          regeneratePairingCode();

          window.postMessage(
            {
              source: 'MOUNTAIN_SPA',
              type: 'UNPAIR_RESPONSE',
              requestId,
              success: true,
            },
            targetOrigin
          );
          broadcastStatus();
          break;
        }

        case 'GET_LOGINS': {
          const targetDomain = normalizeDomain(domain || '');

          // Check pairing authentication
          if (!sessionTokenRef.current || token !== sessionTokenRef.current) {
            console.warn('[Mountain Bridge] Blocked unauthorized GET_LOGINS: invalid or missing sessionToken');
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'LOGINS_RESPONSE',
                requestId,
                domain: targetDomain,
                unlocked: isUnlockedRef.current,
                error: 'UNAUTHORIZED_NOT_PAIRED',
                logins: [],
              },
              targetOrigin
            );
            break;
          }

          if (!targetDomain || !isUnlockedRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'LOGINS_RESPONSE',
                requestId,
                domain: targetDomain,
                unlocked: isUnlockedRef.current,
                logins: [],
              },
              targetOrigin
            );
            break;
          }

          // Strict domain-scoped credential matching
          const matchingLogins = itemsRef.current
            .filter((rec) => (rec.item.type || '').toUpperCase() === 'LOGIN' && (rec.secret?.password || rec.secret?.username))
            .filter((rec) => matchesDomainOrTitle(rec.secret?.url || (rec.item as any)?.url || '', rec.item.title || '', targetDomain))
            .map((rec) => ({
              id: rec.item.id,
              title: rec.item.title,
              username: rec.secret?.username || '',
              password: rec.secret?.password || '',
              url: rec.secret?.url || '',
              hasTotp: !!rec.secret?.totpSecret,
              isDomainMatch: true,
            }));

          window.postMessage(
            {
              source: 'MOUNTAIN_SPA',
              type: 'LOGINS_RESPONSE',
              requestId,
              domain: targetDomain,
              unlocked: true,
              logins: matchingLogins,
            },
            targetOrigin
          );
          break;
        }

        case 'GENERATE_PASSWORD': {
          if (!sessionTokenRef.current || token !== sessionTokenRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'GENERATE_PASSWORD_RESPONSE',
                requestId,
                error: 'UNAUTHORIZED_NOT_PAIRED',
              },
              targetOrigin
            );
            break;
          }

          const password = generatePassword({
            length: options?.length || 20,
            uppercase: options?.uppercase ?? true,
            lowercase: options?.lowercase ?? true,
            digits: options?.digits ?? true,
            symbols: options?.symbols ?? true,
          });

          window.postMessage(
            {
              source: 'MOUNTAIN_SPA',
              type: 'GENERATE_PASSWORD_RESPONSE',
              requestId,
              password,
            },
            targetOrigin
          );
          break;
        }

        case 'GET_CARDS': {
          if (!sessionTokenRef.current || token !== sessionTokenRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'CARDS_RESPONSE',
                requestId,
                unlocked: isUnlockedRef.current,
                error: 'UNAUTHORIZED_NOT_PAIRED',
                cards: [],
              },
              targetOrigin
            );
            break;
          }

          if (!isUnlockedRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'CARDS_RESPONSE',
                requestId,
                unlocked: false,
                cards: [],
              },
              targetOrigin
            );
            break;
          }

          const targetDomain = normalizeDomain(domain || '');

          const cards = itemsRef.current
            .filter((rec) => (rec.item.type || '').toUpperCase() === 'CARD' && rec.secret?.cardNumber)
            .filter((rec) => !targetDomain || matchesDomainOrTitle(rec.secret?.url || '', rec.item.title || '', targetDomain))
            .map((rec) => ({
              id: rec.item.id,
              title: rec.item.title,
              cardholderName: rec.secret?.cardholderName || '',
              cardNumber: rec.secret?.cardNumber || '',
              expirationDate: rec.secret?.expirationDate || '',
              cvv: rec.secret?.cvv || '',
            }));

          window.postMessage(
            {
              source: 'MOUNTAIN_SPA',
              type: 'CARDS_RESPONSE',
              requestId,
              unlocked: true,
              cards,
            },
            targetOrigin
          );
          break;
        }

        case 'CHECK_CREDENTIAL_STATUS': {
          const targetDomain = normalizeDomain(domain || '');

          if (!sessionTokenRef.current || token !== sessionTokenRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'CHECK_CREDENTIAL_RESPONSE',
                requestId,
                error: 'UNAUTHORIZED_NOT_PAIRED',
                canSave: false,
              },
              targetOrigin
            );
            break;
          }

          if (!isUnlockedRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'CHECK_CREDENTIAL_RESPONSE',
                requestId,
                unlocked: false,
                canSave: false,
              },
              targetOrigin
            );
            break;
          }

          const matched = itemsRef.current
            .filter((rec) => (rec.item.type || '').toUpperCase() === 'LOGIN' && (rec.secret?.password || rec.secret?.username))
            .filter((rec) => matchesDomainOrTitle(rec.secret?.url || (rec.item as any)?.url || '', rec.item.title || '', targetDomain));

          const userMatch = matched.find((rec) => {
            const secUser = (rec.secret?.username || '').trim().toLowerCase();
            const inputUser = (username || '').trim().toLowerCase();
            return secUser && inputUser && secUser === inputUser;
          });

          if (userMatch) {
            const isSamePassword = userMatch.secret?.password === password;
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'CHECK_CREDENTIAL_RESPONSE',
                requestId,
                exists: true,
                isSamePassword,
                isUpdate: !isSamePassword,
                title: userMatch.item.title,
                canSave: !isSamePassword,
              },
              targetOrigin
            );
          } else {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'CHECK_CREDENTIAL_RESPONSE',
                requestId,
                exists: false,
                isSamePassword: false,
                isUpdate: false,
                title: targetDomain || 'New Login',
                canSave: true,
              },
              targetOrigin
            );
          }
          break;
        }

        case 'SAVE_LOGIN': {
          if (!sessionTokenRef.current || token !== sessionTokenRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'SAVE_LOGIN_RESPONSE',
                requestId,
                success: false,
                error: 'UNAUTHORIZED_NOT_PAIRED',
              },
              targetOrigin
            );
            break;
          }

          if (!isUnlockedRef.current) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'SAVE_LOGIN_RESPONSE',
                requestId,
                success: false,
                error: 'VAULT_LOCKED',
              },
              targetOrigin
            );
            break;
          }

          if (onSaveLoginRef.current) {
            try {
              const res = await onSaveLoginRef.current({
                username: username || '',
                password: password || '',
                url: url || '',
                title: title || domain || '',
              });

              window.postMessage(
                {
                  source: 'MOUNTAIN_SPA',
                  type: 'SAVE_LOGIN_RESPONSE',
                  requestId,
                  success: true,
                  id: res.id,
                },
                targetOrigin
              );
            } catch (err: any) {
              window.postMessage(
                {
                  source: 'MOUNTAIN_SPA',
                  type: 'SAVE_LOGIN_RESPONSE',
                  requestId,
                  success: false,
                  error: err.message || 'Save failed',
                },
                targetOrigin
              );
            }
          } else {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'SAVE_LOGIN_RESPONSE',
                requestId,
                success: false,
                error: 'SAVE_HANDLER_NOT_CONFIGURED',
              },
              targetOrigin
            );
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [regeneratePairingCode, updateSessionToken]);

  return {
    isPaired: !!sessionToken,
    pairingCode,
    regeneratePairingCode,
    unpair,
  };
}
