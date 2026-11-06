'use client';

import { useState, FormEvent } from 'react';
import type React from 'react';
import Image from 'next/image';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PasswordStrengthInput from '@/components/ui/PasswordStrengthInput';
import { apiPost, ApiException } from '@/lib/api';
import { cn } from '@/lib/utils';
import { friendlyError } from '@/lib/errors';
import { validatePasswordStrength } from '@/lib/password';
import { useTranslation } from '@/lib/i18n';
import SafetyPledgeModal from '@/components/safety/SafetyPledgeModal';
import { ShieldCheck, ExternalLink, CheckCircle2 } from 'lucide-react';

type DonorRole = 'individual' | 'business' | 'organisation' | null;

// ── Role icons 24px stroke SVGs, accent colour, consistent 1.5 stroke weight ──
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
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<DonorRole>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  function validateStep2(): boolean {
    const errs: Record<string, string> = {};
    if (role === 'individual') {
      if (!form.firstName?.trim()) errs.firstName = 'First name is required.';
      if (!form.lastName?.trim()) errs.lastName = 'Last name is required.';
    }
    if (role === 'business') {
      if (!form.businessName?.trim()) errs.businessName = 'Business name is required.';
    }
    if (role === 'organisation') {
      if (!form.orgName?.trim()) errs.orgName = 'Organisation name is required.';
    }
    if (!form.email?.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    const passwordError = validatePasswordStrength(form.password);
    if (passwordError) errs.password = passwordError;

    if (!safetyAccepted) {
      errs.safetyAccepted = t('register.agree_pledge_required') || 'You must review and accept the Food Safety Pledge to register as a donor.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleRoleSelect(selected: DonorRole) {
    setRole(selected);
    setStep(2);
    setError(null);
    setFieldErrors({});
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validateStep2()) return;
    setLoading(true);
    try {
      // Map UI field names → backend schema field names
      const backendRole = role ? ROLE_MAP[role] : null;
      const payload: Record<string, any> = {
        role:          backendRole ?? undefined,
        email:         form.email,
        password:      form.password,
        phone:         form.phone || undefined,
        country_code:  form.country_code || undefined,
        safety_accepted: safetyAccepted,
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

      const envelope = await apiPost<{ user: { id: string }; dev_otp?: string }>('/auth/register', payload);
      const uid = envelope.data?.user?.id ?? '';
      const devOtp = envelope.data?.dev_otp;
      if (devOtp && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`dev_otp_${uid}`, devOtp);
          sessionStorage.setItem('dev_otp_latest', devOtp);
        } catch {
          // sessionStorage may fail in restricted environments
        }
      }
      const devParam = devOtp ? `&dev_otp=${encodeURIComponent(devOtp)}` : '';
      window.location.href = uid ? `/register/verify?uid=${uid}${devParam}` : '/register/verify';
    } catch (err) {
      setError(friendlyError(err, 'Could not create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left image panel — hidden on mobile */}
      <div
        className="hidden lg:block lg:w-1/2"
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}
      >
        <Image
          src="/web/pexels-julia-m-cameron-6994944.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          aria-hidden="true"
          style={{
            objectFit: 'cover',
            objectPosition: 'center 40%',
          }}
        />
        {/* Gradient scrim */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, oklch(0% 0 0 / 0.15) 0%, oklch(0% 0 0 / 0.65) 100%)',
          }}
        />
        {/* Overlay text */}
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
            Join EssenShare
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
            Two minutes to set up. A lifetime of surplus turning into someone&apos;s meal.
          </p>
          <p
            style={{
              fontSize: 'var(--step--1)',
              color: 'oklch(100% 0 0 / 0.55)',
            }}
          >
            Free. Always.
          </p>
        </div>
      </div>

      {/* Right form column */}
      <div
        className="w-full lg:w-1/2"
        style={{
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 'clamp(2.5rem, 6vw, 5rem) var(--space-page)',
        }}
      >
        <div
          className="w-full transition-all duration-300"
          style={{ maxWidth: '520px' }}
        >
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
              <div className="grid grid-cols-1 gap-3.5">
                {roleCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleRoleSelect(card.id as DonorRole)}
                    className={cn(
                      'group flex items-start text-left rounded-xl border-2 p-4 sm:p-5 gap-4 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 cursor-pointer',
                      role === card.id
                        ? 'border-accent bg-accent-muted shadow-sm'
                        : 'border-line bg-surface hover:border-accent hover:bg-[oklch(96%_0.02_150)] shadow-xs'
                    )}
                    aria-pressed={role === card.id}
                  >
                    <span
                      className="shrink-0 flex items-center justify-center rounded-full bg-accent-muted text-accent w-12 h-12 group-hover:scale-105 transition-transform mt-0.5"
                      aria-hidden="true"
                    >
                      <card.Icon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className="block text-ink font-bold mb-1 text-[var(--step-0)] group-hover:text-accent-dark transition-colors"
                      >
                        {card.title}
                      </span>
                      <span
                        className="block text-ink-muted text-[var(--step--1)] leading-relaxed"
                      >
                        {card.description}
                      </span>
                    </div>
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
                <Alert
                  type="error"
                  title="Registration notice"
                  className="mb-6"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">

                {/* Individual fields */}
                {role === 'individual' && (
                  <>
                    <FormRow id="firstName" label="First name" required value={form.firstName ?? ''} onChange={(v) => { setField('firstName', v); setFieldErrors(p => ({...p, firstName: undefined})); }} error={fieldErrors.firstName} />
                    <FormRow id="lastName" label="Last name" required value={form.lastName ?? ''} onChange={(v) => { setField('lastName', v); setFieldErrors(p => ({...p, lastName: undefined})); }} error={fieldErrors.lastName} />
                  </>
                )}

                {/* Business fields */}
                {role === 'business' && (
                  <>
                    <FormRow id="businessName" label="Business name" required value={form.businessName ?? ''} onChange={(v) => { setField('businessName', v); setFieldErrors(p => ({...p, businessName: undefined})); }} error={fieldErrors.businessName} />
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
                    <FormRow id="orgName" label="Organisation name" required value={form.orgName ?? ''} onChange={(v) => { setField('orgName', v); setFieldErrors(p => ({...p, orgName: undefined})); }} error={fieldErrors.orgName} />
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
                <FormRow id="email" label="Email address" type="email" required value={form.email ?? ''} onChange={(v) => { setField('email', v); setFieldErrors(p => ({...p, email: undefined})); }} autoComplete="email" error={fieldErrors.email} />

                {/* Info banner before phone field */}
                <div
                  role="note"
                  style={{
                    background: 'var(--accent-muted)',
                    borderInlineStart: '3px solid var(--accent)',
                    padding: 'var(--space-s) var(--space-m)',
                    fontSize: 'var(--step--1)',
                    color: 'var(--ink-muted)',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  }}
                >
                  Your contact number will only be shown to recipients after they have a confirmed pickup code.
                </div>

                <FormRow id="phone" label="Contact number" type="tel" value={form.phone ?? ''} onChange={(v) => setField('phone', v)} autoComplete="tel" hint="Optional. Shown to recipients so they can contact you at collection time." />
                <PasswordStrengthInput
                  id="password"
                  label="Password"
                  required
                  value={form.password ?? ''}
                  onChange={(v) => {
                    setField('password', v);
                    if (fieldErrors.password) {
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }
                  }}
                  autoComplete="new-password"
                  error={fieldErrors.password}
                />

                {/* ── Food Safety Pledge Agreement (Required for Donors) ── */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-ink space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-ink">
                          {t('register.pledge_heading') || 'Food Safety & Quality Standard (v1.0)'}
                        </h3>
                        <p className="text-[11px] text-ink-muted">
                          {t('register.pledge_summary') || 'Essential principles to ensure all food is safe, edible, and dignified.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPledgeModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-surface text-accent hover:bg-accent-muted text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('register.read_full_pledge') || 'Read Full Terms'}</span>
                    </button>
                  </div>

                  {/* Summary bullets */}
                  <ul className="text-xs text-ink-muted space-y-1.5 pl-1">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span><strong>Wholesome & Edible:</strong> Within safe use-by limits, uncompromised quality.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span><strong>Temperature Control:</strong> Cold chain maintained (&lt;5°C chilled, &lt;-18°C frozen).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span><strong>Allergen Transparency:</strong> Major food allergens explicitly disclosed.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span><strong>Hygienic Packaging:</strong> Clean, food-grade containers and covers.</span>
                    </li>
                  </ul>

                  {/* Mandatory Checkbox */}
                  <div className="pt-2 border-t border-amber-500/20">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="safetyAgreementCheckbox"
                        checked={safetyAccepted}
                        onChange={(e) => {
                          setSafetyAccepted(e.target.checked);
                          if (fieldErrors.safetyAccepted) {
                            setFieldErrors((p) => ({ ...p, safetyAccepted: undefined }));
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-semibold text-ink leading-snug">
                        {t('register.agree_pledge') || 'I have read and agree to uphold the EssenShare Food Safety Pledge (v1.0)'} <span className="text-error" aria-label="required">*</span>
                      </span>
                    </label>
                    {fieldErrors.safetyAccepted && (
                      <p className="mt-1 text-xs text-error font-medium" role="alert">
                        {fieldErrors.safetyAccepted}
                      </p>
                    )}
                  </div>
                </div>

                <SafetyPledgeModal
                  isOpen={showPledgeModal}
                  onClose={() => setShowPledgeModal(false)}
                  onAccept={() => {
                    setSafetyAccepted(true);
                    setShowPledgeModal(false);
                    setFieldErrors((p) => ({ ...p, safetyAccepted: undefined }));
                  }}
                  alreadySigned={safetyAccepted}
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
  error?: string;
}

function FormRow({
  id, label, type = 'text', required, value, onChange, autoComplete, hint, error,
}: FormRowProps) {
  const baseClass = 'w-full px-4 py-2.5 rounded-md border text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';
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
        className={error ? `${baseClass} border-error focus:border-error` : `${baseClass} border-line focus:border-accent`}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        aria-invalid={!!error}
      />
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-error" role="alert">{error}</p>}
      {!error && hint && <p id={`${id}-hint`} className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
