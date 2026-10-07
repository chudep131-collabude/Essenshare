'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiPost, ApiException } from '@/lib/api';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

const ALLERGENS = ['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Soy', 'Fish', 'Shellfish', 'Sesame'];

const CATEGORIES = [
  { value: 'PREPARED_FOOD', label: 'Prepared Meals' },
  { value: 'GROCERIES', label: 'Groceries' },
  { value: 'PRODUCE', label: 'Fresh Produce' },
  { value: 'BAKERY', label: 'Bakery' },
  { value: 'DAIRY', label: 'Dairy' },
  { value: 'BEVERAGES', label: 'Beverages' },
  { value: 'NON_FOOD_ESSENTIALS', label: 'Non-Food Essentials' },
  { value: 'OTHER', label: 'Other' },
];

const UNITS = ['portions', 'kg', 'litres', 'items', 'boxes', 'bags'];

interface FormState {
  title: string;
  description: string;
  category: string;
  quantity: string;
  quantity_unit: string;
  weight_kg: string;
  pickup_address: string;
  pickup_lat: string;
  pickup_lng: string;
  pickup_notes: string;
  expires_at: string;
  is_halal: boolean;
  is_vegan: boolean;
  is_vegetarian: boolean;
}

export default function PostDonationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    quantity: '',
    quantity_unit: 'portions',
    weight_kg: '',
    pickup_address: '',
    pickup_lat: '',
    pickup_lng: '',
    pickup_notes: '',
    expires_at: '',
    is_halal: false,
    is_vegan: false,
    is_vegetarian: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?next=/dashboard/post');
    }
  }, [user, authLoading, router]);

  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          pickup_lat: pos.coords.latitude.toFixed(6),
          pickup_lng: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === 1
            ? 'Location access denied. Please enter coordinates manually.'
            : 'Could not get your location. Please enter coordinates manually.'
        );
        setGeoLoading(false);
      },
      { timeout: 10_000 }
    );
  }

  function setField(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAllergen(a: string) {
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        quantity: Number(form.quantity),
        quantity_unit: form.quantity_unit,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
        is_halal: form.is_halal,
        is_vegan: form.is_vegan,
        is_vegetarian: form.is_vegetarian,
        pickup_address: form.pickup_address,
        pickup_lat: Number(form.pickup_lat),
        pickup_lng: Number(form.pickup_lng),
        pickup_notes: form.pickup_notes || undefined,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      };
      await apiPost('/donations', payload);
      router.push('/dashboard?posted=1');
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Could not post your donation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-page mx-auto px-[var(--space-page)] py-section">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-step-2 font-bold text-ink mb-2"
          style={{ letterSpacing: '-0.02em', textWrap: 'balance' } as React.CSSProperties}
        >
          Post a Donation
        </h1>
        <p className="text-ink-muted text-sm mb-8">
          List surplus food or essential items so people nearby can collect them.
        </p>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="d-title" className="block text-sm font-medium text-ink mb-1">
              Title{' '}
              <span className="text-error" aria-label="required">
                *
              </span>
            </label>
            <input
              id="d-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              className={inputClass}
              placeholder="e.g. Fresh bread from today"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="d-desc" className="block text-sm font-medium text-ink mb-1">
              Description
            </label>
            <textarea
              id="d-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className={cn(inputClass, 'resize-none')}
              placeholder="Any additional details…"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="d-cat" className="block text-sm font-medium text-ink mb-1">
              Category{' '}
              <span className="text-error" aria-label="required">
                *
              </span>
            </label>
            <select
              id="d-cat"
              required
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              className={inputClass}
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-qty" className="block text-sm font-medium text-ink mb-1">
                Quantity{' '}
                <span className="text-error" aria-label="required">
                  *
                </span>
              </label>
              <input
                id="d-qty"
                type="number"
                required
                min={1}
                value={form.quantity}
                onChange={(e) => setField('quantity', e.target.value)}
                className={inputClass}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            <div>
              <label htmlFor="d-unit" className="block text-sm font-medium text-ink mb-1">
                Unit{' '}
                <span className="text-error" aria-label="required">
                  *
                </span>
              </label>
              <select
                id="d-unit"
                value={form.quantity_unit}
                onChange={(e) => setField('quantity_unit', e.target.value)}
                className={inputClass}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label htmlFor="d-weight" className="block text-sm font-medium text-ink mb-1">
              Approximate weight (kg)
            </label>
            <input
              id="d-weight"
              type="number"
              step="0.1"
              min={0}
              value={form.weight_kg}
              onChange={(e) => setField('weight_kg', e.target.value)}
              className={inputClass}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </div>

          {/* Allergens */}
          <fieldset>
            <legend className="block text-sm font-medium text-ink mb-2">Allergens present</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALLERGENS.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allergens.includes(a)}
                    onChange={() => toggleAllergen(a)}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  {a}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Dietary */}
          <fieldset>
            <legend className="block text-sm font-medium text-ink mb-2">Dietary</legend>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['is_halal', 'Halal'],
                  ['is_vegan', 'Vegan'],
                  ['is_vegetarian', 'Vegetarian'],
                ] as [keyof FormState, string][]
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key] as boolean}
                    onChange={(e) => setField(key, e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Pickup address */}
          <div>
            <label htmlFor="d-addr" className="block text-sm font-medium text-ink mb-1">
              Pickup address{' '}
              <span className="text-error" aria-label="required">
                *
              </span>
            </label>
            <input
              id="d-addr"
              type="text"
              required
              value={form.pickup_address}
              onChange={(e) => setField('pickup_address', e.target.value)}
              className={inputClass}
              placeholder="Street address, city"
            />
          </div>

          {/* Lat / Lng */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="block text-sm font-medium text-ink">
                Pickup coordinates{' '}
                <span className="text-error" aria-label="required">*</span>
              </span>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line text-xs font-medium text-ink-muted hover:bg-surface-soft transition-colors disabled:opacity-50 min-h-[36px]"
                aria-busy={geoLoading}
              >
                {geoLoading ? (
                  <LoadingSpinner size="sm" label="Getting location" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {geoLoading ? 'Detecting…' : 'Use my location'}
              </button>
            </div>
            {geoError && (
              <p className="text-xs text-error mb-2" role="alert">{geoError}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-lat" className="block text-xs font-medium text-ink-muted mb-1">
                  Latitude
                </label>
                <input
                  id="d-lat"
                  type="number"
                  step="any"
                  required
                  value={form.pickup_lat}
                  onChange={(e) => setField('pickup_lat', e.target.value)}
                  className={inputClass}
                  placeholder="51.5074"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
              <div>
                <label htmlFor="d-lng" className="block text-xs font-medium text-ink-muted mb-1">
                  Longitude
                </label>
                <input
                  id="d-lng"
                  type="number"
                  step="any"
                  required
                  value={form.pickup_lng}
                  onChange={(e) => setField('pickup_lng', e.target.value)}
                  className={inputClass}
                  placeholder="-0.1278"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Click &ldquo;Use my location&rdquo; to fill these automatically, or find them by right-clicking on Google Maps.
            </p>
          </div>

          {/* Pickup notes */}
          <div>
            <label htmlFor="d-notes" className="block text-sm font-medium text-ink mb-1">
              Pickup notes
            </label>
            <textarea
              id="d-notes"
              rows={2}
              value={form.pickup_notes}
              onChange={(e) => setField('pickup_notes', e.target.value)}
              className={cn(inputClass, 'resize-none')}
              placeholder="e.g. Ring the bell, ask for Maria"
            />
          </div>

          {/* Expires at */}
          <div>
            <label htmlFor="d-expires" className="block text-sm font-medium text-ink mb-1">
              Available until{' '}
              <span className="text-error" aria-label="required">
                *
              </span>
            </label>
            <input
              id="d-expires"
              type="datetime-local"
              required
              value={form.expires_at}
              onChange={(e) => setField('expires_at', e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 min-h-[44px]"
            aria-busy={loading}
          >
            {loading && <LoadingSpinner size="sm" label="Posting donation" />}
            {loading ? 'Posting…' : 'Post donation'}
          </button>
        </form>
      </div>
    </div>
  );
}
