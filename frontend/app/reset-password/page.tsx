'use client';

/**
 * /reset-password
 * Step 2 of password reset: user enters the 6-digit OTP from email
 * and their new password.
 *
 * Sends to POST /api/v1/auth/reset-password with { otp, new_password }.
 * On success redirects to /login with a confirmation message via query param.
 */

import { useState, useRef, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PasswordStrengthInput from '@/components/ui/PasswordStrengthInput';
import { apiPost, ApiException } from '@/lib/api';
import { validatePasswordStrength } from '@/lib/password';

const inputClass =
  'w-full px-4 py-2.5 rounded-md border text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:border-accent transition-colors';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const urlDevOtp = searchParams.get('dev_otp') ?? '';

  const [devCode, setDevCode] = useState<string | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let code = urlDevOtp;
    if (!code && typeof window !== 'undefined') {
      code = sessionStorage.getItem('dev_reset_otp') || '';
    }
    if (code && code.length === 6) {
      setDevCode(code);
      setOtp(code.split(''));
    }
    inputRefs.current[0]?.focus();
  }, [urlDevOtp]);

  const otpValue = otp.join('');
  const isOtpComplete = otpValue.length === 6;

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError(null);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
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
    setError(null);

    if (!isOtpComplete) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/auth/reset-password', { otp: otpValue, new_password: newPassword });
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

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)]">
        <div className="w-full max-w-md text-center">
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
            Password updated
          </h1>
          <p className="text-ink-muted text-sm leading-relaxed mb-8">
            Your password has been reset successfully. All existing sessions
            have been signed out for your security.
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
            Sign in with new password
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
          <h1
            className="text-step-2 font-bold text-ink text-center mb-2"
            style={{ letterSpacing: '-0.02em' }}
          >
            Reset your password
          </h1>
          <p className="text-ink-muted text-sm text-center mb-8 leading-relaxed">
            Enter the 6-digit code from your email, then choose a new password.
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Local testing banner */}
          {devCode && (
            <div className="mb-6 p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Local Testing Mode
                </div>
                <p className="text-ink-muted text-xs">
                  Your reset code: <strong className="font-mono text-ink text-sm tracking-widest">{devCode}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtp(devCode.split(''));
                  inputRefs.current[5]?.focus();
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0"
              >
                Auto-fill Code
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* OTP inputs */}
            <fieldset>
              <legend className="block text-sm font-medium text-ink mb-3">
                Reset code
              </legend>
              <div
                className="flex gap-3 justify-center"
                onPaste={handlePaste}
                role="group"
                aria-label="Enter the 6-digit reset code"
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
                    className="w-11 h-13 text-center rounded-md border-2 transition-colors focus:outline-none"
                    style={{
                      borderColor: digit ? 'var(--accent)' : 'var(--line)',
                      background: digit ? 'var(--accent-muted)' : 'var(--surface)',
                      color: 'var(--ink)',
                      fontSize: 'var(--step-1)',
                      fontWeight: 700,
                      height: '3.25rem',
                      width: '2.75rem',
                    }}
                  />
                ))}
              </div>
            </fieldset>

            {/* New password */}
            <PasswordStrengthInput
              id="new-password"
              label="New password"
              required
              value={newPassword}
              onChange={(v) => { setNewPassword(v); setError(null); }}
              autoComplete="new-password"
            />

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-ink mb-1">
                Confirm new password <span className="text-error" aria-label="required">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  className={inputClass}
                  style={{ borderColor: 'var(--line)', paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink cursor-pointer focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-on)',
                minHeight: '44px',
              }}
              aria-busy={loading}
            >
              {loading && <LoadingSpinner size="sm" label="Resetting password" />}
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Didn&apos;t get a code?{' '}
            <Link href="/forgot-password" className="text-accent font-medium hover:text-accent-dark">
              Request a new one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <LoadingSpinner size="md" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
