'use client';

import { useState, useCallback } from 'react';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

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

  const inputClass =
    'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

  return (
    <div className="max-w-page mx-auto px-[var(--space-page)] py-section">
      {/* Phase notice */}
      <Alert type="info" className="mb-8">
        <strong>UI shell preview</strong> — live search coming in Phase 6. Location and filters are
        wired but the results list is a placeholder.
      </Alert>

      <h1
        className="text-step-2 font-bold text-ink mb-2"
        style={{ letterSpacing: '-0.02em' }}
      >
        Find Food Near You
      </h1>
      <p className="text-ink-muted mb-8 max-w-prose">
        Browse available surplus food donations in your area. No account required.
      </p>

      {/* Location controls */}
      <div className="bg-surface border border-line rounded-md p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            type="button"
            onClick={requestLocation}
            disabled={location.loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
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

        {location.lat && location.lng && (
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

      {/* Map placeholder */}
      <div
        className="w-full h-64 rounded-md border-2 border-dashed border-accent flex items-center justify-center mb-8 bg-accent-muted"
        role="region"
        aria-label="Map placeholder"
      >
        <p className="text-sm text-accent font-medium text-center px-4">
          Map loads here — Leaflet integration in Phase 9
        </p>
      </div>

      {/* Results skeleton */}
      <div>
        <h2
          className="text-step-1 font-semibold text-ink mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          Nearby Donations
        </h2>
        <div className="space-y-4" aria-label="Loading results" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
