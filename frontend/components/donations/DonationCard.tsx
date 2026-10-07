'use client';
import { useState } from 'react';
import { cn, formatTimeRemaining } from '@/lib/utils';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiPost, ApiException } from '@/lib/api';

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
}

const CATEGORY_LABELS: Record<string, string> = {
  PREPARED_FOOD: 'Prepared Meals',
  GROCERIES: 'Groceries',
  PRODUCE: 'Fresh Produce',
  BAKERY: 'Bakery',
  DAIRY: 'Dairy',
  BEVERAGES: 'Beverages',
  NON_FOOD_ESSENTIALS: 'Non-Food Essentials',
  OTHER: 'Other',
};

const REPORT_CATEGORIES = [
  { value: 'SAFETY_CONCERN', label: 'Safety concern' },
  { value: 'INCORRECT_INFO', label: 'Incorrect information' },
  { value: 'ALREADY_CLAIMED', label: 'Already claimed / gone' },
  { value: 'SPAM', label: 'Spam or fraudulent' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  PREPARED_FOOD:       'oklch(58% 0.18 32)',
  GROCERIES:           'oklch(52% 0.16 150)',
  PRODUCE:             'oklch(62% 0.18 142)',
  BAKERY:              'oklch(60% 0.16 55)',
  DAIRY:               'oklch(65% 0.12 220)',
  BEVERAGES:           'oklch(55% 0.14 260)',
  NON_FOOD_ESSENTIALS: 'oklch(55% 0.12 300)',
  OTHER:               'oklch(55% 0.08 80)',
};

function getExpiryColour(expiresAt: string): string {
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft < 0) return 'var(--error)';
  if (msLeft < 60 * 60 * 1000) return 'var(--error)';
  if (msLeft < 4 * 60 * 60 * 1000) return 'var(--warning)';
  return 'var(--success)';
}

interface DonationCardProps {
  donation: Donation;
  onRequestPickup?: (donationId: string, trigger?: HTMLElement) => void;
  showCancelButton?: boolean;
  onCancel?: (donationId: string) => void | Promise<void>;
}

export default function DonationCard({
  donation,
  onRequestPickup,
  showCancelButton,
  onCancel,
}: DonationCardProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [reportError, setReportError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const timeRemaining = formatTimeRemaining(donation.expires_at);
  const isExpired = timeRemaining === 'Expired';
  const displayedAllergens = donation.allergens?.slice(0, 3) ?? [];
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
      setReportError(
        err instanceof ApiException ? err.message : 'Could not submit report. Please try again.'
      );
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

  const chipClass =
    'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium bg-[var(--surface-soft)] text-[var(--ink-muted)]';

  const categoryColor = CATEGORY_COLORS[donation.category] ?? 'var(--accent)';

  return (
    <article
      aria-label={donation.title}
      className="bg-surface border border-line rounded-md overflow-hidden hover:shadow-md transition-shadow"
      style={{
        borderBlockStart: `4px solid ${categoryColor}`,
        transition: 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      }}
    >
      <div className="px-5 pt-4 pb-5 space-y-2">
        {/* Row 1 — category eyebrow + distance */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold uppercase"
            style={{ letterSpacing: '0.08em', color: categoryColor }}
          >
            {CATEGORY_LABELS[donation.category] ?? donation.category}
          </span>
          {donation.distance_km !== undefined && (
            <span className="text-xs text-ink-quiet" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {donation.distance_km < 1
                ? `${Math.round(donation.distance_km * 1000)} m`
                : `${donation.distance_km.toFixed(1)} km`}
            </span>
          )}
        </div>

        {/* Row 2 — title */}
        <h3
          className="text-step-1 font-bold text-ink leading-snug"
          style={{ letterSpacing: '-0.02em', textWrap: 'balance' } as React.CSSProperties}
        >
          {donation.title}
        </h3>

        {/* Row 3 — quantity + expiry */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-ink-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {donation.quantity} {donation.quantity_unit}
          </span>
          <span
            className="font-medium"
            style={{ color: getExpiryColour(donation.expires_at), fontVariantNumeric: 'tabular-nums' }}
          >
            {timeRemaining}
          </span>
        </div>

        {/* Row 4 — address */}
        <p className="text-sm text-ink-muted truncate">{donation.pickup_address}</p>

        {/* Row 5 — dietary + allergen chips */}
        {(donation.is_halal ||
          donation.is_vegan ||
          donation.is_vegetarian ||
          displayedAllergens.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {donation.is_halal && <span className={chipClass}>Halal</span>}
            {donation.is_vegan && <span className={chipClass}>Vegan</span>}
            {donation.is_vegetarian && <span className={chipClass}>Vegetarian</span>}
            {displayedAllergens.map((a) => (
              <span
                key={a}
                className={cn(chipClass, 'bg-[var(--warning-bg)] text-[var(--warning)]')}
              >
                {a}
              </span>
            ))}
            {extraAllergens > 0 && (
              <span className={cn(chipClass, 'bg-[var(--warning-bg)] text-[var(--warning)]')}>
                +{extraAllergens} more
              </span>
            )}
          </div>
        )}

        {/* Row 6 — action row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-2 flex-wrap">
            {onRequestPickup && !isExpired && (
              <button
                type="button"
                onClick={(e) => onRequestPickup(donation.id, e.currentTarget)}
                aria-label={`Get pickup code for ${donation.title}`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 min-h-[44px]"
              >
                Get Pickup Code
              </button>
            )}
            {showCancelButton && onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelLoading}
                aria-label={`Cancel listing: ${donation.title}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-line text-sm font-medium text-ink-muted hover:bg-surface-soft transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {cancelLoading ? <LoadingSpinner size="sm" label="Cancelling" /> : null}
                Cancel listing
              </button>
            )}
          </div>

          {/* Report button — far right */}
          {reportStatus !== 'success' && (
            <button
              type="button"
              onClick={() => setReportOpen((v) => !v)}
              className="text-xs text-ink-quiet hover:text-ink-muted transition-colors"
              aria-expanded={reportOpen}
              aria-controls={`report-form-${donation.id}`}
            >
              Report
            </button>
          )}
          {reportStatus === 'success' && (
            <p className="text-xs text-ink-muted">Reported</p>
          )}
        </div>

        {/* Report form */}
        {reportOpen && reportStatus !== 'success' && (
          <form
            id={`report-form-${donation.id}`}
            onSubmit={handleReport}
            className="space-y-2 border-t border-line pt-3"
          >
            {reportError && (
              <Alert type="error" className="mb-1">
                {reportError}
              </Alert>
            )}
            <div>
              <label
                htmlFor={`report-cat-${donation.id}`}
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Reason
              </label>
              <select
                id={`report-cat-${donation.id}`}
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-line text-xs text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                <option value="">Select a reason…</option>
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
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Details (optional)
              </label>
              <textarea
                id={`report-desc-${donation.id}`}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value.slice(0, 500))}
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 rounded-md border border-line text-xs text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={reportStatus === 'loading' || !reportCategory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-soft border border-line text-xs font-medium text-ink hover:bg-line transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {reportStatus === 'loading' && (
                <LoadingSpinner size="sm" label="Submitting" />
              )}
              Submit report
            </button>
          </form>
        )}
      </div>
    </article>
  );
}
