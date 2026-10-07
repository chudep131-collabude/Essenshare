'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiPost, ApiException } from '@/lib/api';

const inputClass =
  'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

function VerifyContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') ?? '';
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    setStatus('loading');
    setErrorMsg(null);
    try {
      await apiPost('/auth/verify-email', { user_id: uid, otp });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof ApiException ? err.message : 'Verification failed. Please try again.'
      );
    }
  }

  async function handleResend() {
    setResendStatus('loading');
    try {
      await apiPost('/auth/resend-verification', { user_id: uid });
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <Alert type="success">
        Email verified. You can now{' '}
        <Link href="/login" className="font-semibold underline">
          sign in
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errorMsg && <Alert type="error">{errorMsg}</Alert>}
      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-ink mb-1">
          Verification code
        </label>
        <input
          id="otp"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className={inputClass}
          placeholder="123456"
          autoComplete="one-time-code"
          required
        />
        <p className="mt-1 text-xs text-ink-muted">
          Enter the 6-digit code we sent to your email.
        </p>
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 min-h-[44px]"
      >
        {status === 'loading' && <LoadingSpinner size="sm" label="Verifying" />}
        {status === 'loading' ? 'Verifying…' : 'Verify Email'}
      </button>
      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendStatus === 'loading' || resendStatus === 'sent'}
          className="text-sm text-accent hover:text-accent-dark disabled:opacity-50"
        >
          {resendStatus === 'loading'
            ? 'Sending…'
            : resendStatus === 'sent'
              ? 'Code resent!'
              : 'Resend code'}
        </button>
        {resendStatus === 'error' && (
          <p className="text-xs text-error mt-1" role="alert">
            Could not resend. Try again.
          </p>
        )}
      </div>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)] py-section">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-line rounded-lg shadow-sm p-8">
          <h1
            className="text-step-2 font-bold text-ink mb-2 text-center"
            style={{ letterSpacing: '-0.02em' }}
          >
            Check your email
          </h1>
          <p className="text-ink-muted text-sm text-center mb-8">
            We sent a 6-digit verification code to your email address.
          </p>
          <Suspense fallback={<LoadingSpinner size="md" />}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
