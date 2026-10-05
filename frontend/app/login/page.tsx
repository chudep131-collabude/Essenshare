'use client';

import type { Metadata } from 'next';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiFetch, ApiException } from '@/lib/api';

// Note: metadata cannot be exported from a 'use client' file.
// For client pages, metadata is set in a parent server wrapper if needed.
// The layout template handles the title pattern automatically.

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      // On success, redirect to dashboard (Phase 2)
      window.location.href = '/';
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 501) {
          setError('This feature is coming soon.');
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-border-base rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-text-base mb-2 text-center">Donor Login</h1>
          <p className="text-text-muted text-sm text-center mb-8">
            Recipients don&apos;t need an account.{' '}
            <Link href="/find" className="text-primary font-medium">
              Find food here
            </Link>
          </p>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-text-base mb-1"
                >
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-base text-sm text-text-base placeholder:text-text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-text-base mb-1"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-base text-sm text-text-base placeholder:text-text-muted bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-busy={loading}
              >
                {loading && <LoadingSpinner size="sm" label="Signing in" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-medium hover:text-primary-dark">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
