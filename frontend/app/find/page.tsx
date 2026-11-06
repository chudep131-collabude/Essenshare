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
import { useTranslation } from '@/lib/i18n';
import { formatDistance } from '@/lib/units';
import {
  MapPin,
  Leaf,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

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
      className="flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden shadow-xs animate-pulse"
      aria-hidden="true"
    >
      <div className="aspect-[16/10] w-full bg-[var(--skeleton)]" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 bg-[var(--skeleton)] rounded" />
        <div className="h-4 w-1/2 bg-[var(--skeleton)] rounded" />
        <div className="h-10 w-full bg-[var(--skeleton)] rounded-full mt-4" />
      </div>
    </div>
  );
}

export default function FindPage() {
  const { t, locale, unitSystem } = useTranslation();
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  });
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

  // Dietary and view mode filter states
  const [onlyHalal, setOnlyHalal] = useState(false);
  const [onlyVegan, setOnlyVegan] = useState(false);
  const [onlyVegetarian, setOnlyVegetarian] = useState(false);
  const [viewMode, setViewMode] = useState<'both' | 'grid' | 'map'>('both');

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
        try {
          localStorage.setItem('ess_user_lat', String(pos.coords.latitude));
          localStorage.setItem('ess_user_lng', String(pos.coords.longitude));
        } catch {
          // Ignore
        }
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
              ? 'Location access denied. You can enter your area above instead.'
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
        const envelope = await apiFetch<{ donations: Donation[]; total: number }>(
          `/donations?${params}`
        );
        const data = envelope.data;
        if (!data || data.donations.length === 0) {
          // If local radius has no items (e.g. GPS outside test area), fall back to all active listings
          const allEnvelope = await apiFetch<{ donations: Donation[]; total: number }>(
            '/donations?page=1&limit=20'
          );
          if (allEnvelope.data && allEnvelope.data.donations.length > 0) {
            setSearchState('data');
            setDonations(allEnvelope.data.donations);
            setTotal(allEnvelope.data.total);
          } else {
            setSearchState(append ? 'data' : 'empty');
            if (!append) {
              setDonations([]);
              setTotal(0);
            }
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
    [distance]
  );

  // Auto-detect user location on mount & show listings automatically
  useEffect(() => {
    // 1. Preload active listings immediately
    (async () => {
      try {
        setSearchState('loading');
        const envelope = await apiFetch<{ donations: Donation[]; total: number }>(
          '/donations?page=1&limit=20'
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

    // 2. Automatically request location so all listings near user show automatically
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setLocation((s) => ({ ...s, loading: true }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            error: null,
            loading: false,
          });
        },
        () => {
          setLocation((s) => ({ ...s, loading: false }));
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  // Trigger reset fetch when location or distance changes
  useEffect(() => {
    if (location.lat && location.lng) {
      isLoadMoreRef.current = false;
      setPage(1);
      runFetch(location.lat, location.lng, 1, false);
    }
  }, [location.lat, location.lng, distance, runFetch, retryKey]);

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
  const resultsHeading = location.lat ? t('find.nearby_heading') : t('find.recent_heading');

  const filteredDonations = donations.filter((d) => {
    if (onlyHalal && !d.is_halal) return false;
    if (onlyVegan && !d.is_vegan) return false;
    if (onlyVegetarian && !d.is_vegetarian && !d.is_vegan) return false;
    return true;
  });

  return (
    <div>
      {/* ─── Full-bleed hero ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          minHeight: 'clamp(340px, 46vh, 440px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
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
              'linear-gradient(to bottom, oklch(0% 0 0 / 0.02) 0%, oklch(0% 0 0 / 0.55) 65%, oklch(0% 0 0 / 0.85) 100%)',
          }}
          aria-hidden="true"
        />
        {/* Text + CTA overlaid at bottom */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
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
            {t('find.heading')}
          </h1>
          <p
            style={{
              fontSize: 'var(--step-0)',
              color: 'rgba(255,255,255,0.75)',
              marginBottom: 'var(--space-l)',
              textWrap: 'pretty',
            } as React.CSSProperties}
          >
            {t('find.subheading')}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-2xl">
            <button
              type="button"
              onClick={requestLocation}
              disabled={location.loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                whiteSpace: 'nowrap',
              }}
              aria-busy={location.loading}
            >
              {location.loading ? (
                <LoadingSpinner size="sm" label={t('find.getting_location')} />
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
              {t('find.use_location')}
            </button>
            <span className="hidden sm:inline text-white/60 text-xs font-medium">{t('find.or')}</span>
            <form onSubmit={handleAddressSearch} className="flex-1 flex gap-2">
              <label htmlFor="hero-address-search" className="sr-only">
                {t('find.search_address_placeholder')}
              </label>
              <input
                id="hero-address-search"
                type="text"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                placeholder={t('find.search_address_placeholder')}
                className="w-full px-4 py-2.5 rounded-full border border-white/30 bg-black/40 text-white placeholder:text-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                disabled={addressLoading || !addressQuery.trim()}
                className="px-5 py-2.5 rounded-full bg-white text-ink font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-50 min-h-[44px] shrink-0"
                aria-busy={addressLoading}
              >
                {addressLoading ? <LoadingSpinner size="sm" label={t('common.search')} /> : t('common.search')}
              </button>
            </form>
          </div>
          {addressError && (
            <p className="mt-2 text-xs text-red-300 font-medium" role="alert">
              {addressError}
            </p>
          )}
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
              {t('find.search_address_placeholder')}
            </label>
            <input
              id="address-search"
              type="text"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              placeholder={t('find.search_address_placeholder')}
              className={inputClass}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={addressLoading || !addressQuery.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shrink-0"
              aria-busy={addressLoading}
            >
              {addressLoading ? <LoadingSpinner size="sm" label={t('common.search')} /> : t('common.search')}
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
        {/* Map — conditionally rendered based on viewMode and available coordinates */}
        {viewMode !== 'grid' && filteredDonations.some((d) => d.pickup_lat != null) && (
          <div style={{ marginBottom: 'var(--space-l)' }}>
            <DonationMap
              donations={filteredDonations}
              userLat={location.lat}
              userLng={location.lng}
              onSelectDonation={(id) => setPickupTarget(id)}
              height="420px"
            />
          </div>
        )}

        {/* ─── Community Food Toolbar: Dietary Filters & View Options ─── */}
        <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-wrap items-center justify-between gap-4">
          {/* Left: Dietary Preferences */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Dietary Filter:</span>
            </span>

            <button
              type="button"
              onClick={() => setOnlyHalal((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                onlyHalal
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-[var(--surface-soft)] text-[var(--ink-muted)] border border-[var(--line)] hover:border-[var(--line-strong)]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Halal</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyVegan((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                onlyVegan
                  ? 'bg-green-500/15 text-green-800 dark:text-green-300 border border-green-500/40 font-bold'
                  : 'bg-[var(--surface-soft)] text-[var(--ink-muted)] border border-[var(--line)] hover:border-[var(--line-strong)]'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Vegan</span>
            </button>

            <button
              type="button"
              onClick={() => setOnlyVegetarian((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                onlyVegetarian
                  ? 'bg-lime-500/15 text-lime-800 dark:text-lime-300 border border-lime-500/40 font-bold'
                  : 'bg-[var(--surface-soft)] text-[var(--ink-muted)] border border-[var(--line)] hover:border-[var(--line-strong)]'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Vegetarian</span>
            </button>

            {(onlyHalal || onlyVegan || onlyVegetarian) && (
              <button
                type="button"
                onClick={() => {
                  setOnlyHalal(false);
                  setOnlyVegan(false);
                  setOnlyVegetarian(false);
                }}
                className="text-xs text-[var(--accent)] hover:underline ml-1 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right: View mode & Radius */}
          <div className="flex items-center gap-3">
            {/* View Switcher with proper vector icons */}
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  viewMode === 'both' ? 'bg-[var(--surface)] text-[var(--accent)] font-bold shadow-xs' : 'text-[var(--ink-muted)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Map & Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[var(--surface)] text-[var(--accent)] font-bold shadow-xs' : 'text-[var(--ink-muted)]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  viewMode === 'map' ? 'bg-[var(--surface)] text-[var(--accent)] font-bold shadow-xs' : 'text-[var(--ink-muted)]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>

            {/* Distance radius selector */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin className="w-3.5 h-3.5 text-[var(--ink-quiet)]" />
              <label htmlFor="distance-filter" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)', fontWeight: 500 }}>
                {t('find.radius_label')}
              </label>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <select
                  id="distance-filter"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  style={{
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '0.35rem 2rem 0.35rem 0.85rem',
                    fontSize: 'var(--step--1)',
                    fontWeight: 500,
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    minHeight: '34px',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                  }}
                >
                  <option value="1">{formatDistance(1, unitSystem, locale)}</option>
                  <option value="2">{formatDistance(2, unitSystem, locale)}</option>
                  <option value="5">{formatDistance(5, unitSystem, locale)}</option>
                  <option value="10">{formatDistance(10, unitSystem, locale)}</option>
                  <option value="25">{formatDistance(25, unitSystem, locale)}</option>
                  <option value="50">{formatDistance(50, unitSystem, locale)}</option>
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Results area */}
        <section aria-labelledby="results-heading">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="results-heading"
              style={{
                fontSize: 'var(--step-0)',
                fontWeight: 600,
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: 0,
              }}
            >
              {resultsHeading}
            </h2>
            <span className="text-xs text-[var(--ink-quiet)] tabular-nums">
              Showing {filteredDonations.length} of {donations.length} items
            </span>
          </div>

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
                {t('find.heading')}
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
                {t('find.subheading')}
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
                {t('find.use_location')}
              </button>
            </div>
          )}

          {/* Loading skeleton — 3+ in a row on larger displays, 2 in a row on mobile */}
          {searchState === 'loading' && (
            <div
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
              aria-label="Loading results"
              aria-busy="true"
            >
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Data — conditionally rendered if viewMode !== 'map' */}
          {viewMode !== 'map' && searchState === 'data' && (
            filteredDonations.length > 0 ? (
              <div
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
                ref={resultsRef}
              >
                {filteredDonations.map((donation) => (
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
            ) : (
              <div className="py-12 px-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] text-center">
                <p className="text-base font-bold text-[var(--ink)] mb-1">
                  No surplus items match your selected filters
                </p>
                <p className="text-xs text-[var(--ink-muted)] mb-4 max-w-sm mx-auto">
                  Try clearing dietary tags or switching to &ldquo;All Surplus&rdquo; to see everything available nearby.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyHalal(false);
                    setOnlyVegan(false);
                    setOnlyVegetarian(false);
                  }}
                  className="px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--accent-on)] text-xs font-semibold hover:bg-[var(--accent-dark)] transition-colors cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )
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
                {t('find.load_more')}
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
                {t('find.empty_title')}
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
                {t('find.empty_desc')}
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
                {t('find.expand_to_25')}
              </button>
            </div>
          )}

          {/* Error */}
          {searchState === 'error' && (
            <div className="py-12 text-center">
              <Alert type="error" className="mb-4 text-left">
                {t('find.error_loading')}
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
                {t('find.try_again')}
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
