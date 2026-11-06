'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiPost } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n';
import { formatLocalizedTimeRemaining } from '@/lib/date';
import { Navigation, AlertTriangle } from 'lucide-react';


export interface Donation {
  id: string;
  title: string;
  description: string | null;
  category:
    | 'PREPARED_FOOD'
    | 'GROCERIES'
    | 'PRODUCE'
    | 'BAKERY'
    | 'DAIRY'
    | 'BEVERAGES'
    | 'NON_FOOD_ESSENTIALS'
    | 'OTHER';
  quantity: number;
  quantity_unit: string;
  weight_kg: number | null;
  allergens: string[];
  is_halal: boolean;
  is_vegan: boolean;
  is_vegetarian: boolean;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_notes: string | null;
  available_from: string;
  expires_at: string;
  donor_user_id: string;
  distance_km?: number;
  created_at: string;
  image_url?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  PREPARED_FOOD: 'Prepared',
  GROCERIES: 'Groceries',
  PRODUCE: 'Produce',
  BAKERY: 'Bakery',
  DAIRY: 'Dairy',
  BEVERAGES: 'Beverages',
  NON_FOOD_ESSENTIALS: 'Essentials',
  OTHER: 'Surplus',
};

const CATEGORY_IMAGES: Record<string, string> = {
  PREPARED_FOOD: '/web/prepared_food.jpg',
  GROCERIES: '/web/groceries.jpg',
  PRODUCE: '/web/produce.jpg',
  BAKERY: '/web/bakery.jpg',
  DAIRY: '/web/dairy.jpg',
  BEVERAGES: '/web/beverages.jpg',
  NON_FOOD_ESSENTIALS: '/web/donna-spearman-Kml12zn10wI-unsplash.jpg',
  OTHER: '/web/chuttersnap-7eQlPra81zQ-unsplash.jpg',
};

const REPORT_CATEGORIES = [
  { value: 'UNSAFE_FOOD', label: 'Unsafe food' },
  { value: 'SPOILED_OR_EXPIRED', label: 'Spoiled or expired' },
  { value: 'WRONG_ALLERGEN_INFO', label: 'Wrong allergen info' },
  { value: 'WRONG_DESCRIPTION', label: 'Incorrect description' },
  { value: 'COLD_CHAIN_CONCERN', label: 'Cold chain / temperature concern' },
  { value: 'ALREADY_GONE', label: 'Already claimed / gone' },
  { value: 'DONOR_MISCONDUCT', label: 'Donor misconduct' },
  { value: 'OTHER', label: 'Other concern' },
];

function getExpiryInfo(expiresAt: string, locale?: any) {
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) return { isUrgent: true, text: 'Expired', isExpired: true };
  const isUrgent = msLeft < 4 * 60 * 60 * 1000;
  return { isUrgent, text: formatLocalizedTimeRemaining(expiresAt, locale), isExpired: false };
}

interface DonationCardProps {
  donation: Donation;
  onRequestPickup?: (donationId: string, trigger?: HTMLElement) => void;
  showCancelButton?: boolean;
  onCancel?: (donationId: string) => void | Promise<void>;
  showRecallButton?: boolean;
  onRecall?: (donationId: string) => void | Promise<void>;
}

