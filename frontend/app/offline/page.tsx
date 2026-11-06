'use client';

import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main id="main-content" className="flex-1 flex items-center justify-center py-16 px-4">
      <div className="max-w-lg w-full text-center p-8 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 mb-6">
          <WifiOff className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mb-3">
          You are currently offline
        </h1>
        <p className="text-sm sm:text-base text-[var(--ink-muted)] mb-6 leading-relaxed">
          To ensure food safety and prevent wasted journeys, real-time donation inventory and pickup codes require an active connection. Stale food listings are never shown offline.
        </p>

        <div className="p-4 rounded-xl bg-[var(--surface-soft)] border border-[var(--line)] text-start mb-6">
          <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
            Available while disconnected:
          </p>
          <ul className="text-xs text-[var(--ink-muted)] space-y-1.5 list-disc list-inside">
            <li>Food Safety guidelines and storage advice</li>
            <li>Information about our dignity-first redistribution rules</li>
            <li>Cached static policies</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-on)] font-semibold text-sm hover:brightness-105 active:scale-98 transition-all cursor-pointer shadow-md"
          >
            Check Connection & Retry
          </button>
          <Link
            href="/safety"
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-semibold text-sm hover:border-[var(--line-strong)] transition-all"
          >
            Read Safety Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
