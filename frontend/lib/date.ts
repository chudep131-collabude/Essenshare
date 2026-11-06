/**
 * lib/date.ts
 * Timezone-aware date and time formatting utilities.
 * Ensures UTC database timestamps are properly presented in the user's local timezone and locale.
 */

import { Locale } from './i18n/types';

/**
 * Format an ISO timestamp into the user's local timezone.
 */
export function formatLocalDateTime(
  dateInput: string | Date | null | undefined,
  locale: Locale = 'en',
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Returns humanized relative time remaining (e.g. "3h 45m" or "2d").
 */
export function formatLocalizedTimeRemaining(expiresAt: string | Date, locale: Locale = 'en'): string {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  const diffMs = expiry - Date.now();

  if (diffMs <= 0) {
    if (locale === 'es') return 'Vencido';
    if (locale === 'fr') return 'Expiré';
    if (locale === 'ar') return 'منتهي';
    if (locale === 'de') return 'Abgelaufen';
    return 'Expired';
  }

  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    if (locale === 'ar') return `${days} يوم ${remHours > 0 ? `${remHours} س` : ''}`;
    return `${days}d ${remHours > 0 ? `${remHours}h` : ''}`.trim();
  }

  if (hours > 0) {
    const remMins = mins % 60;
    if (locale === 'ar') return `${hours} س ${remMins > 0 ? `${remMins} د` : ''}`;
    return `${hours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim();
  }

  if (locale === 'ar') return `${Math.max(1, mins)} دقيقة`;
  return `${Math.max(1, mins)}m`;
}
