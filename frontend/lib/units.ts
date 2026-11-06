/**
 * lib/units.ts
 * Regional measurement conversion and formatting utilities.
 * Supports Metric (km / kg) and Imperial (mi / lb).
 */

import { UnitSystem, Locale } from './i18n/types';

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function milesToKm(miles: number): number {
  return miles / 0.621371;
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function lbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

/**
 * Formats a distance with the user's unit system preference and locale.
 * @param km Distance in kilometers
 * @param unit 'metric' | 'imperial' (default: metric)
 * @param locale string (default: 'en')
 */
export function formatDistance(
  km: number | null | undefined,
  unit: UnitSystem = 'metric',
  locale: Locale = 'en'
): string {
  if (km === null || km === undefined || isNaN(km)) return '';

  const isImperial = unit === 'imperial';
  const val = isImperial ? kmToMiles(km) : km;
  const unitLabel = isImperial ? (locale === 'ar' ? 'ميل' : 'mi') : (locale === 'ar' ? 'كم' : 'km');

  if (val < 0.1) {
    if (isImperial) {
      const feet = Math.round(val * 5280);
      return locale === 'ar' ? `${feet} قدم` : `${feet} ft`;
    }
    const meters = Math.round(km * 1000);
    return locale === 'ar' ? `${meters} م` : `${meters} m`;
  }

  const formattedNum = new Intl.NumberFormat(locale, {
    minimumFractionDigits: val < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(val);

  return `${formattedNum} ${unitLabel}`;
}

/**
 * Formats a weight in kilograms or pounds.
 * @param kg Weight in kilograms
 * @param unit 'metric' | 'imperial' (default: metric)
 * @param locale string (default: 'en')
 */
export function formatWeight(
  kg: number | null | undefined,
  unit: UnitSystem = 'metric',
  locale: Locale = 'en'
): string {
  if (kg === null || kg === undefined || isNaN(kg)) return '';

  const isImperial = unit === 'imperial';
  const val = isImperial ? kgToLbs(kg) : kg;
  const unitLabel = isImperial ? (locale === 'ar' ? 'رطل' : 'lb') : (locale === 'ar' ? 'كغ' : 'kg');

  const formattedNum = new Intl.NumberFormat(locale, {
    minimumFractionDigits: val < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(val);

  return `${formattedNum} ${unitLabel}`;
}
