/**
 * Combines class names, filtering out falsy values.
 * Lightweight alternative to clsx for simple use cases.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formats a distance in metres to a human-readable string.
 * e.g. 300 -> '0.3 km', 1500 -> '1.5 km', 800 -> '800 m'
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
}

/**
 * Formats a UTC ISO date string to a human-readable time-remaining string.
 * e.g. '2 hours left', 'Tomorrow', 'Expired'
 */
export function formatTimeRemaining(isoDate: string): string {
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 60) return `${diffMinutes} min left`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} left`;
  if (diffDays === 1) return 'Tomorrow';
  return `${diffDays} days left`;
}

/**
 * Formats a weight in grams to a human-readable string.
 * e.g. 850 -> '850 g', 1200 -> '1.2 kg'
 */
export function formatWeight(grams: number): string {
  if (grams < 1000) {
    return `${Math.round(grams)} g`;
  }
  const kg = grams / 1000;
  return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)} kg`;
}
