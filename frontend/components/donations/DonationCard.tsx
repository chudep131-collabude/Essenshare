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
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        borderTop: `4px solid ${categoryColor}`,
        transition:
          'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <div style={{ padding: 'var(--space-l)' }}>
        {/* Urgent expiry badge — absolute, top-right, only < 4 hours */}
        {(() => {
          const msLeft = new Date(donation.expires_at).getTime() - Date.now();
          if (msLeft > 0 && msLeft < 4 * 60 * 60 * 1000) {
            return (
              <div
                style={{
                  position: 'absolute',
                  top: 'var(--space-m)',
                  right: 'var(--space-m)',
                  fontSize: 'var(--step--1)',
                  fontWeight: 600,
                  color: getExpiryColour(donation.expires_at),
                  background: 'var(--surface)',
                  border: `1.5px solid ${getExpiryColour(donation.expires_at)}`,
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.2rem 0.6rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
                aria-label={`Expires in ${timeRemaining}`}
              >
                {timeRemaining}
              </div>
            );
          }
          return null;
        })()}

        {/* Eyebrow row — category + distance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-s)',
            marginBottom: 'var(--space-xs)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--step--1)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: categoryColor,
            }}
          >
            {CATEGORY_LABELS[donation.category] ?? donation.category}
          </span>
          {donation.distance_km !== undefined && (
            <span
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-quiet)',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {donation.distance_km < 1
                ? `${Math.round(donation.distance_km * 1000)} m`
                : `${donation.distance_km.toFixed(1)} km`}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 'var(--step-1)',
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            textWrap: 'balance',
            marginBottom: 'var(--space-xs)',
          } as React.CSSProperties}
        >
          {donation.title}
        </h3>

        {/* Description — 1 line truncated */}
        {donation.description && (
          <p
            style={{
              fontSize: 'var(--step--1)',
              color: 'var(--ink-muted)',
              marginBottom: 'var(--space-xs)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {donation.description}
          </p>
        )}

        {/* Meta row — quantity · address */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            fontSize: 'var(--step--1)',
            color: 'var(--ink-muted)',
            marginBottom: 'var(--space-xs)',
            fontVariantNumeric: 'tabular-nums',
            overflow: 'hidden',
          }}
        >
          <span>
            {donation.quantity} {donation.quantity_unit}
          </span>
          <span aria-hidden="true">·</span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {donation.pickup_address}
          </span>
        </div>

        {/* Dietary + allergen chips */}
        {(donation.is_halal ||
          donation.is_vegan ||
          donation.is_vegetarian ||
          displayedAllergens.length > 0) && (
          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 'var(--space-xs)' }}>
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

        {/* Action row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-s)',
            paddingTop: 'var(--space-m)',
          }}
        >
          {/* Primary action */}
          {onRequestPickup && !isExpired && !showCancelButton && (
            <button
              type="button"
              onClick={(e) => onRequestPickup(donation.id, e.currentTarget)}
              aria-label={`Get pickup code for ${donation.title}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent)',
                color: 'var(--accent-on)',
                fontWeight: 700,
                fontSize: 'var(--step-0)',
                border: 'none',
                cursor: 'pointer',
                minHeight: '44px',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              Get Pickup Code <span aria-hidden="true">→</span>
            </button>
          )}

          {showCancelButton && onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelLoading}
              aria-label={`Cancel listing: ${donation.title}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-pill)',
                color: 'var(--error)',
                border: '1.5px solid color-mix(in oklch, var(--error) 30%, transparent)',
                background: 'transparent',
                fontWeight: 600,
                fontSize: 'var(--step-0)',
                cursor: 'pointer',
                minHeight: '44px',
                opacity: cancelLoading ? 0.5 : 1,
              }}
            >
              {cancelLoading ? <LoadingSpinner size="sm" label="Cancelling" /> : null}
              Cancel listing
            </button>
          )}

          {/* Report button far right */}
          {reportStatus !== 'success' && (
            <button
              type="button"
              onClick={() => setReportOpen((v) => !v)}
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-quiet)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                padding: '0.4rem',
              }}
              aria-expanded={reportOpen}
              aria-controls={`report-form-${donation.id}`}
            >
              Report
            </button>
          )}
          {reportStatus === 'success' && (
            <p style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)' }}>Reported</p>
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
