'use client';

import { useEffect, useState } from 'react';

interface ImpactSummary {
  totalPickups?: number;
  weightRedistributedKg?: number;
  partnerOrganisations?: number;
  countries?: number;
}

interface StatItem {
  label: string;
  value: string;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

export default function ImpactStats() {
  const [stats, setStats] = useState<ImpactSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    fetch(`${apiBase}/impact/summary`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Not OK');
        return res.json();
      })
      .then((data: ImpactSummary) => {
        setStats(data);
      })
      .catch(() => {
        setStats(null);
      })
      .finally(() => setLoaded(true));
  }, []);

  const items: StatItem[] = [
    { label: 'Total Pickups', value: formatNumber(stats?.totalPickups) },
    {
      label: 'Weight Redistributed (kg)',
      value: stats?.weightRedistributedKg !== undefined
        ? `${formatNumber(stats.weightRedistributedKg)} kg`
        : '—',
    },
    { label: 'Partner Organisations', value: formatNumber(stats?.partnerOrganisations) },
    { label: 'Countries', value: formatNumber(stats?.countries) },
  ];

  return (
    <section aria-labelledby="impact-stats-heading" className="py-16 bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2
            id="impact-stats-heading"
            className="text-2xl sm:text-3xl font-bold text-white mb-2"
          >
            Real Impact, Transparently Reported
          </h2>
        </div>

        <dl
          className={`grid grid-cols-2 md:grid-cols-4 gap-6 transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Platform impact statistics"
        >
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center text-center bg-white/10 rounded-xl p-6"
            >
              <dt className="text-sm font-medium text-white/80 mb-1">{item.label}</dt>
              <dd
                className="text-3xl sm:text-4xl font-bold text-white"
                aria-label={`${item.label}: ${item.value}`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-center text-xs text-white/60">
          Stats from completed transactions only
        </p>
      </div>
    </section>
  );
}
