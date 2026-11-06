'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslation } from '@/lib/i18n';

gsap.registerPlugin(ScrollTrigger);

interface ImpactSummary {
  totalPickups?: number;
  portionsShared?: number;
  partnerOrganisations?: number;
  countries?: number;
}

type FetchState = 'loading' | 'error' | 'empty' | 'data';

// Raw numeric value for count-up; formatted label for display
interface StatDef {
  label: string;
  rawValue: number | null;
  formattedValue: string;
  suffix: string;
}

function getRawAndFormatted(
  n: number | undefined | null
): { raw: number | null; formatted: string; suffix: string } {
  if (n === undefined || n === null) return { raw: null, formatted: '—', suffix: '' };
  if (n >= 1_000_000) return { raw: n / 1_000_000, formatted: (n / 1_000_000).toFixed(1), suffix: 'M' };
  if (n >= 1_000) return { raw: n / 1_000, formatted: (n / 1_000).toFixed(0), suffix: 'k' };
  return { raw: n, formatted: n.toLocaleString(), suffix: '' };
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
      <div
        className="skeleton"
        style={{
          width: '80px',
          height: 'clamp(1.75rem, 1.58rem + 0.88vw, 2.375rem)',
          borderRadius: 'var(--radius-sm)',
        }}
      />
      <div
        className="skeleton"
        style={{
          width: '100px',
          height: 'clamp(0.75rem, 0.72rem + 0.14vw, 0.85rem)',
          borderRadius: 'var(--radius-sm)',
          marginBlockStart: 'var(--space-2xs)',
        }}
      />
    </div>
  );
}

// ── Single stat cell with count-up ─────────────────────────────────────────
function StatCell({
  stat,
  isPlaceholder,
  shouldAnimate,
}: {
  stat: StatDef;
  isPlaceholder: boolean;
  shouldAnimate: boolean;
}) {
  const valueRef = useRef<HTMLElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!shouldAnimate || isPlaceholder || stat.rawValue === null) return;
    if (hasAnimatedRef.current) return;
    if (typeof window === 'undefined') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    hasAnimatedRef.current = true;

    const el = valueRef.current;
    if (!el) return;

    const isDecimal = stat.formattedValue.includes('.');
    const target = stat.rawValue;
    const counter = { val: 0 };

    gsap.to(counter, {
      val: target,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = isDecimal
          ? counter.val.toFixed(1) + stat.suffix
          : Math.round(counter.val).toLocaleString() + stat.suffix;
      },
    });
  }, [shouldAnimate, isPlaceholder, stat]);

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
        aria-label={`${stat.label}: ${stat.formattedValue}${stat.suffix}`}
      >
        <span ref={valueRef}>
          {isPlaceholder ? '—' : stat.formattedValue + stat.suffix}
        </span>
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
        {stat.label}
      </dt>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ImpactStats({ showReportLink = true }: { showReportLink?: boolean } = {}) {
  const { t } = useTranslation();
  const [data, setData] = useState<ImpactSummary | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const dlRef = useRef<HTMLDListElement>(null);

  // Fetch data
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
        return res.json();
      })
      .then((json: any) => {
        const payload = json?.data ?? json ?? {};
        const totalPickups = payload.total_pickups ?? payload.totalPickups;
        const portionsShared = payload.portions_shared ?? payload.portionsShared ?? payload.total_portions ?? payload.weight_redistributed_kg;
        const partnerOrganisations = payload.partner_organisations ?? payload.partnerOrganisations;
        const countries = payload.countries;

        const isEmpty =
          totalPickups === undefined &&
          portionsShared === undefined &&
          partnerOrganisations === undefined &&
          countries === undefined;

        setData({
          totalPickups: typeof totalPickups === 'number' ? totalPickups : 0,
          portionsShared: typeof portionsShared === 'number' ? portionsShared : 0,
          partnerOrganisations: typeof partnerOrganisations === 'number' ? partnerOrganisations : 0,
          countries: typeof countries === 'number' ? countries : 0,
        });
        setFetchState(isEmpty ? 'empty' : 'data');
      })
      .catch(() => {
        setFetchState('error');
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // ScrollTrigger section entrance + trigger count-up
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      // Section fade-up entrance
      if (!reducedMotion) {
        gsap.from(dlRef.current, {
          y: 24,
          opacity: 0,
          duration: 0.65,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 88%',
            once: true,
          },
        });
      }

      // Trigger count-up once section is in view
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 85%',
        once: true,
        onEnter: () => setShouldAnimate(true),
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const isLoading = fetchState === 'loading';
  const isPlaceholder = fetchState !== 'data';

  const pickups = getRawAndFormatted(data?.totalPickups);
  const portions = getRawAndFormatted(data?.portionsShared);
  const orgs = getRawAndFormatted(data?.partnerOrganisations);
  const countries = getRawAndFormatted(data?.countries);

  const stats: StatDef[] = [
    { label: t('home.stat_pickups'),          rawValue: pickups.raw,   formattedValue: pickups.formatted,   suffix: pickups.suffix },
    { label: t('home.stat_portions'),         rawValue: portions.raw,  formattedValue: portions.formatted,  suffix: portions.suffix },
    { label: t('home.stat_orgs'),             rawValue: orgs.raw,      formattedValue: orgs.formatted,      suffix: orgs.suffix },
    { label: t('home.stat_countries'),        rawValue: countries.raw, formattedValue: countries.formatted, suffix: countries.suffix },
  ];

  return (
    <section
      ref={sectionRef}
      aria-labelledby="impact-stats-heading"
      style={{
        background: 'var(--surface)',
        borderBlockStart: '1px solid var(--line)',
        borderBlockEnd: '1px solid var(--line)',
      }}
    >
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
          ref={dlRef}
          aria-label="Platform impact statistics"
          aria-busy={isLoading}
          className="grid grid-cols-2 md:grid-cols-4"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={[
                    i % 2 === 0 ? 'border-r border-line' : '',
                    i < 2 ? 'border-b border-line md:border-b-0' : '',
                    i < 3 ? 'md:border-r md:border-line' : 'md:border-r-0',
                  ].filter(Boolean).join(' ')}
                >
                  <StatSkeleton />
                </div>
              ))
            : stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={[
                    i % 2 === 0 ? 'border-r border-line' : '',
                    i < 2 ? 'border-b border-line md:border-b-0' : '',
                    i < 3 ? 'md:border-r md:border-line' : 'md:border-r-0',
                  ].filter(Boolean).join(' ')}
                >
                  <StatCell
                    stat={stat}
                    isPlaceholder={isPlaceholder}
                    shouldAnimate={shouldAnimate}
                  />
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
          Confirmed completed transactions only. No estimates.{' '}
          {showReportLink && (
            <Link
              href="/impact"
              style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              See full impact report
            </Link>
          )}
        </p>
      </div>
    </section>
  );
}
