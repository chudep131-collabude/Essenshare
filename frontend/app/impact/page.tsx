import type { Metadata } from 'next';
import ImpactStats from '@/components/home/ImpactStats';

export const metadata: Metadata = {
  title: 'Impact Dashboard',
  description:
    'See the real-world impact of Essenshare — completed pickups, weight redistributed, and communities served.',
};

export default function ImpactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-text-base mb-3">Impact Dashboard</h1>
      <p className="text-text-muted text-base mb-8">
        Every pickup tracked. Every number verified. No estimates, no projections.
      </p>

      {/* Stats (client component fetches live) */}
      <div className="rounded-2xl overflow-hidden mb-8">
        <ImpactStats />
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-text-muted text-center mb-12">
        All data reflects completed, confirmed transactions only.
      </p>

      {/* Chart placeholder */}
      <div
        className="w-full h-72 rounded-xl border-2 border-dashed border-border-base flex items-center justify-center bg-surface-alt"
        role="region"
        aria-label="Charts placeholder"
      >
        <p className="text-sm text-text-muted font-medium text-center px-4">
          Charts and visualizations — Phase 13
        </p>
      </div>
    </div>
  );
}
