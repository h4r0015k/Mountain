/**
 * Mountain Companion - Background Service Worker
 * Coordinates requests between website autofill content scripts,
 * context menus, extension popup, and the active Mountain SPA tab.
 *
 * Implements session token pairing authentication to guarantee that
 * only the explicitly authorized companion extension can request logins.
 */

let activeSpaTabId = null;
let activeSessionToken = null;
let lastKnownStatus = {
  unlocked: false,
  isPaired: false,
  itemCount: 0,
  lastChecked: 0,
};

async function getStoredToken() {
  if (activeSessionToken) return activeSessionToken;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const data = await chrome.storage.session.get(['mountain_session_token']);
      if (data && data.mountain_session_token) {
        activeSessionToken = data.mountain_session_token;
        return activeSessionToken;
      }
    }
  } catch {}
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(['mountain_session_token']);
      if (data && data.mountain_session_token) {
        activeSessionToken = data.mountain_session_token;
        return activeSessionToken;
      }
    }
  } catch {}
  return null;
}

async function setStoredToken(token) {
  activeSessionToken = token;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      if (token) {
        await chrome.storage.session.set({ mountain_session_token: token });
      } else {
        await chrome.storage.session.remove(['mountain_session_token']);
      }
    }
  } catch {}
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      if (token) {
        await chrome.storage.local.set({ mountain_session_token: token });
      } else {
        await chrome.storage.local.remove(['mountain_session_token']);
      }
    }
  } catch {}
}

async function getStoredSpaTabId() {
  if (activeSpaTabId) {
    try {
      const tab = await chrome.tabs.get(activeSpaTabId);
      if (tab && tab.id && isCandidateMountainTab(tab)) return tab.id;
    } catch {
      activeSpaTabId = null;
    }
  }
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const data = await chrome.storage.session.get(['mountain_spa_tab_id']);
      if (data && data.mountain_spa_tab_id) {
        const tab = await chrome.tabs.get(data.mountain_spa_tab_id);
        if (tab && tab.id && isCandidateMountainTab(tab)) {
          activeSpaTabId = tab.id;
          return tab.id;
        }
      }
    }
  } catch {}
  return null;
}

async function setStoredSpaTabId(tabId) {
  activeSpaTabId = tabId;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      if (tabId) {
        await chrome.storage.session.set({ mountain_spa_tab_id: tabId });
      } else {
        await chrome.storage.session.remove(['mountain_spa_tab_id']);
      }
    }
  } catch {}
}

// Map of tabId -> { domain, url, username, password, timestamp, isUpdate, title }
const pendingLogins = new Map();

// Tab lifecycle cleanup for pending save logins
chrome.tabs.onRemoved.addListener((tabId) => {
  pendingLogins.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete' && pendingLogins.has(tabId)) {
    const pending = pendingLogins.get(tabId);
    if (Date.now() - pending.timestamp < 60000) {
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: 'SHOW_SAVE_PROMPT', credential: pending }).catch(() => {});
      }, 600);
    } else {
      pendingLogins.delete(tabId);
    }
  }
});

function generateFallbackPassword(length = 20) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+-=";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'mountain-root',
      title: 'Mountain Vault',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'mountain-autofill',
      parentId: 'mountain-root',
      title: '🔑 Auto-fill Login (Cmd+Shift+L)',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'mountain-generate',
      parentId: 'mountain-root',
      title: '✨ Generate & Fill Strong Password',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'mountain-sep',
      parentId: 'mountain-root',
      type: 'separator',
      contexts: ['editable'],
    });

    chrome.contextMenus.create({
      id: 'mountain-open',
      parentId: 'mountain-root',
      title: '🏔️ Open Mountain Dashboard',
      contexts: ['editable'],
    });
  });
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
setupContextMenus();

function isCandidateMountainTab(tab) {
  if (!tab) return false;
  const url = (tab.url || tab.pendingUrl || '').toLowerCase();
  const title = (tab.title || '').toLowerCase().trim();

  // Explicitly ignore test page, demo pages, and internal extension pages
  if (
    url.includes('test-page') ||
    url.includes('/companion-extension/') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome://') ||
    url.startsWith('about:')
  ) {
    return false;
  }

  // Exact dev server ports
  const isDevHost =
    url.includes('localhost:5173') ||
    url.includes('127.0.0.1:5173') ||
    url.includes('localhost:4173') ||
    url.includes('127.0.0.1:4173') ||
    url.includes('localhost:3000') ||
    url.includes('127.0.0.1:3000');

  if (isDevHost) {
    return true;
  }

  // Official Mountain app title prefix
  if (title.startsWith('mountain —') || title.startsWith('mountain -') || title === 'mountain') {
    return true;
  }

  return false;
}

