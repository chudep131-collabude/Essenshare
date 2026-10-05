'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookie-notice-dismissed';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — don't show banner
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
      className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900 text-white px-4 py-4 md:py-3 border-t border-neutral-700"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-neutral-200 leading-relaxed">
          This site uses only functional cookies necessary for the service. No advertising or
          tracking cookies are used.{' '}
          <a href="/privacy" className="underline text-white hover:text-neutral-300 transition-colors">
            Privacy Policy
          </a>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
