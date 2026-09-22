/**
 * Mountain Companion - Content Script
 * Handles context menu actions, keyboard shortcut (Cmd+Shift+L), and React-compatible input filling.
 */

(() => {
  // Skip execution on Mountain SPA dev / app tabs
  const host = window.location.hostname;
  const port = window.location.port;
  if (
    ((host === 'localhost' || host === '127.0.0.1') && ['5173', '4173', '3000'].includes(port)) ||
    document.title.toLowerCase().startsWith('mountain —')
  ) {
    return;
  }

  let lastTargetInput = null;

  function showToast(message, type = 'success') {
    const existing = document.querySelector('.mountain-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'mountain-toast';
    const iconColor = type === 'error' ? '#f43f5e' : '#10b981';
    const iconSymbol = type === 'error' ? '⚠' : '✓';

    toast.innerHTML = `
      <span style="color:${iconColor};font-weight:bold;font-size:14px;">${iconSymbol}</span>
      <span style="line-height:1.4;">${message}</span>
    `;
    document.documentElement.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  /**
   * Sets input value using prototype setter so React/Vue synthetic change trackers fire.
   */
  function setNativeInputValue(input, value) {
    if (!input || value === undefined || value === null) return;
    try {
      const prototype = Object.getPrototypeOf(input);
      const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(input, value);
      } else {
        input.value = value;
      }
    } catch {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /**
   * Discovers the username/email input associated with a password field or form.
   */
  function findAssociatedUsernameInput(relativeInput) {
    const form = relativeInput?.form;
    if (form) {
      const userInputs = form.querySelectorAll(
        'input[type="text"], input[type="email"], input[name*="user" i], input[name*="login" i], input[name*="id" i], input[autocomplete*="username" i], input[autocomplete*="email" i]'
      );
      if (userInputs.length > 0) return userInputs[0];
    }

    const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="checkbox"])'));
    if (relativeInput && allInputs.includes(relativeInput)) {
      const index = allInputs.indexOf(relativeInput);
      if (index > 0) return allInputs[index - 1];
    }

    for (const input of allInputs) {
      const rect = input.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 15) return input;
    }

    return null;
  }

  function executeAutofill(loginItem) {
    const passInput = document.querySelector('input[type="password"]') || (lastTargetInput?.type === 'password' ? lastTargetInput : null);
    const userInput = findAssociatedUsernameInput(passInput || lastTargetInput);

    let filledCount = 0;

    if (userInput && loginItem.username) {
      setNativeInputValue(userInput, loginItem.username);
      filledCount++;
    }

    if (passInput && loginItem.password) {
      setNativeInputValue(passInput, loginItem.password);
      filledCount++;
    } else if (lastTargetInput && lastTargetInput !== userInput && loginItem.password) {
      setNativeInputValue(lastTargetInput, loginItem.password);
      filledCount++;
    }

    if (filledCount > 0) {
      showToast(`Autofilled ${loginItem.title || window.location.hostname} from Mountain`);
    } else {
      showToast('Could not find login fields on this page', 'error');
    }
  }

  // Track the most recently targeted input
  document.addEventListener('contextmenu', (e) => {
    const input = e.target?.closest?.('input, textarea') || (e.target?.tagName === 'INPUT' ? e.target : null);
    if (input) lastTargetInput = input;
  }, true);

  document.addEventListener('focusin', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      lastTargetInput = e.target;
    }
  }, true);

  // Background message listener
  chrome.runtime.onMessage.addListener((message) => {
    if (!message || !message.action) return false;

    if (message.action === 'FILL_LOGIN') {
      executeAutofill(message.login);
      return false;
    }

    if (message.action === 'FILL_PASSWORD_ONLY') {
      const target = lastTargetInput || document.querySelector('input[type="password"]') || document.activeElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setNativeInputValue(target, message.password);
      }
      try {
        navigator.clipboard.writeText(message.password);
      } catch {}
      showToast('Generated password copied to clipboard');
      return false;
    }

    if (message.action === 'SHOW_TOAST') {
      showToast(message.message, message.type);
      return false;
    }

    return false;
  });

  // Global Keyboard Shortcut: Cmd+Shift+L / Ctrl+Shift+L
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
      e.preventDefault();

      chrome.runtime.sendMessage({ action: 'GET_LOGINS', domain: window.location.hostname }, (response) => {
        const isUnlocked = response?.unlocked !== undefined ? !!response.unlocked : (Array.isArray(response?.logins) && response.logins.length > 0);
        if (response && isUnlocked && response.logins && response.logins.length > 0) {
          executeAutofill(response.logins[0]);
        } else if (response && !isUnlocked) {
          showToast('Mountain vault is locked. Unlock in Mountain tab.', 'error');
        } else {
          showToast(`No matching credentials found for ${window.location.hostname}`, 'error');
        }
      });
    }
  });
})();
