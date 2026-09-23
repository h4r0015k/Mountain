import { useEffect, useRef, useState, useCallback } from 'react';

export type AutoLockTimeout = 0 | 1 | 5 | 15 | 30 | 60; // Minutes (0 = disabled)

const STORAGE_KEY = 'mountain_autolock_minutes';

export function useAutoLock(onLock: () => void) {
  const [timeoutMinutes, setTimeoutMinutesState] = useState<AutoLockTimeout>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const val = parseInt(stored, 10);
        if ([0, 1, 5, 15, 30, 60].includes(val)) {
          return val as AutoLockTimeout;
        }
      }
    } catch {}
    return 15; // Default 15 minutes
  });

  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  });

  const lastActiveRef = useRef<number>(Date.now());
  const timeoutMinutesRef = useRef(timeoutMinutes);
  useEffect(() => {
    timeoutMinutesRef.current = timeoutMinutes;
  }, [timeoutMinutes]);

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  const setTimeoutMinutes = useCallback((minutes: AutoLockTimeout) => {
    setTimeoutMinutesState(minutes);
    timeoutMinutesRef.current = minutes;
    lastActiveRef.current = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(minutes));
    } catch {}
  }, []);

  useEffect(() => {
    if (timeoutMinutes <= 0) return; // Disabled

    const checkLock = () => {
      const limitMinutes = timeoutMinutesRef.current;
      if (limitMinutes <= 0) return;

      const elapsed = Date.now() - lastActiveRef.current;
      const thresholdMs = limitMinutes * 60 * 1000;
      if (elapsed >= thresholdMs) {
        onLockRef.current();
      }
    };

    let lastMouseMove = 0;
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMove > 1000) {
        lastMouseMove = now;
        lastActiveRef.current = now;
      }
    };

    const handleDirectActivity = () => {
      lastActiveRef.current = Date.now();
    };

    const handleVisibilityOrFocus = () => {
      checkLock();
    };

    // Check every second
    const interval = setInterval(checkLock, 1000);

    const directEvents = ['mousedown', 'keydown', 'touchstart', 'wheel'];
    directEvents.forEach((ev) => window.addEventListener(ev, handleDirectActivity, { passive: true }));
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      directEvents.forEach((ev) => window.removeEventListener(ev, handleDirectActivity));
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [timeoutMinutes]);

  return {
    timeoutMinutes,
    setTimeoutMinutes,
    resetTimer,
  };
}
