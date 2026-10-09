'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import gsap from 'gsap';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiFetch } from '@/lib/api';
import { geocodeAddress } from '@/lib/geocode';
import DonationCard, { Donation } from '@/components/donations/DonationCard';
import PickupCodeModal from '@/components/donations/PickupCodeModal';

// Leaflet requires window — must be loaded client-side only
const DonationMap = dynamic(
  () => import('@/components/map/DonationMap'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: '420px', borderRadius: 'var(--radius-md)', background: 'var(--skeleton)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 'var(--step--1)', color: 'var(--ink-quiet)' }}>Loading map…</span>
      </div>
    ),
  }
);

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

type SearchState = 'idle' | 'loading' | 'data' | 'empty' | 'error';

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div
      style={{
        height: '200px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--skeleton)',
      }}
      aria-hidden="true"
    />
  );
}

export default function FindPage() {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  });
  const [category, setCategory] = useState('');
  const [distance, setDistance] = useState('5');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pickupTarget, setPickupTarget] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const pickupTriggerRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Ref tracks whether the current page change is a load-more (false = reset from filter)
  const isLoadMoreRef = useRef(false);

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

  const handleAddressSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressQuery.trim()) return;
    setAddressLoading(true);
    setAddressError(null);
    try {
      const result = await geocodeAddress(addressQuery);
      if (!result) {
        setAddressError('No results found. Try a different address or postcode.');
        return;
      }
      setLocation({ lat: result.lat, lng: result.lng, error: null, loading: false });
    } catch {
      setAddressError('Could not search that address. Please try again.');
    } finally {
      setAddressLoading(false);
    }
  }, [addressQuery]);

  // Core fetch accepts explicit page number to avoid stale closure
  const runFetch = useCallback(
    async (lat: number, lng: number, targetPage: number, append: boolean) => {
      setSearchState('loading');
      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          radius_km: distance,
          page: String(targetPage),
          limit: '20',
        });
        // category state holds uppercase enum values directly
        if (category) {
          params.set('category', category);
        }
        const envelope = await apiFetch<{ donations: Donation[]; total: number }>(
          `/donations?${params}`
        );
        const data = envelope.data;
        if (!data || data.donations.length === 0) {
          setSearchState(append ? 'data' : 'empty');
          if (!append) {
            setDonations([]);
            setTotal(0);
          }
        } else {
          setSearchState('data');
          setDonations((prev) => (append ? [...prev, ...data.donations] : data.donations));
          setTotal(data.total);
        }
      } catch {
        setSearchState('error');
      }
    },
    [distance, category]
  );

  // Pre-location preview: fetch recently listed on mount when no location
  useEffect(() => {
    (async () => {
      try {
        setSearchState('loading');
        const envelope = await apiFetch<{ donations: Donation[]; total: number }>(
          '/donations?page=1&limit=6'
        );
        const data = envelope.data;
        if (data && data.donations.length > 0) {
          setDonations(data.donations);
          setTotal(data.total);
          setSearchState('data');
        } else {
          setSearchState('idle');
        }
      } catch {
        setSearchState('idle');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger reset fetch when location or filters change
  useEffect(() => {
    if (location.lat && location.lng) {
      isLoadMoreRef.current = false;
      setPage(1);
      runFetch(location.lat, location.lng, 1, false);
    }
  }, [location.lat, location.lng, distance, category, runFetch, retryKey]);

  // Trigger append fetch when page increments via Load More
  useEffect(() => {
    if (page > 1 && isLoadMoreRef.current && location.lat && location.lng) {
      runFetch(location.lat, location.lng, page, true);
    }
  }, [page, location.lat, location.lng, runFetch]);

  // Scroll entrance animation when results arrive
  useEffect(() => {
    if (searchState !== 'data') return;
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm) return;
    const cards = resultsRef.current?.querySelectorAll('article');
    if (!cards || cards.length === 0) return;
    gsap.from(Array.from(cards), {
      y: 20,
      opacity: 0,
      duration: 0.45,
      ease: 'power3.out',
      stagger: 0.06,
    });
  }, [searchState]);

  function handleLoadMore() {
    if (!location.lat || !location.lng) return;
    isLoadMoreRef.current = true;
    setPage((prev) => prev + 1);
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

  const hasMore = donations.length < total;

  // Heading changes based on whether location is active
  const resultsHeading = location.lat ? 'Nearby Donations' : 'Recently Listed';

  return (
    <div>
      {/* ─── Full-bleed hero ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          height: 'clamp(280px, 38vh, 420px)',
          overflow: 'hidden',
        }}
      >
        {/* Background image */}
        <Image
          src="/web/pexels-julia-m-cameron-6994943.jpg"
          alt=""
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
          aria-hidden="true"
        />
        {/* Dark gradient scrim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, oklch(0% 0 0 / 0.02) 0%, oklch(0% 0 0 / 0.55) 65%, oklch(0% 0 0 / 0.82) 100%)',
          }}
          aria-hidden="true"
        />
        {/* Text + CTA overlaid at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 'var(--space-2xl) var(--space-page)',
          }}
        >
          <h1
            style={{
              fontSize: 'var(--display)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              textWrap: 'balance',
              marginBottom: 'var(--space-s)',
            } as React.CSSProperties}
          >
            Find food near you.
          </h1>
          <p
            style={{
              fontSize: 'var(--step-0)',
              color: 'rgba(255,255,255,0.75)',
              marginBottom: 'var(--space-l)',
              textWrap: 'pretty',
            } as React.CSSProperties}
          >
            Available now. No account needed. Always free.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            disabled={location.loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.5rem',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent)',
              color: 'var(--accent-on)',
              fontWeight: 700,
              fontSize: 'var(--step-0)',
              border: 'none',
              cursor: 'pointer',
              minHeight: '44px',
            }}
            aria-busy={location.loading}
          >
            {location.loading ? (
              <LoadingSpinner size="sm" label="Getting location" />
            ) : (
              <svg
                width="18"
                height="18"
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
        </div>
      </div>

      {/* ─── Sticky filter bar ───────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: '64px',
          zIndex: 10,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line)',
          padding: 'var(--space-l) var(--space-page)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-s)',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          {[
            { value: '', label: 'All' },
            { value: 'GROCERIES', label: 'Groceries' },
            { value: 'BAKERY', label: 'Bakery' },
            { value: 'PRODUCE', label: 'Produce' },
            { value: 'PREPARED_FOOD', label: 'Prepared Meals' },
            { value: 'DAIRY', label: 'Dairy' },
            { value: 'OTHER', label: 'Other' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              style={{
                border: `1.5px solid ${category === value ? 'var(--ink)' : 'var(--line)'}`,
                borderRadius: 'var(--radius-pill)',
                padding: '0.4rem 1rem',
                fontSize: 'var(--step--1)',
                fontWeight: 500,
                background: category === value ? 'var(--ink)' : 'transparent',
                color: category === value ? 'var(--surface)' : 'var(--ink)',
                whiteSpace: 'nowrap',
                minHeight: '36px',
                cursor: 'pointer',
                flexShrink: 0,
                transition:
                  'background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
              }}
              aria-pressed={category === value}
            >
              {label}
            </button>
          ))}

          {/* Distance select at end */}
          <select
            id="distance-filter"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              border: '1.5px solid var(--line)',
              borderRadius: 'var(--radius-pill)',
              padding: '0.4rem 1rem',
              fontSize: 'var(--step--1)',
              fontWeight: 500,
              background: 'var(--surface)',
              color: 'var(--ink)',
              minHeight: '36px',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
              paddingRight: '2rem',
            }}
          >
            <option value="1">1 km</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
          </select>
        </div>
      </div>

      {/* ─── Address fallback — only when GPS denied ─────────────────── */}
      {location.error && (
        <div
          style={{
            padding: 'var(--space-m) var(--space-page)',
            background: 'var(--surface-soft)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <Alert type="warning" className="mb-3">
            {location.error}
          </Alert>
          <form onSubmit={handleAddressSearch} style={{ display: 'flex', gap: 'var(--space-s)' }}>
            <label htmlFor="address-search" className="sr-only">
              Enter a city, postcode or address
            </label>
            <input
              id="address-search"
              type="text"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              placeholder="Enter a city, postcode or address…"
              className={inputClass}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={addressLoading || !addressQuery.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shrink-0"
              aria-busy={addressLoading}
            >
              {addressLoading ? <LoadingSpinner size="sm" label="Searching" /> : 'Search'}
            </button>
          </form>
          {addressError && (
            <p className="mt-2 text-xs text-error" role="alert">
              {addressError}
            </p>
          )}
        </div>
      )}

      {/* ─── Content area ────────────────────────────────────────────── */}
      <div
        className="max-w-page mx-auto"
        style={{ padding: 'var(--space-xl) var(--space-page)' }}
      >
        {/* Map — shows when there are donations with coordinates */}
        {searchState === 'data' && donations.some((d) => d.pickup_lat != null) && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <DonationMap
              donations={donations}
              userLat={location.lat}
              userLng={location.lng}
              onSelectDonation={(id) => setPickupTarget(id)}
              height="420px"
            />
          </div>
        )}

        {/* Results area */}
        <section aria-labelledby="results-heading">
          <h2
            id="results-heading"
            style={{
              fontSize: 'var(--step-0)',
              fontWeight: 600,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 'var(--space-l)',
            }}
          >
            {resultsHeading}
          </h2>

          {/* Idle prompt to share location */}
          {searchState === 'idle' && (
            <div
              style={{
                background: 'var(--surface-soft)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3xl) var(--space-page)',
                textAlign: 'center',
              }}
            >
              {/* Simple SVG bowl illustration in accent colour */}
              <svg
                width="56"
                height="56"
                viewBox="0 0 56 56"
                fill="none"
                style={{ margin: '0 auto var(--space-l)' }}
                aria-hidden="true"
              >
                <circle
                  cx="28"
                  cy="28"
                  r="20"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  fill="var(--accent-muted)"
                />
                <path
                  d="M18 28 h20"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M21 23 h14"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M22 33 h12"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p
                style={{
                  fontSize: 'var(--step-2)',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: 'var(--space-s)',
                  letterSpacing: '-0.02em',
                }}
              >
                Nothing near you yet
              </p>
              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  marginBottom: 'var(--space-xl)',
                  maxWidth: '40ch',
                  margin: '0 auto var(--space-xl)',
                }}
              >
                Share your location to see what&apos;s available nearby — or search by city.
              </p>
              <button
                type="button"
                onClick={requestLocation}
                disabled={location.loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.5rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent)',
                  color: 'var(--accent-on)',
                  fontWeight: 700,
                  fontSize: 'var(--step-0)',
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
                aria-busy={location.loading}
              >
                Use My Location
              </button>
            </div>
          )}

          {/* Loading skeleton — two-column grid matching data layout */}
          {searchState === 'loading' && (
            <div
              className="grid md:grid-cols-2"
              style={{ gap: 'var(--space-l)' }}
              aria-label="Loading results"
              aria-busy="true"
            >
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Data — two-column grid */}
          {searchState === 'data' && donations.length > 0 && (
            <div
              className="grid md:grid-cols-2"
              style={{ gap: 'var(--space-l)' }}
              ref={resultsRef}
            >
              {donations.map((donation) => (
                <DonationCard
                  key={donation.id}
                  donation={donation}
                  onRequestPickup={(id, trigger) => {
                    if (trigger) pickupTriggerRef.current = trigger;
                    setPickupTarget(id);
                  }}
                />
              ))}
            </div>
          )}

          {/* Load more below the grid */}
          {searchState === 'data' && hasMore && (
            <div style={{ paddingTop: 'var(--space-xl)', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleLoadMore}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.6rem 1.5rem',
                  borderRadius: 'var(--radius-pill)',
                  border: '1.5px solid var(--line)',
                  background: 'transparent',
                  color: 'var(--ink)',
                  fontWeight: 500,
                  fontSize: 'var(--step-0)',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Load more
              </button>
            </div>
          )}

          {/* Empty */}
          {searchState === 'empty' && (
            <div
              style={{
                background: 'var(--surface-soft)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3xl) var(--space-page)',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--step-2)',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: 'var(--space-s)',
                  letterSpacing: '-0.02em',
                }}
              >
                Nothing here right now.
              </p>
              <p
                style={{
                  fontSize: 'var(--step-0)',
                  color: 'var(--ink-muted)',
                  marginBottom: 'var(--space-xl)',
                  maxWidth: '40ch',
                  margin: '0 auto var(--space-xl)',
                }}
              >
                Check back later, or expand your search radius.
              </p>
              <button
                type="button"
                onClick={() => setDistance('25')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.6rem 1.5rem',
                  borderRadius: 'var(--radius-pill)',
                  border: '1.5px solid var(--line)',
                  background: 'transparent',
                  color: 'var(--ink)',
                  fontWeight: 500,
                  fontSize: 'var(--step-0)',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Expand to 25 km
              </button>
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
                  setRetryKey((k) => k + 1);
                  if (location.lat && location.lng) {
                    runFetch(location.lat, location.lng, page, false);
                  }
                }}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[44px]"
              >
                Try again
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Pickup code modal */}
      <PickupCodeModal
        donationId={pickupTarget}
        triggerRef={pickupTriggerRef}
        onClose={() => setPickupTarget(null)}
      />
    </div>
  );
}
