'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Locale, Direction, UnitSystem, SUPPORTED_LOCALES } from './types';
import { formatDistance as formatDistUtil, formatWeight as formatWeightUtil } from '../units';
import { formatLocalDateTime, formatLocalizedTimeRemaining } from '../date';

import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import ar from './translations/ar.json';
import de from './translations/de.json';
import pt from './translations/pt.json';
import hi from './translations/hi.json';
import zh from './translations/zh.json';
import bn from './translations/bn.json';
import sw from './translations/sw.json';
import ru from './translations/ru.json';
import id from './translations/id.json';
import tr from './translations/tr.json';
import it from './translations/it.json';
import ja from './translations/ja.json';

const TRANSLATIONS: Record<Locale, any> = {
  en, es, fr, ar, de, pt, hi, zh, bn, sw, ru, id, tr, it, ja
};

interface I18nContextType {
  locale: Locale;
  dir: Direction;
  unitSystem: UnitSystem;
  setLocale: (loc: Locale) => void;
  setUnitSystem: (unit: UnitSystem) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDistance: (km: number | null | undefined) => string;
  formatWeight: (kg: number | null | undefined) => string;
  formatDate: (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  formatTimeRemaining: (expiresAt: string | Date) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function resolvePath(obj: any, path: string): string | null {
  if (!obj) return null;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return typeof current === 'string' ? current : null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric');
  const [isMounted, setIsMounted] = useState(false);

  // Initialize from storage or cookies on mount
  useEffect(() => {
    setIsMounted(true);
    let initialLocale: Locale = 'en';
    let initialUnit: UnitSystem = 'metric';

    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('ess_locale') as Locale | null;
      const match = document.cookie.match(/ess_locale=([a-z]{2})/);
      const cookieLocale = match ? (match[1] as Locale) : null;

      if (storedLocale && storedLocale in SUPPORTED_LOCALES) {
        initialLocale = storedLocale;
      } else if (cookieLocale && cookieLocale in SUPPORTED_LOCALES) {
        initialLocale = cookieLocale;
      } else if (navigator.language) {
        const browserPrefix = navigator.language.slice(0, 2).toLowerCase() as Locale;
        if (browserPrefix in SUPPORTED_LOCALES) {
          initialLocale = browserPrefix;
        }
      }

      const storedUnit = localStorage.getItem('ess_units') as UnitSystem | null;
      if (storedUnit === 'imperial' || storedUnit === 'metric') {
        initialUnit = storedUnit;
      } else if (initialLocale === 'en' && navigator.language?.includes('US')) {
        initialUnit = 'imperial';
      }
    }

    setLocaleState(initialLocale);
    setUnitSystemState(initialUnit);
  }, []);

  const dir: Direction = SUPPORTED_LOCALES[locale]?.dir || 'ltr';

  // Synchronize HTML attributes & persistence
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
      // Set cookie for SSR/edge requests (expires in 1 year)
      document.cookie = `ess_locale=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
      if (isMounted) {
        localStorage.setItem('ess_locale', locale);
      }
    }
  }, [locale, dir, isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('ess_units', unitSystem);
    }
  }, [unitSystem, isMounted]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (newLocale in SUPPORTED_LOCALES) {
      setLocaleState(newLocale);
    }
  }, []);

  const setUnitSystem = useCallback((newUnits: UnitSystem) => {
    if (newUnits === 'metric' || newUnits === 'imperial') {
      setUnitSystemState(newUnits);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Look in active locale
      let text = resolvePath(TRANSLATIONS[locale], key);
      // 2. Fall back to English
      if (!text && locale !== 'en') {
        text = resolvePath(TRANSLATIONS.en, key);
      }
      // 3. Fall back to raw key if not found
      if (!text) {
        return key;
      }
      // 4. Interpolate variables: {var}
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text!.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [locale]
  );

  const formatDistance = useCallback(
    (km: number | null | undefined) => formatDistUtil(km, unitSystem, locale),
    [unitSystem, locale]
  );

  const formatWeight = useCallback(
    (kg: number | null | undefined) => formatWeightUtil(kg, unitSystem, locale),
    [unitSystem, locale]
  );

  const formatDate = useCallback(
    (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) =>
      formatLocalDateTime(date, locale, options),
    [locale]
  );

  const formatTimeRem = useCallback(
    (expiresAt: string | Date) => formatLocalizedTimeRemaining(expiresAt, locale),
    [locale]
  );

  const contextValue = useMemo(
    () => ({
      locale,
      dir,
      unitSystem,
      setLocale,
      setUnitSystem,
      t,
      formatDistance,
      formatWeight,
      formatDate,
      formatTimeRemaining: formatTimeRem,
    }),
    [locale, dir, unitSystem, setLocale, setUnitSystem, t, formatDistance, formatWeight, formatDate, formatTimeRem]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
