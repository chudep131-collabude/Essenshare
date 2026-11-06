'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiPost, ApiException } from '@/lib/api';
import { friendlyError } from '@/lib/errors';

const inputClass =
  'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

function VerifyContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') ?? '';
  const urlDevOtp = searchParams.get('dev_otp') ?? '';

  const [devCode, setDevCode] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check search params or sessionStorage for local dev code
    let code = urlDevOtp;
    if (!code && typeof window !== 'undefined') {
      code = (uid ? sessionStorage.getItem(`dev_otp_${uid}`) : null) || sessionStorage.getItem('dev_otp_latest') || '';
    }
    if (code) {
      setDevCode(code);
      setOtp(code);
    }
    inputRef.current?.focus();
  }, [uid, urlDevOtp]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) {
      setErrorMsg('Missing verification account ID. Please sign in or register to receive a fresh verification link.');
      return;
    }
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
      setErrorMsg(friendlyError(err, 'Verification failed. Please try again.'));
    }
  }

  async function handleResend() {
    if (!uid) {
      setResendStatus('error');
      setErrorMsg('Missing account identifier. Please sign in or register to get a verification code.');
      return;
    }
    setResendStatus('loading');
    setErrorMsg(null);
    try {
      const res = await apiPost<{ dev_otp?: string }>('/auth/resend-verification', { user_id: uid });
      if (res.data?.dev_otp) {
        setDevCode(res.data.dev_otp);
        setOtp(res.data.dev_otp);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`dev_otp_${uid}`, res.data.dev_otp);
          sessionStorage.setItem('dev_otp_latest', res.data.dev_otp);
        }
      }
      setResendStatus('sent');
    } catch (err) {
      setResendStatus('error');
      setErrorMsg(friendlyError(err, 'Could not send the code. Check your connection and try again.'));
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

      {/* Local testing helper banner */}
      {devCode ? (
        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Local Testing Mode
            </div>
            <p className="text-ink-muted text-xs">
              Your verification code: <strong className="font-mono text-ink text-sm tracking-widest">{devCode}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOtp(devCode);
              inputRef.current?.focus();
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0"
          >
            Auto-fill Code
          </button>
        </div>
      ) : uid ? (
        <div className="p-3 rounded-lg border border-dashed border-line bg-surface-raised text-xs flex items-center justify-between gap-2">
          <span className="text-ink-muted">Testing locally without SMTP email?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendStatus === 'loading'}
            className="font-semibold text-accent hover:underline shrink-0"
          >
            {resendStatus === 'loading' ? 'Generating…' : 'Get Test Code'}
          </button>
        </div>
      ) : null}

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
          disabled={resendStatus === 'loading'}
          className="text-sm text-accent hover:text-accent-dark disabled:opacity-50"
        >
          {resendStatus === 'loading'
            ? 'Sending…'
            : resendStatus === 'sent'
              ? 'Code refreshed — see test banner'
              : resendStatus === 'error'
                ? 'Try again'
                : 'Resend code'}
        </button>
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
