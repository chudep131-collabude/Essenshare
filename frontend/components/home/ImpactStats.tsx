'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ImpactSummary {
  totalPickups?: number;
  weightRedistributedKg?: number;
  partnerOrganisations?: number;
  countries?: number;
}

type FetchState = 'loading' | 'error' | 'empty' | 'data';

function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function formatWeight(kg: number | undefined | null): string {
  if (kg === undefined || kg === null) return '—';
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M kg`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(0)}k kg`;
  return `${kg.toLocaleString()} kg`;
}

// ── Skeleton block ──────────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        paddingBlock: 'var(--space-xl)',
        paddingInline: 'var(--space-l)',
      }}
      aria-hidden="true"
    >
      {/* Number skeleton */}
      <div
        className="skeleton"
        style={{ width: '80px', height: 'clamp(2.07rem, 1.73rem + 1.55vw, 3.00rem)', borderRadius: 'var(--radius-sm)' }}
      />
      {/* Label skeleton */}
      <div
        className="skeleton"
        style={{ width: '100px', height: 'clamp(0.83rem, 0.79rem + 0.18vw, 0.94rem)', borderRadius: 'var(--radius-sm)', marginBlockStart: 'var(--space-2xs)' }}
      />
    </div>
  );
}

// ── Single stat cell ────────────────────────────────────────────────────────
function StatCell({ value, label }: { value: string; label: string }) {
  const isPlaceholder = value === '—';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2xs)',
        paddingBlock: 'var(--space-xl)',
        paddingInline: 'var(--space-l)',
      }}
    >
      <dd
        style={{
          fontSize: 'var(--step-4)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: isPlaceholder ? 'var(--ink-disabled)' : 'var(--accent)',
          fontVariantNumeric: 'tabular-nums',
        }}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </dd>
      <dt
        style={{
          fontSize: 'var(--step--1)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--ink-quiet)',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {label}
      </dt>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ImpactStats() {
  const [data, setData] = useState<ImpactSummary | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('loading');

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

    fetch(`${apiBase}/impact/summary`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ImpactSummary>;
      })
      .then((json) => {
        const isEmpty =
          json.totalPickups === undefined &&
          json.weightRedistributedKg === undefined &&
          json.partnerOrganisations === undefined &&
          json.countries === undefined;
        setData(json);
        setFetchState(isEmpty ? 'empty' : 'data');
      })
      .catch((err) => {
        // AbortError from timeout is still an error state
        if (err instanceof Error && err.name !== 'AbortError') {
          setFetchState('error');
        } else {
          setFetchState('error');
        }
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  const isLoading = fetchState === 'loading';

  // Values for data/empty/error — '—' is the fallback for error and empty
  const stats = [
    {
      label: 'Total Pickups',
      value: fetchState === 'data' ? formatNumber(data?.totalPickups) : '—',
    },
    {
      label: 'Weight Redistributed',
      value: fetchState === 'data' ? formatWeight(data?.weightRedistributedKg) : '—',
    },
    {
      label: 'Partner Organisations',
      value: fetchState === 'data' ? formatNumber(data?.partnerOrganisations) : '—',
    },
    {
      label: 'Countries',
      value: fetchState === 'data' ? formatNumber(data?.countries) : '—',
    },
  ];

  return (
    <section
      aria-labelledby="impact-stats-heading"
      style={{
        background: 'var(--surface)',
        borderBlockStart: '1px solid var(--line)',
        borderBlockEnd: '1px solid var(--line)',
      }}
    >
      {/* Visually hidden heading for screen readers */}
      <h2 id="impact-stats-heading" className="sr-only">
        Platform impact statistics
      </h2>

      <div
        style={{
          maxInlineSize: 'var(--page-max)',
          marginInline: 'auto',
          paddingInline: 'var(--space-page)',
        }}
      >
        <dl
          aria-label="Platform impact statistics"
          aria-busy={isLoading}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
          className="md:grid-cols-4"
        >
          {/* Loading state: render skeletons */}
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderInlineEnd:
                      i < 3 ? '1px solid var(--line)' : undefined,
                    borderBlockEnd:
                      i < 2 ? '1px solid var(--line)' : undefined,
                  }}
                >
                  <StatSkeleton />
                </div>
              ))
            : stats.map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    borderInlineEnd:
                      i < 3 ? '1px solid var(--line)' : undefined,
                    borderBlockEnd:
                      i < 2 ? '1px solid var(--line)' : undefined,
                  }}
                >
                  <StatCell value={stat.value} label={stat.label} />
                </div>
              ))}
        </dl>

        {/* Footnote */}
        <p
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--ink-quiet)',
            textAlign: 'center',
            paddingBlock: 'var(--space-m)',
            borderBlockStart: '1px solid var(--line)',
          }}
        >
          Confirmed completed transactions only.{' '}
          <Link
            href="/impact"
            style={{
              color: 'var(--accent)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            View full impact report
          </Link>
        </p>
      </div>
    </section>
  );
}