async function findMountainTab() {
  const existingTabId = await getStoredSpaTabId();
  if (existingTabId) return existingTabId;

  const tabs = await chrome.tabs.query({});

  // 1. Highest priority: Tab with Mountain title (excluding test page)
  for (const tab of tabs) {
    if (!isCandidateMountainTab(tab)) continue;
    const title = (tab.title || '').toLowerCase().trim();
    if (title.startsWith('mountain —') || title.startsWith('mountain -') || title === 'mountain') {
      await setStoredSpaTabId(tab.id);
      return tab.id;
    }
  }

  // 2. Second priority: Dev server ports or loopback (excluding test page)
  for (const tab of tabs) {
    if (!isCandidateMountainTab(tab)) continue;
    await setStoredSpaTabId(tab.id);
    return tab.id;
  }

  return null;
}

async function sendToMountainSpa(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['spa-bridge.js'],
      });
      await new Promise((resolve) => setTimeout(resolve, 150));
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (injectErr) {
      throw injectErr;
    }
  }
}

// Right-Click Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'mountain-autofill') {
    const tabId = await findMountainTab();
    if (!tabId) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'SHOW_TOAST',
        message: 'Mountain tab not open (open localhost:5173)',
        type: 'error',
      }).catch(() => {});
      return;
    }

    const token = await getStoredToken();
    if (!token) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'SHOW_TOAST',
        message: 'Extension not paired with Mountain. Click icon in toolbar to pair.',
        type: 'error',
      }).catch(() => {});
      return;
    }

    try {
      let hostname = '';
      try {
        hostname = new URL(tab.url).hostname;
      } catch {
        hostname = tab.url;
      }

      const response = await sendToMountainSpa(tabId, {
        target: 'MOUNTAIN_SPA',
        action: 'GET_LOGINS',
        domain: hostname,
        token,
      });

      if (response && response.error === 'UNAUTHORIZED_NOT_PAIRED') {
        await setStoredToken(null);
        chrome.tabs.sendMessage(tab.id, {
          action: 'SHOW_TOAST',
          message: 'Companion session expired. Please re-pair in extension popup.',
          type: 'error',
        }).catch(() => {});
        return;
      }

      const isUnlocked = response?.unlocked !== undefined ? !!response.unlocked : (Array.isArray(response?.logins) && response.logins.length > 0);

      if (response && isUnlocked && response.logins && response.logins.length > 0) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'FILL_LOGIN',
          login: response.logins[0],
        }).catch(() => {});
      } else if (response && !isUnlocked) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'SHOW_TOAST',
          message: 'Mountain vault is locked. Unlock in Mountain tab.',
          type: 'error',
        }).catch(() => {});
      } else {
        chrome.tabs.sendMessage(tab.id, {
          action: 'SHOW_TOAST',
          message: `No saved credentials found for ${hostname}`,
          type: 'error',
        }).catch(() => {});
      }
    } catch {
      chrome.tabs.sendMessage(tab.id, {
        action: 'SHOW_TOAST',
        message: 'Failed to communicate with Mountain tab',
        type: 'error',
      }).catch(() => {});
    }
  }

  if (info.menuItemId === 'mountain-generate') {
    const tabId = await findMountainTab();
    const token = await getStoredToken();
    let pwd = null;
    if (tabId && token) {
      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'GENERATE_PASSWORD',
          token,
        });
        if (response && response.password) pwd = response.password;
      } catch {}
    }
    if (!pwd) {
      pwd = generateFallbackPassword(20);
    }

    chrome.tabs.sendMessage(tab.id, {
      action: 'FILL_PASSWORD_ONLY',
      password: pwd,
    }).catch(() => {});
  }

  if (info.menuItemId === 'mountain-open') {
    const existingTabId = await findMountainTab();
    if (existingTabId) {
      chrome.tabs.update(existingTabId, { active: true });
    } else {
      chrome.tabs.create({ url: 'http://localhost:5173' });
    }
  }
});

