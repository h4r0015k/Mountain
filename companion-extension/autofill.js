/**
 * Mountain Companion - Content Script
 * Handles context menu actions, keyboard shortcut (Cmd+Shift+L), and React-compatible input filling.
 */

(() => {
  // Skip execution on Mountain SPA dev / app tabs (allow test / demo pages)
  const isTestPage = window.location.pathname.includes('test-page') || window.location.pathname.includes('demo');
  if (!isTestPage) {
    const host = window.location.hostname;
    const port = window.location.port;
    if (
      ((host === 'localhost' || host === '127.0.0.1') && ['5173', '4173', '3000'].includes(port)) ||
      document.title.toLowerCase().startsWith('mountain —')
    ) {
      return;
    }
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

    if (message.action === 'SHOW_SAVE_PROMPT') {
      showSavePrompt(message.credential);
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

  // ------------------ AUTO-SAVE LOGINS ON FORM SUBMISSION ------------------

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[m]));
  }

  function showSavePrompt(credential) {
    if (!credential || !credential.password) return;

    // Remove any existing save prompt
    const existing = document.getElementById('mountain-save-prompt-host');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'mountain-save-prompt-host';
    host.style.cssText = 'position:fixed!important;top:16px!important;right:16px!important;z-index:2147483647!important;';

    const shadow = host.attachShadow({ mode: 'open' });

    const isUpdate = !!credential.isUpdate;
    const domain = credential.domain || window.location.hostname;
    const username = credential.username || '';
    const password = credential.password || '';

    const container = document.createElement('div');
    container.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .prompt-card {
          width: 320px;
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 14px;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #f4f4f5;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
          animation: mountain-slide-down 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          user-select: none;
        }
        @keyframes mountain-slide-down {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mountain-fade-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-8px) scale(0.97); }
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-box {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #18181b;
          border: 1px solid #3f3f46;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .title {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.01em;
        }
        .badge {
          font-size: 10px;
          font-family: ui-monospace, monospace;
          background: #27272a;
          color: #a1a1aa;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .close-btn:hover {
          color: #ffffff;
          background: #27272a;
        }
        .question {
          font-size: 12px;
          color: #a1a1aa;
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .question strong {
          color: #f4f4f5;
        }
        .fields-box {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
        .field-val {
          color: #e4e4e7;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }
        .field-label {
          color: #71717a;
          font-size: 10px;
          text-transform: uppercase;
        }
        .toggle-btn {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          font-size: 11px;
          padding: 2px 4px;
        }
        .toggle-btn:hover {
          color: #ffffff;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-save {
          flex: 1;
          padding: 8px 12px;
          background: #f4f4f5;
          color: #09090b;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.05s;
          text-align: center;
        }
        .btn-save:hover {
          background: #ffffff;
        }
        .btn-save:active {
          transform: scale(0.98);
        }
        .btn-dismiss {
          padding: 8px 12px;
          background: #18181b;
          border: 1px solid #27272a;
          color: #a1a1aa;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .btn-dismiss:hover {
          background: #27272a;
          color: #ffffff;
        }
      </style>
      <div class="prompt-card">
        <div class="header">
          <div class="brand">
            <div class="logo-box">
              <svg width="14" height="14" viewBox="0 0 32 32" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5 L12 17.5" opacity="0.45"/>
                <path d="M16.5 13.5 L21 8.5 L29 25 H22"/>
                <path d="M10.2 25 H3 L12 5 L22 25 H13.8 L13.2 21.2 A 1.8 1.8 0 1 0 10.8 21.2 L10.2 25 Z"/>
              </svg>
            </div>
            <span class="title">Mountain</span>
            <span class="badge">${isUpdate ? 'Update' : 'New'}</span>
          </div>
          <button class="close-btn" title="Close">✕</button>
        </div>
        <div class="question">
          ${isUpdate ? 'Update saved password for' : 'Save password for'} <strong>${escapeHtml(domain)}</strong> to Mountain?
        </div>
        <div class="fields-box">
          <div class="field-row">
            <span class="field-val">${escapeHtml(username || '(No username)')}</span>
            <span class="field-label">user</span>
          </div>
          <div class="field-row">
            <span class="field-val pass-text">${'•'.repeat(Math.min(password.length, 14))}</span>
            <button class="toggle-btn" title="Toggle visibility">show</button>
          </div>
        </div>
        <div class="actions">
          <button class="btn-save">${isUpdate ? 'Update Password' : 'Save to Mountain'}</button>
          <button class="btn-dismiss">Not Now</button>
        </div>
      </div>
    `;

    shadow.appendChild(container);
    document.documentElement.appendChild(host);

    function closePrompt() {
      const card = shadow.querySelector('.prompt-card');
      if (card) {
        card.style.animation = 'mountain-fade-out 0.18s forwards';
        setTimeout(() => host.remove(), 180);
      } else {
        host.remove();
      }
    }

    // Toggle password visibility
    const toggleBtn = shadow.querySelector('.toggle-btn');
    const passText = shadow.querySelector('.pass-text');
    let showing = false;
    toggleBtn.addEventListener('click', () => {
      showing = !showing;
      passText.textContent = showing ? password : '•'.repeat(Math.min(password.length, 14));
      toggleBtn.textContent = showing ? 'hide' : 'show';
    });

    // Save button click
    const saveBtn = shadow.querySelector('.btn-save');
    saveBtn.addEventListener('click', () => {
      saveBtn.textContent = 'Saving...';
      saveBtn.disabled = true;

      chrome.runtime.sendMessage({
        action: 'SAVE_LOGIN_CONFIRMED',
        domain,
        url: credential.url || window.location.href,
        username,
        password,
        title: credential.title || domain,
      }, (res) => {
        if (res && res.success) {
          saveBtn.textContent = '✓ Saved to Mountain!';
          saveBtn.style.background = '#10b981';
          saveBtn.style.color = '#ffffff';
          setTimeout(() => closePrompt(), 1200);
        } else {
          saveBtn.textContent = 'Failed to save';
          saveBtn.style.background = '#e11d48';
          saveBtn.style.color = '#ffffff';
          setTimeout(() => closePrompt(), 2000);
        }
      });
    });

    // Dismiss buttons
    shadow.querySelector('.btn-dismiss').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'DISMISS_SAVE_LOGIN' }).catch(() => {});
      closePrompt();
    });

    shadow.querySelector('.close-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'DISMISS_SAVE_LOGIN' }).catch(() => {});
      closePrompt();
    });

    // Auto-dismiss after 15s if ignored
    setTimeout(() => {
      if (document.documentElement.contains(host)) {
        closePrompt();
      }
    }, 15000);
  }

  // Real-time credential observation buffer
  // Critical for modern SPAs (Instagram, Meta, etc.) that clear or encrypt
  // the password field on button click before/during submit.
  let observedCredentials = {
    username: '',
    password: '',
    timestamp: 0,
  };

  function updateObservedCredentials(input) {
    if (!input) return;
    if (input.type === 'password' && input.value) {
      observedCredentials.password = input.value;
      observedCredentials.timestamp = Date.now();
      const userInput = findAssociatedUsernameInput(input);
      if (userInput && userInput.value) {
        observedCredentials.username = userInput.value.trim();
      }
    } else if (input.type === 'text' || input.type === 'email' || input.name?.toLowerCase().includes('user')) {
      if (input.value && input.value.trim()) {
        observedCredentials.username = input.value.trim();
      }
    }
  }

  document.addEventListener('input', (e) => {
    if (e.target && e.target.tagName === 'INPUT') {
      updateObservedCredentials(e.target);
    }
  }, true);

  document.addEventListener('change', (e) => {
    if (e.target && e.target.tagName === 'INPUT') {
      updateObservedCredentials(e.target);
    }
  }, true);

  // Intercept form submissions
  let lastSubmitTime = 0;
  function handleFormCapture(formOrInput) {
    const now = Date.now();
    if (now - lastSubmitTime < 800) return; // Debounce rapid triggers
    lastSubmitTime = now;

    let container = formOrInput;
    if (container && (container.tagName === 'INPUT' || container.tagName === 'BUTTON')) {
      container = container.form || container.closest('form') || document;
    }

    let passwordVal = '';
    let usernameVal = '';

    // 1. Try to read active non-empty password input in container
    const passInputs = Array.from(
      (container || document).querySelectorAll('input[type="password"]')
    ).filter((input) => input.value && input.value.length >= 1);

    if (passInputs.length > 0) {
      passwordVal = passInputs[0].value;
      const userInput = findAssociatedUsernameInput(passInputs[0]);
      usernameVal = userInput ? userInput.value.trim() : '';
    }

    // 2. SPA fallback: If field was just wiped by site script (e.g. Instagram login AJAX), use observed buffer
    if (!passwordVal && observedCredentials.password && (now - observedCredentials.timestamp < 120000)) {
      passwordVal = observedCredentials.password;
      if (!usernameVal) {
        usernameVal = observedCredentials.username;
      }
    }

    if (!usernameVal && observedCredentials.username) {
      usernameVal = observedCredentials.username;
    }

    if (!passwordVal) {
      return;
    }

    const pageDomain = window.location.hostname || (window.location.protocol === 'file:' ? 'local-test' : 'localhost');

    chrome.runtime.sendMessage({
      action: 'SUBMIT_CREDENTIALS',
      domain: pageDomain,
      url: window.location.href,
      username: usernameVal,
      password: passwordVal,
    }, (res) => {
      if (res && res.shouldPrompt) {
        showSavePrompt({
          domain: res.domain || pageDomain,
          url: res.url || window.location.href,
          username: res.username || usernameVal,
          password: res.password || passwordVal,
          isUpdate: !!res.isUpdate,
          title: res.title,
        });
      } else if (res?.alreadySaved) {
        showToast('Mountain: Credentials already up to date in vault ✓', 'success');
      } else if (res?.reason === 'NOT_PAIRED_OR_NO_TAB') {
        showToast('Mountain: Please open & pair vault to auto-save', 'error');
      } else if (res?.reason === 'VAULT_LOCKED') {
        showToast('Mountain: Unlock vault in Mountain tab to auto-save', 'error');
      }
    });
  }

  // 1. Form Submit event
  document.addEventListener('submit', (e) => {
    handleFormCapture(e.target);
  }, true);

  // 2. Enter key on password/input field
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target && (e.target.type === 'password' || e.target.type === 'text' || e.target.type === 'email')) {
      updateObservedCredentials(e.target);
      handleFormCapture(e.target);
    }
  }, true);

  // 3. Pointer/Mouse down on submit button - cache immediately before site handlers run
  document.addEventListener('mousedown', (e) => {
    const btn = e.target?.closest?.('button, input[type="submit"], [role="button"]');
    if (btn) {
      const activePass = document.querySelector('input[type="password"]');
      if (activePass && activePass.value) {
        updateObservedCredentials(activePass);
      }
    }
  }, true);

  // 4. Submit button clicks
  document.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('button, input[type="submit"], [role="button"]');
    if (btn) {
      const isSubmitType = btn.type === 'submit' || !btn.type || btn.getAttribute('role') === 'button';
      const text = (btn.textContent || btn.value || '').trim().toLowerCase();
      const submitKeywords = [
        'log in', 'login', 'sign in', 'signin', 'submit', 'sign up', 'signup',
        'register', 'continue', 'next', 'save', 'entrar', 'connexion', 'iniciar'
      ];
      const isSubmitText = submitKeywords.some((kw) => text.includes(kw));
      if (isSubmitType || isSubmitText) {
        handleFormCapture(btn);
      }
    }
  }, true);

  // Check if this tab had a pending save (e.g. redirected after login form submission)
  setTimeout(() => {
    chrome.runtime.sendMessage({ action: 'CHECK_PENDING_SAVE' }, (res) => {
      if (res && res.hasPending && res.credential) {
        showSavePrompt(res.credential);
      }
    });
  }, 400);
})();
