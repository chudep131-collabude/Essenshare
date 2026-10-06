'use client';

/**
 * /register/verify
 * OTP email verification page.
 *
 * After registration the backend sends a 6-digit code to the user's email.
 * The user_id is passed via URL query param: /register/verify?uid=<uuid>
 * The OTP is entered here and sent to POST /api/v1/auth/verify-email.
 *
 * If the user didn't receive the code they can request a resend (rate-limited
 * to 3 per hour on the backend).
 *
 * Note: useSearchParams() requires a Suspense boundary in Next.js 14 during
 * static generation. The inner component is wrapped accordingly.
 */

import { useState, useEffect, useRef, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiPost, ApiException } from '@/lib/api';

// ── Inner component (reads search params) ─────────────────────────────────────

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('uid') ?? '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const otpValue = otp.join('');
  const isComplete = otpValue.length === 6;

  function handleOtpChange(index: number, value: string) {
    // Accept only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isComplete || !userId) return;

    setError(null);
    setLoading(true);
    try {
      await apiPost('/auth/verify-email', { user_id: userId, otp: otpValue });
      setSuccess(true);
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

  async function handleResend() {
    if (!userId || resendCooldown > 0 || resendLoading) return;

    setResendMessage(null);
    setResendLoading(true);
    try {
      await apiPost('/auth/resend-verification', { user_id: userId });
      setResendMessage('A new code has been sent to your email.');
      setResendCooldown(60); // 60 second UI cooldown
    } catch (err) {
      if (err instanceof ApiException) {
        setResendMessage(err.message);
      } else {
        setResendMessage('Could not send. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  }

  if (!userId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)]">
        <div className="max-w-md w-full text-center">
          <p className="text-ink-muted text-sm mb-4">
            This link is missing your user ID. Please register again or
            contact support if the problem persists.
          </p>
          <Link href="/register" className="text-accent font-medium hover:text-accent-dark text-sm">
            ← Back to registration
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)]">
        <div className="max-w-md w-full text-center">
          {/* Success icon */}
          <div
            className="mx-auto mb-6 flex items-center justify-center w-16 h-16 rounded-full"
            style={{ background: 'var(--success-bg)' }}
            aria-hidden="true"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1
            className="text-step-2 font-bold text-ink mb-3"
            style={{ letterSpacing: '-0.02em' }}
          >
            Email verified
          </h1>
          <p className="text-ink-muted text-sm mb-8 leading-relaxed">
            Your email address has been confirmed. You can now sign in to
            your EssenShare account and start making a difference.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold text-sm"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-on)',
              minHeight: '44px',
              textDecoration: 'none',
            }}
          >
            Sign in to your account
          </Link>
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
          {/* Email icon */}
          <div
            className="mx-auto mb-6 flex items-center justify-center w-14 h-14 rounded-full"
            style={{ background: 'var(--accent-muted)' }}
            aria-hidden="true"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h1
            className="text-step-2 font-bold text-ink text-center mb-2"
            style={{ letterSpacing: '-0.02em' }}
          >
            Check your email
          </h1>
          <p className="text-ink-muted text-sm text-center mb-8 leading-relaxed">
            We sent a 6-digit verification code to your email address. Enter it
            below to confirm your account.
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* OTP digit inputs */}
            <fieldset className="mb-6">
              <legend className="sr-only">6-digit verification code</legend>
              <div
                className="flex gap-3 justify-center"
                onPaste={handlePaste}
                role="group"
                aria-label="Enter the 6-digit code"
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    aria-label={`Digit ${i + 1} of 6`}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    className="w-12 h-14 text-center text-xl font-bold rounded-md border-2 transition-colors focus:outline-none"
                    style={{
                      borderColor: digit ? 'var(--accent)' : 'var(--line)',
                      background: digit ? 'var(--accent-muted)' : 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: 'var(--step-2)',
                    }}
                  />
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={!isComplete || loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-on)',
                minHeight: '44px',
              }}
              aria-busy={loading}
            >
              {loading && <LoadingSpinner size="sm" label="Verifying" />}
              {loading ? 'Verifying…' : 'Verify email'}
            </button>
          </form>

          {/* Resend section */}
          <div className="mt-6 text-center">
            {resendMessage && (
              <p
                className="text-xs mb-3"
                style={{ color: resendMessage.includes('sent') ? 'var(--accent)' : 'var(--error)' }}
                role="status"
                aria-live="polite"
              >
                {resendMessage}
              </p>
            )}
            <p className="text-sm text-ink-muted">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
                className="text-accent font-medium hover:text-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading
                  ? 'Sending…'
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend code'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page export with Suspense boundary ────────────────────────────────────────
// useSearchParams() requires Suspense in Next.js 14 during static generation.

function VerifyEmailFallback() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)]">
      <div className="w-full max-w-md">
        <div
          className="rounded-lg border p-8"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-14 h-14 rounded-full animate-pulse"
              style={{ background: 'var(--skeleton)' }}
              aria-hidden="true"
            />
            <div
              className="h-6 w-48 rounded animate-pulse"
              style={{ background: 'var(--skeleton)' }}
              aria-hidden="true"
            />
            <div
              className="h-4 w-64 rounded animate-pulse"
              style={{ background: 'var(--skeleton)' }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
