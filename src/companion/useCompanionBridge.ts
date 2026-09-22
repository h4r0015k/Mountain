import { useEffect, useState, useCallback, useRef } from 'react';
import { DecryptedRecord } from '../models/vault';
import { generatePassword } from '../crypto/generator';

/**
 * Extracts a normalized hostname from a URL string for credential matching.
 */
function normalizeDomain(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const withProto = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `https://${rawUrl}`;
    const host = new URL(withProto).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return rawUrl.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Extracts root brand name (e.g. "instagram" from "instagram.com" or "m.instagram.com").
 */
function getRootDomain(domain: string): string {
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
function matchesDomainOrTitle(itemUrl: string, itemTitle: string, targetDomain: string): boolean {
  if (!targetDomain) return false;
  const cleanTarget = normalizeDomain(targetDomain);
  const targetRoot = getRootDomain(cleanTarget);

  const cleanItemDomain = normalizeDomain(itemUrl || '');
  const itemRoot = getRootDomain(cleanItemDomain);
  const titleLower = (itemTitle || '').toLowerCase().trim();

  // 1. Direct domain match
  if (cleanItemDomain && cleanTarget && cleanItemDomain === cleanTarget) return true;

  // 2. Subdomain match (e.g. login.instagram.com <-> instagram.com)
  if (cleanItemDomain && cleanTarget && (
    cleanItemDomain.endsWith(`.${cleanTarget}`) ||
    cleanTarget.endsWith(`.${cleanItemDomain}`)
  )) return true;

  // 3. Root brand match (e.g. root "instagram" matches root "instagram")
  if (targetRoot && itemRoot && targetRoot === itemRoot) return true;

  // 4. Title contains target root (e.g. Title "Instagram", targetRoot "instagram")
  if (targetRoot && titleLower.includes(targetRoot)) return true;

  // 5. Target domain contains title (e.g. target "instagram.com" contains title "instagram")
  if (titleLower.length >= 3 && cleanTarget.includes(titleLower)) return true;

  return false;
}

function generateRandomCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const num = (arr[0] % 900000) + 100000;
  return num.toString();
}

export interface CompanionBridgeOptions {
  isUnlocked?: boolean;
  items: DecryptedRecord[];
}

export interface CompanionBridgeHook {
  isPaired: boolean;
  pairingCode: string;
  regeneratePairingCode: () => string;
  unpair: () => void;
}

export function useCompanionBridge(arg: DecryptedRecord[] | CompanionBridgeOptions): CompanionBridgeHook {
  const isUnlocked = Array.isArray(arg) ? true : !!arg.isUnlocked;
  const items = Array.isArray(arg) ? arg : (arg.items || []);

  const [pairingCode, setPairingCode] = useState<string>(() => generateRandomCode());
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const sessionTokenRef = useRef<string | null>(sessionToken);
  sessionTokenRef.current = sessionToken;

  const pairingCodeRef = useRef<string>(pairingCode);
  pairingCodeRef.current = pairingCode;

  const regeneratePairingCode = useCallback(() => {
    const newCode = generateRandomCode();
    setPairingCode(newCode);
    return newCode;
  }, []);

  const unpair = useCallback(() => {
    setSessionToken(null);
    regeneratePairingCode();
  }, [regeneratePairingCode]);

  // When vault locks, wipe session pairing token immediately
  useEffect(() => {
    if (!isUnlocked) {
      setSessionToken(null);
    }
  }, [isUnlocked]);

  useEffect(() => {
    (window as any).__MOUNTAIN_SPA_LOADED__ = true;
    (window as any).__MOUNTAIN_SPA_UNLOCKED__ = isUnlocked;

    const targetOrigin = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '*';

    const broadcastStatus = () => {
      window.postMessage(
        {
          source: 'MOUNTAIN_SPA',
          type: 'VAULT_STATUS_BROADCAST',
          unlocked: isUnlocked,
          isPaired: !!sessionTokenRef.current,
          itemCount: isUnlocked ? items.length : 0,
        },
        targetOrigin
      );
    };

    broadcastStatus();

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'MOUNTAIN_EXTENSION_CONTENT_SCRIPT') {
        return;
      }

      const { action, requestId, domain, options, code, token } = event.data;

      switch (action) {
        case 'PING':
        case 'CHECK_STATUS': {
          window.postMessage(
            {
              source: 'MOUNTAIN_SPA',
              type: 'PONG',
              requestId,
              unlocked: isUnlocked,
              isPaired: !!sessionTokenRef.current,
              itemCount: isUnlocked ? items.length : 0,
            },
            targetOrigin
          );
          break;
        }

        case 'PAIR_WITH_CODE': {
          if (!isUnlocked) {
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

          const cleanedInput = String(code || '').replace(/\D/g, '');
          const cleanedCurrent = pairingCodeRef.current.replace(/\D/g, '');

          if (cleanedInput && cleanedInput === cleanedCurrent) {
            const newToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
            setSessionToken(newToken);
            sessionTokenRef.current = newToken;

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
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'PAIR_RESPONSE',
                requestId,
                success: false,
                error: 'INVALID_PAIRING_CODE',
              },
              targetOrigin
            );
          }
          break;
        }

        case 'UNPAIR': {
          setSessionToken(null);
          sessionTokenRef.current = null;
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
                unlocked: isUnlocked,
                error: 'UNAUTHORIZED_NOT_PAIRED',
                logins: [],
              },
              targetOrigin
            );
            break;
          }

          if (!targetDomain || !isUnlocked) {
            window.postMessage(
              {
                source: 'MOUNTAIN_SPA',
                type: 'LOGINS_RESPONSE',
                requestId,
                domain: targetDomain,
                unlocked: isUnlocked,
                logins: [],
              },
              targetOrigin
            );
            break;
          }

          // Strict domain-scoped credential matching
          const matchingLogins = items
            .filter((rec) => rec.item.type === 'LOGIN' && (rec.secret?.password || rec.secret?.username))
            .filter((rec) => matchesDomainOrTitle(rec.secret?.url || '', rec.item.title || '', targetDomain))
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
                unlocked: isUnlocked,
                error: 'UNAUTHORIZED_NOT_PAIRED',
                cards: [],
              },
              targetOrigin
            );
            break;
          }

          if (!isUnlocked) {
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

          const cards = items
            .filter((rec) => rec.item.type === 'CARD' && rec.secret?.cardNumber)
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

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      (window as any).__MOUNTAIN_SPA_UNLOCKED__ = false;
      window.removeEventListener('message', handleMessage);
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
  }, [isUnlocked, items, regeneratePairingCode]);

  return {
    isPaired: !!sessionToken,
    pairingCode,
    regeneratePairingCode,
    unpair,
  };
}
