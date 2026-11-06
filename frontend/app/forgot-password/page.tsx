'use client';

/**
 * /forgot-password
 * Step 1 of password reset: user enters their email.
 *
 * The backend always returns the same success message whether the email
 * exists or not (enumeration prevention). We reflect that here the user
 * sees a confirmation regardless and is instructed to check their email.
 */

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiPost, ApiException } from '@/lib/api';

const inputClass =
  'w-full px-4 py-2.5 rounded-md border text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:border-accent transition-colors';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ dev_otp?: string }>('/auth/forgot-password', { email });
      if (res.data?.dev_otp) {
        setDevOtp(res.data.dev_otp);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('dev_reset_otp', res.data.dev_otp);
        }
      }
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Could not connect to the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)]">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-full"
            style={{ background: 'var(--accent-muted)' }}
            aria-hidden="true"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1
            className="text-step-2 font-bold text-ink mb-3"
            style={{ letterSpacing: '-0.02em' }}
          >
            Check your email
          </h1>
          <p className="text-ink-muted text-sm leading-relaxed mb-6">
            If an account exists with that address, we have sent a 6-digit reset
            code. It is valid for 15 minutes.
          </p>

          {devOtp && (
            <div className="mb-6 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-left">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Local Testing Mode
              </div>
              <p className="text-ink-muted">
                Your password reset code: <strong className="font-mono text-ink text-sm tracking-widest">{devOtp}</strong>
              </p>
            </div>
          )}

          <Link
            href={devOtp ? `/reset-password?dev_otp=${encodeURIComponent(devOtp)}` : '/reset-password'}
            className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-sm mb-4"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-on)',
              minHeight: '44px',
              textDecoration: 'none',
            }}
          >
            Enter the reset code
          </Link>
          <p className="text-xs text-ink-muted mt-4">
            Wrong email?{' '}
            <button
              type="button"
              onClick={() => { setSubmitted(false); setEmail(''); }}
              className="text-accent hover:text-accent-dark font-medium"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)] py-section">
      <div className="w-full max-w-md">
        <div
          className="rounded-lg border p-8"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--line)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Lock icon */}
          <div
            className="mx-auto mb-6 flex items-center justify-center w-14 h-14 rounded-full"
            style={{ background: 'var(--accent-muted)' }}
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1
            className="text-step-2 font-bold text-ink text-center mb-2"
            style={{ letterSpacing: '-0.02em' }}
          >
            Forgot your password?
          </h1>
          <p className="text-ink-muted text-sm text-center mb-8 leading-relaxed">
            Enter your email address and we will send you a reset code if an
            account exists.
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-ink mb-1">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                style={{ borderColor: 'var(--line)' }}
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={!email || loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-on)',
                minHeight: '44px',
              }}
              aria-busy={loading}
            >
              {loading && <LoadingSpinner size="sm" label="Sending reset code" />}
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Remembered it?{' '}
            <Link href="/login" className="text-accent font-medium hover:text-accent-dark">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
