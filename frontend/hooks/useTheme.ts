'use client';

import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'saul-theme';
const THEME_EVENT = 'saul-theme-change';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'dark';
    setTheme(stored);
    applyTheme(stored);

    // Sync state across all hook instances whenever another instance toggles
    const handler = (e: Event) => {
      setTheme((e as CustomEvent<Theme>).detail);
    };
    window.addEventListener(THEME_EVENT, handler);
    return () => window.removeEventListener(THEME_EVENT, handler);
  }, []);

  const toggle = () => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      // Defer so the event fires after the current render cycle completes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: next }));
      }, 0);
      return next;
    });
  };

  return { theme, toggle };
}
