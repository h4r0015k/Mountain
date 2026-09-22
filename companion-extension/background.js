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

async function findMountainTab() {
  if (activeSpaTabId) {
    try {
      const tab = await chrome.tabs.get(activeSpaTabId);
      if (tab && tab.id) return tab.id;
    } catch {
      activeSpaTabId = null;
    }
  }

  const tabs = await chrome.tabs.query({});

  // 1. Exact dev server ports
  for (const tab of tabs) {
    const url = (tab.url || tab.pendingUrl || '').toLowerCase();
    if (
      url.includes('localhost:5173') ||
      url.includes('127.0.0.1:5173') ||
      url.includes('localhost:4173') ||
      url.includes('127.0.0.1:4173') ||
      url.includes('localhost:3000') ||
      url.includes('127.0.0.1:3000')
    ) {
      activeSpaTabId = tab.id;
      return tab.id;
    }
  }

  // 2. Loopback with Mountain in title
  for (const tab of tabs) {
    const url = (tab.url || tab.pendingUrl || '').toLowerCase();
    const title = (tab.title || '').toLowerCase();
    if ((url.includes('localhost') || url.includes('127.0.0.1')) && title.includes('mountain')) {
      activeSpaTabId = tab.id;
      return tab.id;
    }
  }

  // 3. Official Mountain app title prefix
  for (const tab of tabs) {
    const title = (tab.title || '').toLowerCase().trim();
    if (title.startsWith('mountain —') || title.startsWith('mountain -') || title === 'mountain') {
      activeSpaTabId = tab.id;
      return tab.id;
    }
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

    if (!activeSessionToken) {
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
        token: activeSessionToken,
      });

      if (response && response.error === 'UNAUTHORIZED_NOT_PAIRED') {
        activeSessionToken = null;
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
    let pwd = null;
    if (tabId && activeSessionToken) {
      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'GENERATE_PASSWORD',
          token: activeSessionToken,
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
    if (sender.tab && sender.tab.id) {
      activeSpaTabId = sender.tab.id;
    }
    if (message.unlocked !== undefined) {
      lastKnownStatus.unlocked = !!message.unlocked;
      lastKnownStatus.isPaired = !!activeSessionToken;
      lastKnownStatus.itemCount = message.itemCount || 0;
      lastKnownStatus.lastChecked = Date.now();
    }
    sendResponse({ acknowledged: true, tabId: activeSpaTabId });
    return false;
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
          activeSessionToken = response.sessionToken;
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
      activeSessionToken = null;
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

      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'CHECK_STATUS',
        });

        if (response && response.unlocked !== undefined) {
          lastKnownStatus.unlocked = !!response.unlocked;
          lastKnownStatus.isPaired = !!activeSessionToken;
          lastKnownStatus.itemCount = response.itemCount || 0;
          lastKnownStatus.lastChecked = Date.now();
          sendResponse({
            connected: true,
            unlocked: !!response.unlocked,
            isPaired: !!activeSessionToken,
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

      if (!activeSessionToken) {
        sendResponse({ connected: true, unlocked: true, isPaired: false, error: 'NOT_PAIRED', logins: [] });
        return;
      }

      try {
        const response = await sendToMountainSpa(tabId, {
          target: 'MOUNTAIN_SPA',
          action: 'GET_LOGINS',
          domain: message.domain,
          token: activeSessionToken,
        });

        if (response && response.error === 'UNAUTHORIZED_NOT_PAIRED') {
          activeSessionToken = null;
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
      if (tabId && activeSessionToken) {
        try {
          const response = await sendToMountainSpa(tabId, {
            target: 'MOUNTAIN_SPA',
            action: 'GENERATE_PASSWORD',
            token: activeSessionToken,
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

  return false;
});
