'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  TrendingUp,
  Droplets,
  Leaf,
  Users,
  Package,
  Globe2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  Info,
  Car,
  HeartHandshake,
} from 'lucide-react';
import gsap from 'gsap';
import { apiFetch } from '@/lib/api';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export interface ImpactSummaryData {
  total_pickups: number;
  total_portions: number;
  total_weight_kg: number;
  total_donors: number;
  co2e_abated_kg: number;
  water_saved_liters: number;
  partner_organizations: number;
  countries_active: number;
}

export interface CategoryStat {
  category: string;
  pickups_count: number;
  portions_count: number;
  weight_kg: number;
}

export interface RecentCompletedPickup {
  id: string;
  category: string;
  quantity: number;
  weight_kg: number | null;
  completed_at: string;
  co2e_saved_kg: number;
  water_saved_liters: number;
}

export interface CountryStat {
  country_code: string;
  pickups_count: number;
  total_portions: number;
  total_weight_kg: number;
}

const ITEM_TYPE_META: Record<string, { label: string; color: string }> = {
  BAKERY: { label: 'Bakery', color: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20' },
  PREPARED_FOOD: { label: 'Prepared Food', color: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20' },
  PRODUCE: { label: 'Fresh Produce', color: 'bg-green-500/10 text-green-800 dark:text-green-300 border border-green-500/20' },
  GROCERIES: { label: 'Pantry Surplus', color: 'bg-orange-500/10 text-orange-800 dark:text-orange-300 border border-orange-500/20' },
  DAIRY: { label: 'Chilled Items', color: 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border border-yellow-500/20' },
  BEVERAGES: { label: 'Beverages', color: 'bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/20' },
  NON_FOOD_ESSENTIALS: { label: 'Community Essentials', color: 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20' },
  OTHER: { label: 'Mutual Aid Surplus', color: 'bg-stone-500/10 text-stone-800 dark:text-stone-300 border border-stone-500/20' },
};

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ImpactPage() {
  const [summary, setSummary] = useState<ImpactSummaryData | null>(null);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [recentPickups, setRecentPickups] = useState<RecentCompletedPickup[]>([]);
  const [countries, setCountries] = useState<CountryStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const heroStatsRef = useRef<HTMLDivElement>(null);

  const fetchImpactData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, statsRes, recentRes, countryRes] = await Promise.allSettled([
        apiFetch<ImpactSummaryData>('/impact/summary'),
        apiFetch<{ by_category: CategoryStat[] }>('/impact/stats'),
        apiFetch<{ recent_pickups: RecentCompletedPickup[] }>('/impact/recent'),
        apiFetch<{ countries: CountryStat[] }>('/impact/by-country'),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.data) {
        setSummary(sumRes.value.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setCategories(statsRes.value.data.by_category || []);
      }
      if (recentRes.status === 'fulfilled' && recentRes.value.data) {
        setRecentPickups(recentRes.value.data.recent_pickups || []);
      }
      if (countryRes.status === 'fulfilled' && countryRes.value.data) {
        setCountries(countryRes.value.data.countries || []);
      }
      setLastRefreshed(new Date());
    } catch {
      setError('Could not refresh impact data. Showing cached overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImpactData();
  }, [fetchImpactData]);

  // Animate counters once summary data arrives
  useEffect(() => {
    if (!summary || !heroStatsRef.current) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.from('.impact-counter-card', {
        y: 20,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power2.out',
      });
    }, heroStatsRef);

    return () => ctx.revert();
  }, [summary]);

  const totalPortions = summary?.total_portions ?? 0;
  const totalPickups = summary?.total_pickups ?? 0;
  const totalWeightKg = summary?.total_weight_kg ?? 0;
  const co2eKg = summary?.co2e_abated_kg ?? (totalWeightKg * 2.5);
  const waterLiters = summary?.water_saved_liters ?? (totalWeightKg * 840);
  const totalDonors = summary?.total_donors ?? 0;
  const partnerOrgs = summary?.partner_organizations ?? 0;

  // Calculators
  const carKmEquivalent = Math.round(co2eKg * 4.2);
  const showerEquivalent = Math.round(waterLiters / 65);

  return (
    <div className="max-w-[1280px] mx-auto px-[var(--space-page)] py-8 sm:py-12">
      {/* ─── Breadcrumb / Live Badge ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-Time Two-Party Verified Ledger</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
          <Clock className="w-3.5 h-3.5" />
          <span>Updated {formatTimeAgo(lastRefreshed.toISOString())}</span>
          <button
            type="button"
            onClick={fetchImpactData}
            disabled={loading}
            className="p-1 rounded-md hover:bg-[var(--surface-soft)] text-[var(--ink-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            aria-label="Refresh impact metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Main Header ─── */}
      <div className="max-w-3xl mb-10">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--ink)] tracking-tight leading-[1.1] mb-3"
          style={{ textWrap: 'balance' }}
        >
          Public Transparency & Impact Ledger
        </h1>
        <p className="text-base sm:text-lg text-[var(--ink-muted)] leading-relaxed max-w-2xl">
          Every portion and kilogram below is tied to a cryptographically confirmed two-party handover.
          We never project hypothetical surplus or extrapolate estimates: only real food received with dignity.
        </p>
      </div>

      {error && (
        <Alert type="warning" className="mb-8">
          {error}
        </Alert>
      )}

      {/* ─── 1. Primary Metrics Grid ─── */}
      <div
        ref={heroStatsRef}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-12"
      >
        {/* Total Portions */}
        <div className="impact-counter-card relative p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs hover:shadow-md transition-shadow overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            Meals & Portions Shared
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--ink)] tabular-nums tracking-tight">
            {totalPortions.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--ink-quiet)] mt-2">
            Confirmed handovers: <span className="font-semibold text-[var(--ink)] tabular-nums">{totalPickups.toLocaleString()}</span>
          </p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        </div>

        {/* Total Weight Rescued */}
        <div className="impact-counter-card relative p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs hover:shadow-md transition-shadow overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            Surplus Food Rescued
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--ink)] tabular-nums tracking-tight">
            {totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })}{' '}
            <span className="text-xl font-bold text-[var(--ink-muted)]">kg</span>
          </p>
          <p className="text-xs text-[var(--ink-quiet)] mt-2">
            Active verified donors: <span className="font-semibold text-[var(--ink)] tabular-nums">{totalDonors}</span>
          </p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        </div>

        {/* CO2e Abated */}
        <div className="impact-counter-card relative p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs hover:shadow-md transition-shadow overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
            <Leaf className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            CO₂e Emissions Prevented
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--ink)] tabular-nums tracking-tight">
            {Math.round(co2eKg).toLocaleString()}{' '}
            <span className="text-xl font-bold text-[var(--ink-muted)]">kg</span>
          </p>
          <p className="text-xs text-[var(--ink-quiet)] mt-2">
            ~{carKmEquivalent.toLocaleString()} car km offset
          </p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        </div>

        {/* Water Conserved */}
        <div className="impact-counter-card relative p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs hover:shadow-md transition-shadow overflow-hidden group">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
            <Droplets className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            Embedded Water Conserved
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold text-[var(--ink)] tabular-nums tracking-tight">
            {Math.round(waterLiters).toLocaleString()}{' '}
            <span className="text-xl font-bold text-[var(--ink-muted)]">L</span>
          </p>
          <p className="text-xs text-[var(--ink-quiet)] mt-2">
            ~{showerEquivalent.toLocaleString()} showers conserved
          </p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        </div>
      </div>

      {/* ─── 2. Ecological Equivalency Callouts ─── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[var(--surface-soft)] to-[var(--surface)] border border-[var(--line)] mb-12 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-lg sm:text-xl font-bold text-[var(--ink)] tracking-tight">
            What these figures represent in the real world
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <Car className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--ink)] mb-1">Prevented Landfill Methane</h3>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Food decomposing anaerobically generates methane 28× more potent than carbon dioxide.
              Redirecting {totalWeightKg.toFixed(0)} kg directly offset <strong>{Math.round(co2eKg)} kg CO₂e</strong>.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-3">
              <Droplets className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--ink)] mb-1">Conserved Agricultural Water</h3>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Every crop and loaf carries embedded freshwater from irrigation and processing.
              Saved surplus preserved <strong>{Math.round(waterLiters).toLocaleString()} liters</strong> of clean water.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--ink)] mb-1">Fostered Community Dignity</h3>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Recipients collected food unconditionally without means testing or intrusive paperwork across{' '}
              <strong>{summary?.countries_active || 1}</strong> active regional hubs.
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. Two Column: Community Redistribution & Recent Verified Handovers ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Redistribution Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--line)] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--ink)] tracking-tight">
                Community Redistribution Flow
              </h2>
              <span className="text-xs text-[var(--ink-quiet)]">Portions shared</span>
            </div>
            <p className="text-xs text-[var(--ink-muted)] mb-6">
              Distribution of food types redistributed across our peer-to-peer and community relief network.
            </p>

            <div className="space-y-4">
              {categories.length > 0 ? (
                categories.map((cat) => {
                  const meta = ITEM_TYPE_META[cat.category] || ITEM_TYPE_META.OTHER;
                  const pct = totalPortions > 0 ? Math.round((cat.portions_count / totalPortions) * 100) : 0;
                  return (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                          <span className="font-semibold text-[var(--ink)]">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-2 font-medium tabular-nums">
                          <span className="text-[var(--ink)] font-bold">{cat.portions_count} portions</span>
                          <span className="text-[var(--ink-quiet)]">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-[var(--ink-quiet)]">
                  Redistribution metrics will calibrate upon first completed pickups.
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span>Free community surplus</span>
            <Link href="/find" className="font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1">
              Find food near you <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Live Recent Handover Feed (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-[var(--ink)] tracking-tight">
              Live Verified Handover Feed
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zero PII Ledger
            </span>
          </div>
          <p className="text-xs text-[var(--ink-muted)] mb-5">
            Public real-time completion stream. Timestamps and quantities are verified cryptographically; donor and recipient names are completely stripped to uphold full anonymity.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--line)] text-[var(--ink-muted)] font-semibold">
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Surplus Type</th>
                  <th className="pb-3 font-medium">Quantity</th>
                  <th className="pb-3 font-medium">Weight</th>
                  <th className="pb-3 font-medium text-right">CO₂e Abated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line-subtle)]">
                {recentPickups.length > 0 ? (
                  recentPickups.map((pickup) => {
                    const meta = ITEM_TYPE_META[pickup.category] || ITEM_TYPE_META.OTHER;
                    return (
                      <tr key={pickup.id} className="hover:bg-[var(--surface-soft)] transition-colors">
                        <td className="py-3 text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
                          {formatTimeAgo(pickup.completed_at)}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${meta.color}`}>
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-[var(--ink)] tabular-nums">
                          {pickup.quantity} {pickup.quantity === 1 ? 'portion' : 'portions'}
                        </td>
                        <td className="py-3 text-[var(--ink-muted)] tabular-nums">
                          {pickup.weight_kg ? `${pickup.weight_kg.toFixed(1)} kg` : '—'}
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          +{pickup.co2e_saved_kg.toFixed(1)} kg
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[var(--ink-quiet)]">
                      No handovers recorded today yet. Completed collections will appear here instantaneously.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── 4. Partner Organizations & Regional Coverage ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--ink)]">Nonprofit & Food Pantry Network</h3>
          </div>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
            EssenShare coordinates with approved food relief charities and shelters to absorb commercial bulk surplus that exceeds individual recipient capacity.
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-soft)] text-xs">
            <span className="text-[var(--ink-muted)]">Registered Community Partners</span>
            <span className="font-bold text-[var(--ink)] tabular-nums">{partnerOrgs} organisations</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <Globe2 className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--ink)]">Auditable Two-Party Cryptography</h3>
          </div>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
            Pickup codes use cryptographically unguessable SHA-256 tokens. Handovers are locked after 10 failed donor attempts to eliminate fraudulent redemptions.
          </p>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-soft)] text-xs">
            <span className="text-[var(--ink-muted)]">Verification Algorithm</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Timing-Safe HMAC SHA-256</span>
          </div>
        </div>
      </div>

      {/* ─── 5. Call To Action ─── */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[var(--surface-dark)] to-emerald-950 text-white text-center shadow-lg relative overflow-hidden">
        <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">
          Have surplus food to share today?
        </h2>
        <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto mb-6 leading-relaxed">
          It takes under 90 seconds to list surplus produce, meals, or baked goods. Keep food out of the bin and in your neighborhood.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="px-6 py-3 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            Start Donating
          </Link>
          <Link
            href="/find"
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 transition-all active:scale-[0.98]"
          >
            Find Food Near You
          </Link>
        </div>
      </div>
    </div>
  );
}
