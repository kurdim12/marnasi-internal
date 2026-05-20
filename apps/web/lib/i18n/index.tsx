'use client';

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import ar from './ar.json';
import en from './en.json';

export type Locale = 'ar' | 'en';
type Dict = typeof ar;

const dicts: Record<Locale, Dict> = { ar, en };

interface I18nContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dict;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ initialLocale = 'ar', children }: { initialLocale?: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('mi.locale', l); } catch {}
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: dicts[locale],
    setLocale,
  }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
