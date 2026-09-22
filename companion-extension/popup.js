/**
 * Mountain Companion - Popup Controller
 * Manages pairing code authorization and connection state.
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('conn-status');
  const pairingSection = document.getElementById('pairing-section');
  const activeSection = document.getElementById('active-section');
  const offlineSection = document.getElementById('offline-section');

  const codeInput = document.getElementById('pairing-code-input');
  const pairBtn = document.getElementById('pair-btn');
  const pairError = document.getElementById('pair-error');
  const unpairBtn = document.getElementById('unpair-btn');

  const openMountainBtn = document.getElementById('open-mountain-btn');
  const openMountainUnpairedBtn = document.getElementById('open-mountain-unpaired-btn');
  const openMountainOfflineBtn = document.getElementById('open-mountain-offline-btn');

  function showSection(section) {
    pairingSection.style.display = section === 'pairing' ? 'block' : 'none';
    activeSection.style.display = section === 'active' ? 'block' : 'none';
    offlineSection.style.display = section === 'offline' ? 'block' : 'none';
  }

  function checkStatus() {
    chrome.runtime.sendMessage({ action: 'CHECK_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        statusEl.className = 'status-badge status-offline';
        statusEl.textContent = 'Error';
        showSection('offline');
        return;
      }

      if (response && response.connected && response.unlocked) {
        if (response.isPaired) {
          statusEl.className = 'status-badge status-online';
          statusEl.textContent = `Paired (${response.count || 0})`;
          showSection('active');
        } else {
          statusEl.className = 'status-badge status-unpaired';
          statusEl.textContent = 'Unpaired';
          showSection('pairing');
          codeInput.focus();
        }
      } else if (response && response.connected && !response.unlocked) {
        statusEl.className = 'status-badge status-offline';
        statusEl.textContent = 'Locked';
        showSection('offline');
      } else {
        statusEl.className = 'status-badge status-offline';
        statusEl.textContent = response?.message || 'Offline';
        showSection('offline');
      }
    });
  }

  checkStatus();

  pairBtn.addEventListener('click', () => {
    const raw = codeInput.value.trim().replace(/\D/g, '');
    if (raw.length < 6) {
      pairError.textContent = 'Please enter a 6-digit code';
      pairError.style.display = 'block';
      return;
    }

    pairError.style.display = 'none';
    pairBtn.textContent = 'Authorizing...';
    pairBtn.disabled = true;

    chrome.runtime.sendMessage({ action: 'SUBMIT_PAIRING_CODE', code: raw }, (res) => {
      pairBtn.textContent = 'Authorize & Pair';
      pairBtn.disabled = false;

      if (res && res.success) {
        codeInput.value = '';
        checkStatus();
      } else {
        pairError.textContent = res?.error === 'INVALID_PAIRING_CODE'
          ? 'Invalid code. Check Mountain tab.'
          : (res?.error || 'Failed to authorize');
        pairError.style.display = 'block';
      }
    });
  });

  codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      pairBtn.click();
    }
  });

  unpairBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'UNPAIR' }, () => {
      checkStatus();
    });
  });

  function openMountain() {
    chrome.runtime.sendMessage({ action: 'OPEN_MOUNTAIN' });
    window.close();
  }

  openMountainBtn.addEventListener('click', openMountain);
  openMountainUnpairedBtn.addEventListener('click', openMountain);
  openMountainOfflineBtn.addEventListener('click', openMountain);
});
