'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SUPPORTED_LOCALES, Locale, UnitSystem } from '@/lib/i18n/types';

export default function LanguageSwitcher({
  variant = 'navbar',
}: {
  variant?: 'navbar' | 'footer' | 'pill';
}) {
  const { locale, setLocale, unitSystem, setUnitSystem, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentLocaleConfig = SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES.en;

  return (
    <div className="relative inline-block text-start" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`${t('common.language')}: ${currentLocaleConfig.nativeName}, ${unitSystem}`}
        className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] transition-all cursor-pointer select-none ${
          variant === 'footer'
            ? 'px-3 py-1.5 text-xs bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--line-strong)]'
            : 'px-2.5 py-1.5 text-xs bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--surface)] hover:border-[var(--line-strong)] shadow-2xs'
        }`}
      >
        <Globe aria-hidden="true" className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="font-semibold">{currentLocaleConfig.nativeName}</span>
        <span className="text-[10px] text-[var(--ink-muted)] border-s border-[var(--line)] ps-1.5 uppercase font-mono">
          {unitSystem === 'metric' ? 'km' : 'mi'}
        </span>
        <svg
          aria-hidden="true"
          className={`w-3.5 h-3.5 text-[var(--ink-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Language and regional settings"
          className="absolute end-0 mt-2 w-64 rounded-2xl bg-[var(--surface)] border border-[var(--line-strong)] shadow-2xl p-2 z-50 animate-fadeIn backdrop-blur-md"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[var(--line)]">
            <p className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
              {t('common.language')} & {t('common.units')}
            </p>
          </div>

          {/* Languages list */}
          <div className="py-1 max-h-64 overflow-y-auto pr-1">
            {Object.values(SUPPORTED_LOCALES).map((loc) => {
              const isSelected = loc.code === locale;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => {
                    setLocale(loc.code as Locale);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent)] text-[var(--accent-on)] font-bold'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-soft)]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--surface-soft)] text-[var(--ink-muted)] border border-[var(--line)]'
                    }`}>
                      {loc.code.toUpperCase()}
                    </span>
                    <span>{loc.nativeName}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-[var(--accent-on)]/80' : 'text-[var(--ink-muted)]'}`}>
                      ({loc.name})
                    </span>
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Unit Preferences Divider */}
          <div className="pt-2 mt-1 border-t border-[var(--line)] px-2">
            <p className="text-[11px] font-semibold text-[var(--ink-muted)] mb-1.5 px-1">
              {t('common.units')}
            </p>
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setUnitSystem('metric')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                  unitSystem === 'metric'
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-bold shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                Metric (km/kg)
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('imperial')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer text-center ${
                  unitSystem === 'imperial'
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-bold shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                Imperial (mi/lb)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
