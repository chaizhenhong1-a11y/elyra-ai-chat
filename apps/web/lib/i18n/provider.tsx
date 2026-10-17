"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {messages, type Messages} from './messages';
import {localeDirection, normalizeLocale, normalizeSelection} from './locale';

export {normalizeLocale} from './locale';
export const ELYRA_UI_LANGUAGE_KEY = 'elyra.uiLanguage';
// Import compatibility only. React context handles all in-page synchronization.
export const ELYRA_UI_LANGUAGE_EVENT = 'elyra-ui-language-change';

type I18nValue = {locale: string; selection: string; t: Messages; setLocale: (value: string) => void};
const I18nContext = createContext<I18nValue | null>(null);

function readSavedSelection(): string {
  try {return normalizeSelection(window.localStorage.getItem(ELYRA_UI_LANGUAGE_KEY) ?? 'system');}
  catch {return 'system';}
}

export function I18nProvider({children}: {children: React.ReactNode}) {
  // SSR and the first browser render are identical; only effects read browser preferences.
  const [selection, setSelection] = useState('system');
  const [browserLocale, setBrowserLocale] = useState('en');

  useEffect(() => {
    const detect = () => setBrowserLocale(normalizeLocale(navigator.language || navigator.languages?.[0] || 'en'));
    detect();
    setSelection(readSavedSelection());
    const onStorage = (event: StorageEvent) => {
      if (event.key === ELYRA_UI_LANGUAGE_KEY || event.key === null) setSelection(readSavedSelection());
    };
    window.addEventListener('languagechange', detect);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('languagechange', detect);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setLocale = useCallback((value: string) => {
    const next = normalizeSelection(value);
    setSelection(next);
    // UI switching also works when storage is blocked or unavailable.
    try {window.localStorage.setItem(ELYRA_UI_LANGUAGE_KEY, next);} catch {}
  }, []);

  const locale = selection === 'system' ? browserLocale : selection;
  const t = messages[locale] ?? messages.en;
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.pageDescription);
  }, [locale, t]);

  const value = useMemo(() => ({locale, selection, t, setLocale}), [locale, selection, t, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}

export function uiLanguageName(entry: {code: string; names: Record<string, string>}, locale: string) {
  const normalized = normalizeLocale(locale);
  const base = normalized.split('-')[0];
  return entry.names[normalized] ?? entry.names[base] ?? entry.names.en ?? entry.code;
}
