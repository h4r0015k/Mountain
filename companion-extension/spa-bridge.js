/**
 * Mountain Companion - SPA Bridge Content Script
 *
 * Runs inside Mountain SPA tabs.
 * Acts as the bidirectional conduit between the Mountain SPA (window.postMessage)
 * and the extension background service worker (chrome.runtime).
 */

(() => {
  const runtimeId = typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime.id : 'default';
  if (window.__MOUNTAIN_BRIDGE_INSTANCES__ && window.__MOUNTAIN_BRIDGE_INSTANCES__[runtimeId]) {
    return;
  }
  window.__MOUNTAIN_BRIDGE_INSTANCES__ = window.__MOUNTAIN_BRIDGE_INSTANCES__ || {};
  window.__MOUNTAIN_BRIDGE_INSTANCES__[runtimeId] = true;

  function isContextValid() {
    try {
      return Boolean(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  // Pending callbacks waiting for SPA response
  const pendingRequests = new Map();

  // Listen for messages from Mountain SPA in the page world
  const handleSpaMessage = (event) => {
    // If extension was reloaded in chrome://extensions, unhook from old tab
    if (!isContextValid()) {
      window.removeEventListener('message', handleSpaMessage);
      return;
    }

    // Only accept messages explicitly originating from this window
    if (event.source !== window) return;
    if (event.origin && event.origin !== window.location.origin && event.origin !== 'null') {
      return;
    }
    if (!event.data || event.data.source !== 'MOUNTAIN_SPA') {
      return;
    }

    const data = event.data;

    // If it's a broadcast status update or a PONG response
    if (data.type === 'VAULT_STATUS_BROADCAST' || data.type === 'PONG') {
      try {
        if (!isContextValid()) {
          window.removeEventListener('message', handleSpaMessage);
          return;
        }
        chrome.runtime.sendMessage(
          {
            action: 'REGISTER_SPA_TAB',
            unlocked: !!data.unlocked,
            itemCount: data.itemCount || 0,
            url: window.location.href,
          },
          () => {
            if (chrome.runtime?.lastError) {
              // Benign: tab or background worker reloaded
            }
          }
        );
      } catch (err) {
        if (err?.message?.includes('Extension context invalidated')) {
          window.removeEventListener('message', handleSpaMessage);
        }
      }
    }

    // If it's a direct response to a pending request from the background worker
    if (data.requestId && pendingRequests.has(data.requestId)) {
      const callback = pendingRequests.get(data.requestId);
      pendingRequests.delete(data.requestId);
      callback(data);
      return;
    }

    // Relay any other SPA messages to background
    try {
      if (isContextValid()) {
        chrome.runtime.sendMessage(
          {
            action: 'SPA_MESSAGE',
            payload: data,
          },
          () => {
            if (chrome.runtime?.lastError) {
              // Ignore
            }
          }
        );
      }
    } catch (err) {
      if (err?.message?.includes('Extension context invalidated')) {
        window.removeEventListener('message', handleSpaMessage);
      }
    }
  };

  window.addEventListener('message', handleSpaMessage);

  // Listen for requests from background service worker (originating from popup or autofill on target tabs)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || request.target !== 'MOUNTAIN_SPA') {
      return false;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Store callback to resolve sendResponse when SPA responds via window.postMessage
    pendingRequests.set(requestId, (spaResponse) => {
      sendResponse(spaResponse);
    });

    // Safety timeout in case Mountain tab is busy or unresponsive
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        sendResponse({ error: 'TIMEOUT_WAITING_FOR_SPA', unlocked: false });
      }
    }, 3500);

    // Forward request down into the page targeting only this exact origin
    const targetOrigin = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '*';

    window.postMessage(
      {
        ...request,
        source: 'MOUNTAIN_EXTENSION_CONTENT_SCRIPT',
        requestId,
      },
      targetOrigin
    );

    return true; // Keep message channel open for async response
  });

  // If this tab looks like a Mountain host, immediately probe if SPA is already mounted
  const pathname = window.location.pathname.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  const port = window.location.port;
  const isLikelyMountain =
    !pathname.includes('test-page') &&
    !pathname.includes('/companion-extension/') &&
    (hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('github.io') ||
      port === '5173' ||
      port === '4173' ||
      pathname.includes('/mountain') ||
      document.title.toLowerCase().includes('mountain'));

  if (isLikelyMountain) {
    // Send probe after slight delay to ensure React listeners are bound
    const sendProbe = () => {
      if (!isContextValid()) return;
      window.postMessage(
        {
          source: 'MOUNTAIN_EXTENSION_CONTENT_SCRIPT',
          action: 'PING',
          requestId: 'init_probe_' + Date.now(),
        },
        '*'
      );
    };

    sendProbe();
    setTimeout(sendProbe, 300);
    setTimeout(sendProbe, 800);
    setTimeout(sendProbe, 1800);
    window.addEventListener('load', () => setTimeout(sendProbe, 100), { once: true });
  }
})();
