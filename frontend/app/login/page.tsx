'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ApiException } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { friendlyError } from '@/lib/errors';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full px-4 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-accent';

function LoginForm() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validateFields(): boolean {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Password is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validateFields()) return;

    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      // Read ?next= param, validate it is a relative path to prevent open redirect
      const next = searchParams.get('next');
      const safeNext =
        next && next.startsWith('/') && !next.startsWith('//') ? next : null;

      const role = loggedInUser?.role;
      if (safeNext) {
        router.push(safeNext);
      } else if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'INDIVIDUAL_DONOR' || role === 'BUSINESS_DONOR' || role === 'ORGANIZATION') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(friendlyError(err, 'Could not sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-[var(--space-page)] py-section">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-line rounded-lg shadow-sm p-8">
          <h1
            className="text-step-2 font-bold text-ink mb-2 text-center"
            style={{ letterSpacing: '-0.02em' }}
          >
            {t('login.title')}
          </h1>
          <p className="text-ink-muted text-sm text-center mb-8">
            {t('login.subtitle')}{' '}
            <Link href="/find" className="text-accent font-medium hover:text-accent-dark">
              {t('login.find_food_link')}
            </Link>
          </p>

          {error && (
            <Alert
              type="error"
              title={t('login.failed')}
              className="mb-6"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-ink mb-1">
                  {t('login.email')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  className={cn(
                    inputClass,
                    (fieldErrors.email || error) && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                  )}
                  placeholder="you@example.com"
                  aria-describedby={fieldErrors.email ? 'login-email-err' : undefined}
                  aria-invalid={!!fieldErrors.email || !!error}
                />
                {fieldErrors.email && (
                  <p id="login-email-err" className="mt-1 text-xs text-rose-600 font-medium" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-ink mb-1"
                >
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                    }}
                    className={cn(
                      inputClass,
                      'pe-11',
                      (fieldErrors.password || error) && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                    )}
                    placeholder="••••••••"
                    aria-describedby={fieldErrors.password ? 'login-pw-err' : undefined}
                    aria-invalid={!!fieldErrors.password || !!error}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-ink-muted hover:text-ink transition-colors cursor-pointer focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && <p id="login-pw-err" className="mt-1 text-xs text-error" role="alert">{fieldErrors.password}</p>}
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm text-accent hover:text-accent-dark"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 min-h-[44px]"
                aria-busy={loading}
              >
                {loading && <LoadingSpinner size="sm" label={t('login.signing_in')} />}
                {loading ? t('login.signing_in') : t('login.submit')}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-accent font-medium hover:text-accent-dark">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense because LoginForm uses useSearchParams()
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