export default function DonationCard({
  donation,
  onRequestPickup,
  showCancelButton,
  onCancel,
  showRecallButton,
  onRecall,
}: DonationCardProps) {
  const { t, locale, formatDistance: formatDistLocale, formatTimeRemaining: formatTimeLocale } = useTranslation();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [reportError, setReportError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(
    donation.image_url || CATEGORY_IMAGES[donation.category] || '/web/bakery.jpg'
  );

  const expiry = getExpiryInfo(donation.expires_at, locale);
  const displayedAllergens = donation.allergens?.slice(0, 1) ?? [];
  const extraAllergens = (donation.allergens?.length ?? 0) - displayedAllergens.length;


  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportCategory) return;
    setReportStatus('loading');
    setReportError(null);
    try {
      await apiPost('/reports', {
        donation_id: donation.id,
        category: reportCategory,
        description: reportDescription || undefined,
      });
      setReportStatus('success');
      setReportOpen(false);
    } catch (err) {
      setReportStatus('error');
      setReportError(friendlyError(err, 'Could not submit your report. Please try again.'));
    }
  }

  async function handleCancel() {
    if (!onCancel) return;
    setCancelLoading(true);
    try {
      await onCancel(donation.id);
    } finally {
      setCancelLoading(false);
    }
  }

  const categoryLabel = CATEGORY_LABELS[donation.category] ?? donation.category;

  return (
    <article
      aria-label={donation.title}
      className="group relative flex flex-col h-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* ─── Integrated Photo Header (Attached directly to card) ─── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-soft)] shrink-0">
        <Image
          src={imgSrc}
          alt={donation.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          onError={() => {
            setImgSrc(CATEGORY_IMAGES[donation.category] || '/web/bakery.jpg');
          }}
          priority={false}
        />

        {/* Ambient readability scrims */}
        <div
          className="absolute inset-x-0 top-0 h-14 sm:h-16 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-14 sm:h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Overlay Row: Category Pill (Left) & Distance/Expiry (Right) */}
        <div className="absolute top-2 inset-x-2 sm:top-2.5 sm:inset-x-2.5 flex items-center justify-between gap-1 z-10">
          {/* Category Pill */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white bg-black/60 backdrop-blur-md border border-white/20 shadow-sm shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span>{t('categories.' + donation.category) || CATEGORY_LABELS[donation.category] || 'Surplus'}</span>
          </span>

          {/* Badges on right: Expiry + Distance */}
          <div className="inline-flex items-center gap-1 shrink-0">
            {expiry.isUrgent && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shadow-sm backdrop-blur-md border',
                  expiry.isExpired
                    ? 'bg-rose-500/90 text-white border-rose-400/40'
                    : 'bg-amber-500/90 text-white border-amber-400/40'
                )}
                aria-label={`Expires: ${expiry.text}`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{expiry.isExpired ? t('common.expired') : formatTimeLocale(donation.expires_at)}</span>
              </span>
            )}

            {donation.distance_km !== undefined && (
              <span
                className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold text-white bg-black/60 backdrop-blur-md border border-white/20 shadow-sm tabular-nums"
                aria-label={`${t('common.distance')}: ${formatDistLocale(donation.distance_km)}`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{formatDistLocale(donation.distance_km)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Overlay Row: Quantity Highlight */}
        <div className="absolute bottom-2 inset-x-2 sm:bottom-2.5 sm:inset-x-2.5 flex items-center justify-between text-white text-[10px] sm:text-xs z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-white font-medium border border-white/10 shrink-0">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>{donation.quantity} {donation.quantity_unit}</span>
          </span>

          {!expiry.isUrgent && (
            <span className="text-white/85 font-medium text-[10px] drop-shadow-sm truncate ml-1">
              {expiry.text}
            </span>
          )}
        </div>
      </div>

      {/* ─── Card Content Body ─── */}
      <div className="p-3 sm:p-3.5 md:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-1 sm:space-y-1.5">
          {/* Title */}
          <h3 className="text-xs sm:text-sm md:text-base font-bold text-[var(--ink)] leading-snug line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
            {donation.title}
          </h3>

          {/* Description (visible on sm+) */}
          {donation.description && (
            <p className="hidden sm:block text-[11px] text-[var(--ink-muted)] line-clamp-1 leading-relaxed">
              {donation.description}
            </p>
          )}

          {/* Pickup Address — Clickable to focus on the interactive map */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as unknown as { _essenshareFocusDonation?: (id: string) => void })._essenshareFocusDonation) {
                (window as unknown as { _essenshareFocusDonation: (id: string) => void })._essenshareFocusDonation(donation.id);
              }
            }}
            title="Click to view and zoom on map"
            className="flex items-center gap-1 text-[11px] text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors text-left group/addr cursor-pointer w-full"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--ink-quiet)] group-hover/addr:text-[var(--accent)] shrink-0 transition-colors"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate group-hover/addr:underline decoration-dotted">{donation.pickup_address}</span>
            <span className="text-[10px] text-[var(--accent)] font-semibold shrink-0 opacity-0 group-hover/addr:opacity-100 transition-opacity ml-auto">
              Map ↗
            </span>
          </button>

          {/* Dietary & Allergen chips */}
          {(donation.is_halal ||
            donation.is_vegan ||
            donation.is_vegetarian ||
            displayedAllergens.length > 0) && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {donation.is_halal && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50">
                  {t('dietary.halal')}
                </span>
              )}
              {donation.is_vegan && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-800 border border-green-200/80 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800/50">
                  {t('dietary.vegan')}
                </span>
              )}
              {donation.is_vegetarian && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-lime-50 text-lime-800 border border-lime-200/80 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-800/50">
                  {t('dietary.vegetarian')}
                </span>
              )}
              {displayedAllergens.map((allergen) => (
                <span
                  key={allergen}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50"
                >
                  {allergen}
                </span>
              ))}
              {extraAllergens > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                  +{extraAllergens}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── Actions Row ─── */}
        <div className="pt-2 border-t border-[var(--line)] flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-1.5">
            {/* Primary Action Button */}
            {onRequestPickup && !expiry.isExpired && !showCancelButton && (
              donation.quantity > 0 ? (
                <button
                  type="button"
                  onClick={(e) => onRequestPickup(donation.id, e.currentTarget)}
                  aria-label={`${t('common.get_code')}: ${donation.title}`}
                  className="inline-flex items-center justify-center gap-1 flex-1 py-2 px-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-on)] font-bold text-xs sm:text-sm shadow-xs hover:brightness-105 active:scale-[0.99] transition-all min-h-[36px] sm:min-h-[40px] cursor-pointer"
                >
                  <span>{t('common.get_code')}</span>
                  <span aria-hidden="true" className="font-sans text-xs sm:text-sm rtl:rotate-180">→</span>
                </button>
              ) : (
                <span className="inline-flex items-center justify-center gap-1 flex-1 py-2 px-2.5 rounded-full bg-[var(--surface-soft)] text-[var(--ink-muted)] font-semibold text-xs sm:text-sm border border-[var(--line)] min-h-[36px] sm:min-h-[40px]">
                  {t('common.all_claimed')}
                </span>
              )
            )}

            {/* 100% In-App Directions Button */}
            {!showCancelButton && (
              <button
                type="button"
                id={`directions-btn-${donation.id}`}
                aria-label={`${t('common.directions')}: ${donation.title}`}
                onClick={() => {
                  if (
                    typeof window !== 'undefined' &&
                    (window as unknown as { _essenshareGetDirections?: (id: string, donation?: Donation) => void })._essenshareGetDirections
                  ) {
                    (window as unknown as { _essenshareGetDirections: (id: string, donation?: Donation) => void })._essenshareGetDirections(donation.id, donation);
                  }
                }}
                title={t('common.directions')}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)] font-semibold text-xs shadow-xs hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.99] transition-all min-h-[36px] sm:min-h-[40px] cursor-pointer shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t('common.directions')}</span>
              </button>
            )}

            {/* Cancel Listing Button for Donors */}
            {showCancelButton && onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelLoading}
                aria-label={`Cancel listing: ${donation.title}`}
                className="inline-flex items-center justify-center gap-1 flex-1 py-2 px-2.5 rounded-full text-rose-600 border border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900/60 dark:hover:bg-rose-950/30 font-semibold text-xs sm:text-sm transition-colors min-h-[36px] sm:min-h-[40px] cursor-pointer disabled:opacity-50"
              >
                {cancelLoading && <LoadingSpinner size="sm" label="Cancelling" />}
                <span>Cancel</span>
              </button>
            )}

            {/* Emergency Recall Button for Donors */}
            {showRecallButton && onRecall && donation.status !== 'RECALLED' && donation.status !== 'COMPLETED' && (
              <button
                type="button"
                onClick={() => onRecall(donation.id)}
                aria-label={`Emergency recall listing: ${donation.title}`}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-amber-700 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 dark:text-amber-300 font-semibold text-xs transition-colors cursor-pointer shrink-0"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <span>Recall</span>
              </button>
            )}

            {/* Report Button */}
            {reportStatus !== 'success' && (
              <button
                type="button"
                onClick={() => setReportOpen((v) => !v)}
                aria-expanded={reportOpen}
                aria-controls={`report-form-${donation.id}`}
                className="text-[11px] text-[var(--ink-quiet)] hover:text-[var(--ink-muted)] py-1 px-1 transition-colors shrink-0"
              >
                Report
              </button>
            )}

            {reportStatus === 'success' && (
              <span className="text-[11px] text-[var(--ink-muted)] shrink-0">Reported</span>
            )}
          </div>

          {/* Inline Report Form */}
          {reportOpen && reportStatus !== 'success' && (
            <form
              id={`report-form-${donation.id}`}
              onSubmit={handleReport}
              className="space-y-2 border-t border-[var(--line)] pt-2 mt-1"
            >
              {reportError && (
                <Alert type="error" className="mb-1 text-xs">
                  {reportError}
                </Alert>
              )}
              <div>
                <label
                  htmlFor={`report-cat-${donation.id}`}
                  className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1"
                >
                  Reason
                </label>
                <select
                  id={`report-cat-${donation.id}`}
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  required
                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--line)] text-xs text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                >
                  <option value="">Select reason…</option>
                  {REPORT_CATEGORIES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor={`report-desc-${donation.id}`}
                  className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1"
                >
                  Details (optional)
                </label>
                <textarea
                  id={`report-desc-${donation.id}`}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value.slice(0, 500))}
                  rows={2}
                  maxLength={500}
                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--line)] text-xs text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={reportStatus === 'loading' || !reportCategory}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--surface-soft)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--line)] transition-colors disabled:opacity-50 min-h-[32px]"
                >
                  {reportStatus === 'loading' && <LoadingSpinner size="sm" label="Submitting" />}
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] px-1.5 py-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
