'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import ar from './ar.json';
import en from './en.json';
import type { Locale } from '../types';

type Dict = typeof en;

const dicts: Record<Locale, Dict> = { ar, en };

/** Interpolate {placeholders} in a template string. */
export function interpolate(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dict;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'hub.locale';

function applyDocument(l: Locale) {
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
}

export function I18nProvider({ initialLocale = 'en', children }: { initialLocale?: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') {
        setLocaleState(stored);
        applyDocument(stored);
      }
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    applyDocument(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: dicts[locale],
    setLocale,
    toggle: () => setLocale(locale === 'ar' ? 'en' : 'ar'),
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
