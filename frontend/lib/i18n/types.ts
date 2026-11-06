export type Locale =
  | 'en'
  | 'es'
  | 'fr'
  | 'ar'
  | 'de'
  | 'pt'
  | 'hi'
  | 'zh'
  | 'bn'
  | 'sw'
  | 'ru'
  | 'id'
  | 'tr'
  | 'it'
  | 'ja';

export type Direction = 'ltr' | 'rtl';

export type UnitSystem = 'metric' | 'imperial';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  dir: Direction;
}

export const SUPPORTED_LOCALES: Record<Locale, LocaleConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '简体中文', dir: 'ltr' },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  sw: { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  id: { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  tr: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  it: { code: 'it', name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
};
