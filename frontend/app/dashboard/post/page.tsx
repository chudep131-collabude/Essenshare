'use client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { apiPost, ApiException } from '@/lib/api';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/errors';
import { geocodeAddress } from '@/lib/geocode';

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
  pickup_address: string;
  pickup_lat: string;
  pickup_lng: string;
  pickup_notes: string;
  expires_at: string;
  is_halal: boolean;
  is_vegan: boolean;
  is_vegetarian: boolean;
  phone: string;
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        borderBlockStart: '1px solid var(--line)',
        paddingBlockStart: 'var(--space-xl)',
        marginBlockStart: 'var(--space-xl)',
      }}
    >
      <p
        style={{
          fontSize: 'var(--step--1)',
          color: 'var(--accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          marginBlockEnd: 'var(--space-xl)',
        }}
      >
        {label}
      </p>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export default function PostDonationPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    quantity: '',
    quantity_unit: 'portions',
    pickup_address: '',
    pickup_lat: '',
    pickup_lng: '',
    pickup_notes: '',
    expires_at: '',
    is_halal: false,
    is_vegan: false,
    is_vegetarian: false,
    phone: '',
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
        // coords filled, but keep showCoords false user doesn't need to see them
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

    if (!form.title.trim()) {
      setError('Please provide a title for your donation.');
      return;
    }
    if (!form.category) {
      setError('Please select a category.');
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (!form.pickup_address.trim()) {
      setError('Please provide a pickup address.');
      return;
    }

    setLoading(true);
    try {
      let lat = form.pickup_lat.trim() ? Number(form.pickup_lat) : NaN;
      let lng = form.pickup_lng.trim() ? Number(form.pickup_lng) : NaN;

      // If coordinates are missing or zero, geocode address automatically
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        try {
          const geoRes = await geocodeAddress(form.pickup_address);
          if (geoRes) {
            lat = geoRes.lat;
            lng = geoRes.lng;
            setForm((prev) => ({
              ...prev,
              pickup_lat: lat.toFixed(6),
              pickup_lng: lng.toFixed(6),
            }));
          }
        } catch {
          // Address geocode lookup failed
        }
      }

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        setError('Could not locate pickup address coordinates. Please click "Use my location" or enter coordinates manually.');
        setLoading(false);
        return;
      }

      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        quantity: Number(form.quantity),
        quantity_unit: form.quantity_unit,
        allergens: allergens.length > 0 ? allergens : undefined,
        is_halal: form.is_halal,
        is_vegan: form.is_vegan,
        is_vegetarian: form.is_vegetarian,
        pickup_address: form.pickup_address,
        pickup_lat: lat,
        pickup_lng: lng,
        pickup_notes: form.pickup_notes || undefined,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
        phone: form.phone || undefined,
      };
      await apiPost('/donations', payload);
      router.push('/dashboard?posted=1');
    } catch (err) {
      setError(friendlyError(err, 'Could not post your donation. Please try again.'));
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

  const pillBase: React.CSSProperties = {
    paddingInline: 'var(--space-m)',
    paddingBlock: '0.4rem',
    borderRadius: 'var(--radius-pill)',
    fontSize: 'var(--step--1)',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast)',
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
  };

  function allergenPillStyle(active: boolean): React.CSSProperties {
    return {
      ...pillBase,
      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
      background: active ? 'var(--accent-muted)' : 'var(--surface)',
      color: active ? 'var(--accent-dark)' : 'var(--ink-muted)',
    };
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left sticky image panel */}
      <div
        className="hidden lg:block lg:w-1/2"
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}
      >
        <Image
          src="/web/close-up-man-holding-box-with-food.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          aria-hidden="true"
          style={{
            objectFit: 'cover',
            objectPosition: 'center 45%',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, oklch(0% 0 0 / 0.15) 0%, oklch(0% 0 0 / 0.65) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 'var(--space-3xl)',
            left: 'var(--space-3xl)',
            right: 'var(--space-3xl)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--step--1)',
              color: 'oklch(100% 0 0 / 0.65)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 'var(--space-xs)',
            }}
          >
            Post a donation
          </p>
          <p
            style={{
              fontSize: 'var(--step-1)',
              color: 'oklch(100% 0 0)',
              fontWeight: 700,
              lineHeight: 1.25,
              textWrap: 'balance',
              marginBottom: 'var(--space-s)',
            }}
          >
            You have something someone needs. It takes less than five minutes to connect them.
          </p>
          <p
            style={{
              fontSize: 'var(--step--1)',
              color: 'oklch(100% 0 0 / 0.55)',
            }}
          >
            No charge. No approval queue for individuals.
          </p>
        </div>
      </div>

      {/* Right form column */}
      <div
        className="w-full lg:w-1/2"
        style={{
          background: 'var(--bg)',
          minHeight: '100vh',
          padding: 'var(--space-3xl) var(--space-page)',
        }}
      >
        <div style={{ maxWidth: '600px', marginInline: 'auto' }}>
          <p
            style={{
              fontSize: 'var(--step-0)',
              color: 'var(--ink-muted)',
              marginBottom: 'var(--space-xl)',
              textWrap: 'pretty',
            }}
          >
            {t('post.subtitle') || 'List surplus food or essential items so people nearby can collect them.'}
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Section 1 — What you're donating (matches FormSection pattern) */}
            <div style={{ borderBlockStart: '1px solid var(--line)', paddingBlockStart: 'var(--space-xl)', marginBlockStart: 'var(--space-xl)' }}>
              <p style={{ fontSize: 'var(--step--1)', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBlockEnd: 'var(--space-xl)' }}>
                {t('post.item_title') || "What you're donating"}
              </p>
              <div className="space-y-5">
              {/* Title */}
              <div>
                <label htmlFor="d-title" className="block text-sm font-medium text-ink mb-1">
                  {t('post.item_title') || 'Title'}{' '}
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
                  {t('post.item_desc') || 'Description'}
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
                  {t('post.category') || 'Category'}{' '}
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

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="d-qty" className="block text-sm font-medium text-ink mb-1">
                    {t('post.quantity') || 'Quantity'}{' '}
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
                    {t('post.unit') || 'Unit'}{' '}
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
              </div>  {/* close space-y-5 */}
            </div>  {/* close Section 1 outer */}
            {/* Section 2 Dietary & allergens */}
            <FormSection label={t('post.dietary') || 'Dietary & allergens'}>
              {/* Allergens */}
              <fieldset>
                <legend className="block text-sm font-medium text-ink mb-3">
                  {t('post.allergens') || 'Allergens present'}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      aria-pressed={allergens.includes(a)}
                      style={allergenPillStyle(allergens.includes(a))}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Dietary toggles */}
              <fieldset>
                <legend className="block text-sm font-medium text-ink mb-3">
                  {t('post.dietary') || 'Dietary'}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['is_halal', 'Halal'],
                      ['is_vegan', 'Vegan'],
                      ['is_vegetarian', 'Vegetarian'],
                    ] as [keyof FormState, string][]
                  ).map(([key, label]) => {
                    const active = form[key] as boolean;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setField(key, !form[key])}
                        aria-pressed={active}
                        style={allergenPillStyle(active)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </FormSection>

            {/* Section 3 Where & when */}
            <FormSection label={t('post.pickup_location') || 'Where & when'}>
              {/* Pickup address */}
              <div>
                <label htmlFor="d-addr" className="block text-sm font-medium text-ink mb-1">
                  {t('post.pickup_location') || 'Pickup address'}{' '}
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

              {/* Contact number */}
              <div>
                <label htmlFor="d-phone" className="block text-sm font-medium text-ink mb-1">
                  Contact number
                </label>
                <input
                  id="d-phone"
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={inputClass}
                  placeholder="+44 7700 900000"
                  autoComplete="tel"
                  aria-describedby="d-phone-hint"
                />
                <p id="d-phone-hint" className="mt-1 text-xs text-ink-muted">
                  Optional. Shown to recipients after they generate a pickup code so they can reach you at collection time.
                </p>
              </div>

              {/* Pickup coordinates */}
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

                {/* Coords set success indicator */}
                {!geoError && form.pickup_lat && !showCoords && (
                  <p className="text-xs text-success mb-2">
                    Location detected coordinates saved.
                  </p>
                )}

                {/* Manual coords link */}
                {!showCoords && (
                  <button
                    type="button"
                    onClick={() => setShowCoords(true)}
                    className="text-xs text-ink-muted hover:text-ink transition-colors mb-2"
                  >
                    Enter coordinates manually →
                  </button>
                )}

                {/* Lat/Lng grid only shown when showCoords or geoError */}
                {(showCoords || !!geoError) && (
                  <>
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
                      Find coordinates by right-clicking on Google Maps.
                    </p>
                  </>
                )}
              </div>

              {/* Pickup notes */}
              <div>
                <label htmlFor="d-notes" className="block text-sm font-medium text-ink mb-1">
                  {t('post.pickup_notes') || 'Pickup notes'}
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
                  {t('post.expires_at') || 'Available until'}{' '}
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
            </FormSection>

            <div style={{ marginBlockStart: 'var(--space-xl)' }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 min-h-[44px]"
                aria-busy={loading}
              >
                {loading && <LoadingSpinner size="sm" label="Posting donation" />}
                {loading ? (t('post.publishing') || 'Publishing…') : (t('post.submit') || 'Publish Surplus Listing')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
