/**
 * Mountain Companion - SPA Bridge Content Script
 *
 * Runs inside Mountain SPA tabs.
 * Acts as the bidirectional conduit between the Mountain SPA (window.postMessage)
 * and the extension background service worker (chrome.runtime).
 */

(() => {
  if (window.__MOUNTAIN_BRIDGE_INITIALIZED__) return;
  window.__MOUNTAIN_BRIDGE_INITIALIZED__ = true;

  // Pending callbacks waiting for SPA response
  const pendingRequests = new Map();

  // Listen for messages from Mountain SPA in the page world
  window.addEventListener('message', (event) => {
    // Only accept messages explicitly originating from the Mountain SPA
    if (!event.data || event.data.source !== 'MOUNTAIN_SPA') {
      return;
    }

    const data = event.data;

    // If it's a broadcast status update or a PONG response
    if (data.type === 'VAULT_STATUS_BROADCAST' || data.type === 'PONG') {
      try {
        chrome.runtime.sendMessage({
          action: 'REGISTER_SPA_TAB',
          unlocked: !!data.unlocked,
          itemCount: data.itemCount || 0,
          url: window.location.href,
        });
      } catch (err) {
        console.warn('[Mountain Bridge] Could not send REGISTER_SPA_TAB:', err);
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
      chrome.runtime.sendMessage({
        action: 'SPA_MESSAGE',
        payload: data,
      });
    } catch {}
  });

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
  const isLikelyMountain =
    !pathname.includes('test-page') &&
    !pathname.includes('/companion-extension/') &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      document.title.toLowerCase().startsWith('mountain —') ||
      document.title.toLowerCase() === 'mountain');

  if (isLikelyMountain) {
    // Send probe after slight delay to ensure React listeners are bound
    const sendProbe = () => {
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
    setTimeout(sendProbe, 500);
  }
})();
