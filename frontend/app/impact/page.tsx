import type { Metadata } from 'next';
import ImpactStats from '@/components/home/ImpactStats';

export const metadata: Metadata = {
  title: 'Impact Dashboard',
  description:
    'See the real-world impact of Essenshare — completed pickups, weight redistributed, and communities served.',
};

export default function ImpactPage() {
  return (
    <div className="max-w-page mx-auto px-[var(--space-page)] py-section">
      <h1
        className="text-step-3 font-bold text-ink mb-3"
        style={{ letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
      >
        Impact Dashboard
      </h1>
      <p className="text-ink-muted text-step-0 mb-8 max-w-prose">
        Every pickup tracked. Every number verified. No estimates, no projections.
      </p>

      {/* Stats (client component fetches live) */}
      <div
        className="rounded-md overflow-hidden mb-8"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        <ImpactStats />
      </div>

      {/* Disclaimer */}
      <p
        className="text-sm text-ink-muted text-center mb-12"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        All data reflects completed, confirmed transactions only.
      </p>

      {/* Chart placeholder */}
      <div
        className="w-full h-72 rounded-md border-2 border-dashed border-line flex items-center justify-center bg-surface-soft"
        role="region"
        aria-label="Charts placeholder"
      >
        <p className="text-sm text-ink-muted font-medium text-center px-4">
          Charts and visualizations — Phase 13
        </p>
      </div>
    </div>
  );
}
