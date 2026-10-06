'use client';

import { useState, FormEvent } from 'react';
import type React from 'react';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiPost, ApiException } from '@/lib/api';
import { cn } from '@/lib/utils';

type DonorRole = 'individual' | 'business' | 'organisation' | null;

// ── Role icons — 24px stroke SVGs, accent colour, consistent 1.5 stroke weight ──
function IconPerson() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  );
}

function IconStorefront() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 5 4h14l2 5.5" />
      <path d="M3 9.5h18v1.5a3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-3 3 3 3 0 0 1-3-3v-1.5Z" />
      <path d="M5 14.5V20h14v-5.5" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

function IconOrg() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <circle cx="17.5" cy="17.5" r="3.5" />
      <path d="M17.5 15.5v2l1.5 1" />
    </svg>
  );
}

interface RoleCard {
  id: DonorRole & string;
  Icon: () => React.JSX.Element;
  title: string;
  description: string;
}

const roleCards: RoleCard[] = [
  {
    id: 'individual',
    Icon: IconPerson,
    title: 'Individual Donor',
    description: 'I have surplus food from my home, allotment, or personal surplus. A Samaritan who wants to help their community.',
  },
  {
    id: 'business',
    Icon: IconStorefront,
    title: 'Business Donor',
    description: 'I represent a shop, bakery, café, restaurant, farm, or wholesaler with surplus that should reach people, not the bin.',
  },
  {
    id: 'organisation',
    Icon: IconOrg,
    title: 'Organisation / Partner',
    description: 'I represent a food bank, charity, NGO, or community group. We want to coordinate redistribution at scale.',
  },
];

// Map UI role slugs → backend role enum values
const ROLE_MAP: Record<string, string> = {
  individual:   'INDIVIDUAL_DONOR',
  business:     'BUSINESS_DONOR',
  organisation: 'ORGANIZATION',
};

const businessCategories = [
  'Bakery', 'Café / Coffee shop', 'Restaurant', 'Supermarket', 'Grocery store',
  'Farm / Producer', 'Hotel / Catering', 'Other',
];

const orgTypes = [
  'Food bank', 'Community centre', 'NGO', 'School / University',
  'Religious organisation', 'Other',
];

