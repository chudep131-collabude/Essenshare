'use client';

import { useState, FormEvent } from 'react';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiFetch, ApiException } from '@/lib/api';
import { cn } from '@/lib/utils';

type DonorRole = 'individual' | 'business' | 'organisation' | null;

interface RoleCard {
  id: DonorRole & string;
  icon: string;
  title: string;
  description: string;
}

const roleCards: RoleCard[] = [
  {
    id: 'individual',
    icon: '👤',
    title: 'Individual Donor',
    description: 'I have surplus food from my home, allotment, or personal surplus.',
  },
  {
    id: 'business',
    icon: '🏪',
    title: 'Business Donor',
    description: 'I represent a shop, bakery, café, restaurant, or other business.',
  },
  {
    id: 'organisation',
    icon: '🏢',
    title: 'Organisation',
    description: 'I represent a food bank, charity, NGO, or community group.',
  },
];

const businessCategories = [
  'Bakery', 'Café / Coffee shop', 'Restaurant', 'Supermarket', 'Grocery store',
  'Farm / Producer', 'Hotel / Catering', 'Other',
];

const orgTypes = [
  'Food bank', 'Community centre', 'NGO', 'School / University',
  'Religious organisation', 'Other',
];

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
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ role, ...form }),
      });
      window.location.href = '/register/verify';
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-text-base mb-2 text-center">
        Register as a Donor
      </h1>
      <p className="text-text-muted text-sm text-center mb-8">
        Already have an account?{' '}
        <a href="/login" className="text-primary font-medium hover:text-primary-dark">
          Sign in
        </a>
      </p>

      {/* Step 1: Role selection */}
      {step === 1 && (
        <section aria-labelledby="role-heading">
          <h2 id="role-heading" className="text-base font-semibold text-text-base mb-4 text-center">
            Step 1 of 2 — Who are you registering as?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {roleCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleRoleSelect(card.id as DonorRole)}
                className={cn(
                  'flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  role === card.id
                    ? 'border-primary bg-primary-light'
                    : 'border-border-base bg-surface hover:border-primary hover:bg-primary-light'
                )}
                aria-pressed={role === card.id}
              >
                <span className="text-3xl mb-3" aria-hidden="true">{card.icon}</span>
                <span className="text-sm font-semibold text-text-base mb-1">{card.title}</span>
                <span className="text-xs text-text-muted leading-relaxed">{card.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: Form fields */}
      {step === 2 && role && (
        <section aria-labelledby="form-heading">
          <div className="flex items-center justify-between mb-6">
            <h2 id="form-heading" className="text-base font-semibold text-text-base">
              Step 2 of 2 — Your details
            </h2>
            <button
              type="button"
              onClick={() => { setStep(1); setError(null); }}
              className="text-sm text-primary hover:text-primary-dark underline"
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
                  <label htmlFor="businessCategory" className="block text-sm font-medium text-text-base mb-1">
                    Category <span className="text-error" aria-label="required">*</span>
                  </label>
                  <select
                    id="businessCategory"
                    required
                    value={form.businessCategory ?? ''}
                    onChange={(e) => setField('businessCategory', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border-base text-sm text-text-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                  <label htmlFor="orgType" className="block text-sm font-medium text-text-base mb-1">
                    Organisation type <span className="text-error" aria-label="required">*</span>
                  </label>
                  <select
                    id="orgType"
                    required
                    value={form.orgType ?? ''}
                    onChange={(e) => setField('orgType', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border-base text-sm text-text-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-busy={loading}
            >
              {loading && <LoadingSpinner size="sm" label="Creating account" />}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </section>
      )}
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
      <label htmlFor={id} className="block text-sm font-medium text-text-base mb-1">
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
        className="w-full px-4 py-2.5 rounded-lg border border-border-base text-sm text-text-base placeholder:text-text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