// Message Routing for Popup & In-Tab Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  if (message.action === 'REGISTER_SPA_TAB' || message.action === 'UPDATE_VAULT_STATUS') {
    (async () => {
      if (sender.tab && sender.tab.id) {
        activeSpaTabId = sender.tab.id;
        await setStoredSpaTabId(sender.tab.id);
      }
      const token = await getStoredToken();
      if (message.unlocked !== undefined) {
        lastKnownStatus.unlocked = !!message.unlocked;
        lastKnownStatus.isPaired = !!token;
        lastKnownStatus.itemCount = message.itemCount || 0;
        lastKnownStatus.lastChecked = Date.now();
      }
      sendResponse({ acknowledged: true, tabId: activeSpaTabId });
    })();
    return true;
  }

  if (message.action === 'OPEN_MOUNTAIN') {
    (async () => {
      const existingTabId = await findMountainTab();
      if (existingTabId) {
        await chrome.tabs.update(existingTabId, { active: true });
        sendResponse({ success: true, tabId: existingTabId });
      } else {
        const newTab = await chrome.tabs.create({ url: 'http://localhost:5173' });
        activeSpaTabId = newTab.id;
        await setStoredSpaTabId(newTab.id);
        sendResponse({ success: true, tabId: newTab.id });
      }
    })();
    return true;
  }

  if (message.action === 'SUBMIT_PAIRING_CODE') {
    (async () => {
      const tabId = await findMountainTab();
      if (!tabId) {
        sendResponse({ success: false, error: 'Mountain tab not found' });
        return;
      }

      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'PAIR_WITH_CODE',
          code: message.code,
        });

        if (response && response.success && response.sessionToken) {
          await setStoredToken(response.sessionToken);
          await setStoredSpaTabId(tabId);
          lastKnownStatus.isPaired = true;
          sendResponse({ success: true, isPaired: true });
        } else {
          sendResponse({ success: false, error: response?.error || 'Invalid code' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Failed to connect to Mountain' });
      }
    })();
    return true;
  }

  if (message.action === 'UNPAIR') {
    (async () => {
      const tabId = await findMountainTab();
      if (tabId) {
        try {
          await sendToMountainSpa(tabId, {
            target: 'MOUNTAIN_SPA',
            action: 'UNPAIR',
          });
        } catch {}
      }
      await setStoredToken(null);
      lastKnownStatus.isPaired = false;
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === 'CHECK_STATUS') {
    (async () => {
      const tabId = await findMountainTab();
      if (!tabId) {
        sendResponse({
          connected: false,
          unlocked: false,
          isPaired: false,
          message: 'Mountain tab not open',
        });
        return;
      }

      const token = await getStoredToken();

      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'CHECK_STATUS',
        });

        if (response && response.unlocked !== undefined) {
          lastKnownStatus.unlocked = !!response.unlocked;
          lastKnownStatus.isPaired = !!token;
          lastKnownStatus.itemCount = response.itemCount || 0;
          lastKnownStatus.lastChecked = Date.now();
          sendResponse({
            connected: true,
            unlocked: !!response.unlocked,
            isPaired: !!token,
            count: response.itemCount || 0,
          });
        } else if (response && response.error) {
          sendResponse({
            connected: false,
            unlocked: false,
            isPaired: false,
            message: response.error,
          });
        } else {
          sendResponse({
            connected: true,
            unlocked: false,
            isPaired: false,
            message: 'Mountain is locked',
          });
        }
      } catch (err) {
        sendResponse({
          connected: false,
          unlocked: false,
          isPaired: false,
          message: err.message || 'Could not connect to Mountain tab',
        });
      }
    })();
    return true;
  }

  if (message.action === 'GET_LOGINS') {
    (async () => {
      const tabId = await findMountainTab();
      if (!tabId) {
        sendResponse({ connected: false, unlocked: false, isPaired: false, logins: [] });
        return;
      }

      const token = await getStoredToken();
      if (!token) {
        sendResponse({ connected: true, unlocked: true, isPaired: false, error: 'NOT_PAIRED', logins: [] });
        return;
      }

      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'GET_LOGINS',
          domain: message.domain,
          token,
        });

        if (response && response.error === 'UNAUTHORIZED_NOT_PAIRED') {
          await setStoredToken(null);
          lastKnownStatus.isPaired = false;
          sendResponse({ connected: true, unlocked: true, isPaired: false, error: 'UNAUTHORIZED_NOT_PAIRED', logins: [] });
          return;
        }

        const isUnlocked = response?.unlocked !== undefined ? !!response.unlocked : true;
        sendResponse({
          connected: true,
          unlocked: isUnlocked,
          isPaired: true,
          logins: response?.logins || [],
        });
      } catch (err) {
        sendResponse({ connected: false, unlocked: false, isPaired: false, logins: [], error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'GENERATE_PASSWORD') {
    (async () => {
      const tabId = await findMountainTab();
      const token = await getStoredToken();
      if (tabId && token) {
        try {
          const response = await sendToMountainSpa(tabId, {
            target: 'MOUNTAIN_SPA',
            action: 'GENERATE_PASSWORD',
            token,
            options: message.options,
          });
          if (response && response.password) {
            sendResponse({ password: response.password, source: 'MOUNTAIN_SPA' });
            return;
          }
        } catch {}
      }

      const pwd = generateFallbackPassword(message.options?.length || 20);
      sendResponse({ password: pwd, source: 'LOCAL_CSPRNG' });
    })();
    return true;
  }

  if (message.action === 'SUBMIT_CREDENTIALS') {
    (async () => {
      const tabId = await findMountainTab();
      const token = await getStoredToken();
      if (!tabId || !token) {
        sendResponse({ shouldPrompt: false, reason: 'NOT_PAIRED_OR_NO_TAB' });
        return;
      }

      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'CHECK_CREDENTIAL_STATUS',
          domain: message.domain,
          username: message.username,
          password: message.password,
          token,
        });

        if (response && response.canSave) {
          const tabKey = sender.tab?.id || message.tabId;
          const pendingItem = {
            domain: message.domain,
            url: message.url,
            username: message.username,
            password: message.password,
            isUpdate: !!response.isUpdate,
            title: response.title || message.domain,
            timestamp: Date.now(),
          };

          if (tabKey) {
            pendingLogins.set(tabKey, pendingItem);
          }

          sendResponse({
            shouldPrompt: true,
            isUpdate: !!response.isUpdate,
            title: response.title || message.domain,
            username: message.username,
            password: message.password,
            domain: message.domain,
            url: message.url,
          });
        } else if (response && response.error === 'UNAUTHORIZED_NOT_PAIRED') {
          await setStoredToken(null);
          sendResponse({ shouldPrompt: false, reason: 'NOT_PAIRED_OR_NO_TAB' });
        } else if (response && response.unlocked === false) {
          sendResponse({ shouldPrompt: false, reason: 'VAULT_LOCKED' });
        } else if (response && response.isSamePassword) {
          sendResponse({ shouldPrompt: false, alreadySaved: true });
        } else {
          sendResponse({ shouldPrompt: false, reason: response?.error || 'CANNOT_SAVE' });
        }
      } catch (err) {
        sendResponse({ shouldPrompt: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'CHECK_PENDING_SAVE') {
    const tabKey = sender.tab?.id;
    if (tabKey && pendingLogins.has(tabKey)) {
      const pending = pendingLogins.get(tabKey);
      if (Date.now() - pending.timestamp < 60000) {
        sendResponse({ hasPending: true, credential: pending });
        return false;
      } else {
        pendingLogins.delete(tabKey);
      }
    }
    sendResponse({ hasPending: false });
    return false;
  }

  if (message.action === 'SAVE_LOGIN_CONFIRMED') {
    (async () => {
      const tabKey = sender.tab?.id;
      if (tabKey) {
        pendingLogins.delete(tabKey);
      }

      const tabId = await findMountainTab();
      const token = await getStoredToken();
      if (!tabId || !token) {
        sendResponse({ success: false, error: 'Mountain tab not open or extension not paired' });
        return;
      }

      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'SAVE_LOGIN',
          domain: message.domain,
          url: message.url,
          username: message.username,
          password: message.password,
          title: message.title,
          token,
        });

        sendResponse({ success: !!response?.success, id: response?.id });
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Save failed' });
      }
    })();
    return true;
  }

  if (message.action === 'DISMISS_SAVE_LOGIN') {
    const tabKey = sender.tab?.id;
    if (tabKey) {
      pendingLogins.delete(tabKey);
    }
    sendResponse({ success: true });
    return false;
  }

  return false;
});
