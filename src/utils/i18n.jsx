import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import en from '../locales/en.json';
import tr from '../locales/tr.json';
import az from '../locales/az.json';

const MESSAGES = { en, tr, az };

function detectLanguage() {
  try {
    const stored = localStorage.getItem('lang');
    if (stored && MESSAGES[stored]) return stored;
  } catch {}

  const langs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || ['en'];
  for (const l of langs) {
    const code = (l || '').toLowerCase();
    if (code.startsWith('tr')) return 'tr';
    if (code.startsWith('az')) return 'az';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

const I18nContext = createContext({ lang: 'en', t: (k) => k, setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    setLang(detectLanguage());
  }, []);

  useEffect(() => {
    try { localStorage.setItem('lang', lang); } catch {}
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    t: (key, vars) => {
      const dict = MESSAGES[lang] || MESSAGES.en;
      const fallbackDict = MESSAGES.en;
      const raw = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), dict);
      const fb = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), fallbackDict);
      const str = (typeof raw === 'string' ? raw : (typeof fb === 'string' ? fb : key));
      return interpolate(str, vars);
    },
  }), [lang]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