const inputClass =
  'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<DonorRole>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleRoleSelect(selected: DonorRole) {
    setRole(selected);
    setStep(2);
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Map UI field names → backend schema field names
      const backendRole = role ? ROLE_MAP[role] : null;
      const payload: Record<string, string | undefined> = {
        role:          backendRole ?? undefined,
        email:         form.email,
        password:      form.password,
        phone:         form.phone || undefined,
        country_code:  form.country_code || undefined,
      };

      if (role === 'individual') {
        payload.full_name = [form.firstName, form.lastName].filter(Boolean).join(' ') || undefined;
      } else if (role === 'business') {
        payload.business_name = form.businessName;
        payload.full_name     = form.contactName || undefined;
      } else if (role === 'organisation') {
        payload.org_name  = form.orgName;
        payload.full_name = form.contactName || undefined;
      }

      const envelope = await apiPost<{ user: { id: string } }>('/auth/register', payload);
      const uid = envelope.data?.user?.id ?? '';
      window.location.href = uid ? `/register/verify?uid=${uid}` : '/register/verify';
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 501) {
          setError('Registration is coming soon. Thank you for your interest!');
        } else {
          setError(err.message);
        }
      } else {
        setError('Could not connect to the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-page mx-auto px-[var(--space-page)] py-section">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-step-2 font-bold text-ink mb-2 text-center"
          style={{ letterSpacing: '-0.02em' }}
        >
          Start Donating
        </h1>
        <p className="text-ink-muted text-sm text-center mb-8">
          Five minutes to set up. A lifetime of surplus turning into someone&apos;s meal.{' '}
          <a href="/login" className="text-accent font-medium hover:text-accent-dark">
            Already registered? Sign in.
          </a>
        </p>

        {/* Step 1: Role selection */}
        {step === 1 && (
          <section aria-labelledby="role-heading">
            <h2
              id="role-heading"
              className="text-base font-semibold text-ink mb-4 text-center"
            >
              How are you contributing?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {roleCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleRoleSelect(card.id as DonorRole)}
                  className={cn(
                    'flex flex-col items-center text-center p-6 rounded-md border-2 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2',
                    role === card.id
                      ? 'border-accent bg-accent-muted'
                      : 'border-line bg-surface hover:border-accent hover:bg-accent-muted'
                  )}
                  aria-pressed={role === card.id}
                >
                  <span className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-accent-muted" aria-hidden="true">
                    <card.Icon />
                  </span>
                  <span className="text-sm font-semibold text-ink mb-1">{card.title}</span>
                  <span className="text-xs text-ink-muted leading-relaxed">{card.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2: Form fields */}
        {step === 2 && role && (
          <section aria-labelledby="form-heading">
            <div className="flex items-center justify-between mb-6">
              <h2
                id="form-heading"
                className="text-base font-semibold text-ink"
              >
                Step 2 of 2 Your details
              </h2>
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="text-sm text-accent hover:text-accent-dark underline"
              >
                ← Change role
              </button>
            </div>

            {error && (
              <Alert type="error" className="mb-6">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Individual fields */}
              {role === 'individual' && (
                <>
                  <FormRow id="firstName" label="First name" required value={form.firstName ?? ''} onChange={(v) => setField('firstName', v)} />
                  <FormRow id="lastName" label="Last name" required value={form.lastName ?? ''} onChange={(v) => setField('lastName', v)} />
                </>
              )}

              {/* Business fields */}
              {role === 'business' && (
                <>
                  <FormRow id="businessName" label="Business name" required value={form.businessName ?? ''} onChange={(v) => setField('businessName', v)} />
                  <div>
                    <label htmlFor="businessCategory" className="block text-sm font-medium text-ink mb-1">
                      Category <span className="text-error" aria-label="required">*</span>
                    </label>
                    <select
                      id="businessCategory"
                      required
                      value={form.businessCategory ?? ''}
                      onChange={(e) => setField('businessCategory', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select a category…</option>
                      {businessCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <FormRow id="contactName" label="Contact person name" required value={form.contactName ?? ''} onChange={(v) => setField('contactName', v)} />
                </>
              )}

              {/* Organisation fields */}
              {role === 'organisation' && (
                <>
                  <FormRow id="orgName" label="Organisation name" required value={form.orgName ?? ''} onChange={(v) => setField('orgName', v)} />
                  <div>
                    <label htmlFor="orgType" className="block text-sm font-medium text-ink mb-1">
                      Organisation type <span className="text-error" aria-label="required">*</span>
                    </label>
                    <select
                      id="orgType"
                      required
                      value={form.orgType ?? ''}
                      onChange={(e) => setField('orgType', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select a type…</option>
                      {orgTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <FormRow id="contactName" label="Contact person name" required value={form.contactName ?? ''} onChange={(v) => setField('contactName', v)} />
                </>
              )}

              {/* Common fields */}
              <FormRow id="email" label="Email address" type="email" required value={form.email ?? ''} onChange={(v) => setField('email', v)} autoComplete="email" />
              <FormRow id="phone" label="Phone number" type="tel" value={form.phone ?? ''} onChange={(v) => setField('phone', v)} autoComplete="tel" />
              <FormRow
                id="password"
                label="Password"
                type="password"
                required
                value={form.password ?? ''}
                onChange={(v) => setField('password', v)}
                autoComplete="new-password"
                hint="Minimum 8 characters"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
                aria-busy={loading}
              >
                {loading && <LoadingSpinner size="sm" label="Creating account" />}
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

// Reusable form row
interface FormRowProps {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  hint?: string;
}

function FormRow({
  id, label, type = 'text', required, value, onChange, autoComplete, hint,
}: FormRowProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink mb-1">
        {label}
        {required && <span className="text-error ms-1" aria-label="required">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
