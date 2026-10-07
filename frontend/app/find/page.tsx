'use client';

import { useState, useCallback, useEffect } from 'react';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiFetch } from '@/lib/api';
import DonationCard, { Donation } from '@/components/donations/DonationCard';
import PickupCodeModal from '@/components/donations/PickupCodeModal';

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

type SearchState = 'idle' | 'loading' | 'data' | 'empty' | 'error';

const CATEGORY_MAP: Record<string, string> = {
  groceries: 'GROCERIES',
  bakery: 'BAKERY',
  produce: 'PRODUCE',
  prepared: 'PREPARED_FOOD',
  dairy: 'DAIRY',
  other: 'OTHER',
};

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div
      className="bg-surface border border-line rounded-md p-4 space-y-3"
      aria-hidden="true"
    >
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-2/3" />
    </div>
  );
}

export default function FindPage() {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  });
  const [manualLocation, setManualLocation] = useState('');
  const [category, setCategory] = useState('');
  const [distance, setDistance] = useState('5');

  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pickupTarget, setPickupTarget] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation((s) => ({
        ...s,
        error: 'Geolocation is not supported by your browser.',
      }));
      return;
    }
    setLocation((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setLocation({
          lat: null,
          lng: null,
          error:
            err.code === 1
              ? 'Location access denied. You can enter your area below instead.'
              : 'Could not get your location. Please enter it manually.',
          loading: false,
        });
      },
      { timeout: 10_000 }
    );
  }, []);

  async function fetchDonations(lat: number, lng: number, resetPage = false) {
    const currentPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);
    setSearchState('loading');
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius_km: distance,
        page: String(currentPage),
        limit: '20',
      });
      if (category && CATEGORY_MAP[category]) {
        params.set('category', CATEGORY_MAP[category]);
      }
      const envelope = await apiFetch<{ donations: Donation[]; total: number }>(
        `/donations?${params}`
      );
      const data = envelope.data;
      if (!data || data.donations.length === 0) {
        setSearchState('empty');
        setDonations([]);
        setTotal(0);
      } else {
        setSearchState('data');
        if (resetPage) {
          setDonations(data.donations);
        } else {
          setDonations((prev) => [...prev, ...data.donations]);
        }
        setTotal(data.total);
      }
    } catch {
      setSearchState('error');
    }
  }

  // Trigger re-fetch when location or filters change
  useEffect(() => {
    if (location.lat && location.lng) {
      fetchDonations(location.lat, location.lng, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng, distance, category]);

  const inputClass =
    'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

  const hasMore = donations.length < total;

  return (
    <div className="max-w-page mx-auto px-[var(--space-page)] py-section">
      <h1
        className="text-step-2 font-bold text-ink mb-2"
        style={{ letterSpacing: '-0.02em' }}
      >
        Find Food Near You
      </h1>
      <p className="text-ink-muted mb-8 max-w-prose" style={{ textWrap: 'pretty' } as React.CSSProperties}>
        See what is available within walking distance right now. No account needed. No means test.
        Open to everyone, always free.
      </p>

      {/* Location controls */}
      <div className="bg-surface border border-line rounded-md p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            type="button"
            onClick={requestLocation}
            disabled={location.loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 min-h-[44px]"
            aria-busy={location.loading}
          >
            {location.loading ? (
              <LoadingSpinner size="sm" label="Getting location" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
            Use My Location
          </button>

          <div className="flex-1">
            <label htmlFor="manual-location" className="sr-only">
              Enter your city or postcode
            </label>
            <input
              id="manual-location"
              type="text"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              placeholder="Or enter city / postcode…"
              className={inputClass}
            />
          </div>
        </div>

        {location.error && (
          <Alert type="warning" className="mb-4">
            {location.error}
          </Alert>
        )}

        {location.lat && location.lng && searchState !== 'idle' && (
          <Alert type="success" className="mb-4">
            Location found — searching within {distance} km…
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label
              htmlFor="category-filter"
              className="block text-xs font-medium text-ink-muted mb-1"
            >
              Category
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">All categories</option>
              <option value="groceries">Groceries</option>
              <option value="bakery">Bakery &amp; Café</option>
              <option value="produce">Fresh Produce</option>
              <option value="prepared">Prepared Meals</option>
              <option value="dairy">Dairy</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="distance-filter"
              className="block text-xs font-medium text-ink-muted mb-1"
            >
              Distance
            </label>
            <select
              id="distance-filter"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className={inputClass}
            >
              <option value="1">Within 1 km</option>
              <option value="2">Within 2 km</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results area */}
      <section aria-labelledby="results-heading">
        <h2
          id="results-heading"
          className="text-step-1 font-semibold text-ink mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          Nearby Donations
        </h2>

        {/* Idle — prompt to share location */}
        {searchState === 'idle' && (
          <div className="py-16 text-center border border-dashed border-line rounded-md">
            <svg
              className="w-10 h-10 text-ink-muted mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-ink-muted text-sm">
              Share your location to see what&apos;s available nearby.
            </p>
          </div>
        )}

        {/* Loading — 3 skeleton cards */}
        {searchState === 'loading' && (
          <div className="space-y-4" aria-label="Loading results" aria-busy="true">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Data — real results */}
        {searchState === 'data' && donations.length > 0 && (
          <div className="space-y-4">
            {donations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                onRequestPickup={(id) => setPickupTarget(id)}
              />
            ))}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    if (location.lat && location.lng) {
                      fetchDonations(location.lat, location.lng, false);
                    }
                  }}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-md border border-line text-sm font-medium text-ink hover:bg-surface-soft transition-colors min-h-[44px]"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty */}
        {searchState === 'empty' && (
          <div className="py-16 text-center border border-dashed border-line rounded-md">
            <svg
              className="w-10 h-10 text-ink-muted mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-ink font-medium mb-1">Nothing available nearby right now.</p>
            <p className="text-ink-muted text-sm">
              Try expanding the distance or checking back later.
            </p>
          </div>
        )}

        {/* Error */}
        {searchState === 'error' && (
          <div className="py-12 text-center">
            <Alert type="error" className="mb-4 text-left">
              Could not load results. Please check your connection and try again.
            </Alert>
            <button
              type="button"
              onClick={() => {
                if (location.lat && location.lng) {
                  fetchDonations(location.lat, location.lng, true);
                }
              }}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[44px]"
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {/* Pickup code modal */}
      <PickupCodeModal donationId={pickupTarget} onClose={() => setPickupTarget(null)} />
    </div>
  );
}
