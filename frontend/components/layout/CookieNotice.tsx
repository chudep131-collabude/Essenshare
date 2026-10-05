'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'cookie-notice-dismissed';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-50 flex justify-center p-[var(--space-m)]"
    >
      <div
        className="w-full max-w-xl rounded-lg shadow-modal p-[var(--space-l)] flex flex-col sm:flex-row items-start sm:items-center gap-[var(--space-m)]"
        style={{ backgroundColor: 'var(--surface-dark)' }}
      >
        <p
          className="text-[var(--step--1)] leading-relaxed flex-1"
          style={{ color: 'var(--ink-on-dark-muted)' }}
        >
          This site uses only functional cookies necessary for the service. No advertising or
          tracking cookies are used.{' '}
          <Link
            href="/privacy"
            className="underline transition-colors duration-[var(--dur-fast)]"
            style={{ color: 'var(--ink-on-dark)' }}
          >
            Privacy Policy
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 inline-flex items-center justify-center px-[var(--space-l)] min-h-[44px] rounded-pill text-[var(--step--1)] font-semibold transition-colors duration-[var(--dur-fast)] active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-on)',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
