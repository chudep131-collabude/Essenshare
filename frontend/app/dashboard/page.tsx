'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiException } from '@/lib/api';
import DonationCard, { Donation } from '@/components/donations/DonationCard';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

gsap.registerPlugin(ScrollTrigger);

// Separated to a child so useSearchParams doesn't block SSR on the whole page
function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justPosted = searchParams.get('posted') === '1';

  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Stat element refs for count-up
  const activeStatRef = useRef<HTMLParagraphElement>(null);
  const totalStatRef = useRef<HTMLParagraphElement>(null);
  const completedStatRef = useRef<HTMLParagraphElement>(null);

  // Section refs for scroll entrance
  const statsRef = useRef<HTMLDivElement>(null);
  const listingsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setDonationsLoading(true);
    setDonationsError(null);
    (async () => {
      try {
        const envelope = await apiFetch<{ donations: Donation[]; total: number }>(
          '/donations/mine?page=1&limit=10'
        );
        setDonations(envelope.data?.donations ?? []);
      } catch (err) {
        setDonationsError(
          err instanceof ApiException ? err.message : 'Could not load your listings.'
        );
      } finally {
        setDonationsLoading(false);
      }
    })();
  }, [user, retryCount]);

  async function handleCancelDonation(donationId: string) {
    setCancelError(null);
    try {
      await apiFetch(`/donations/${donationId}`, { method: 'DELETE' });
      setDonations((prev) => prev.filter((d) => d.id !== donationId));
    } catch (err) {
      setCancelError(
        err instanceof ApiException ? err.message : 'Could not cancel listing. Please try again.'
      );
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading dashboard" />
      </div>
    );
  }

  if (!user) return null;

  const activeDonations = donations.filter(
    (d) => d.status === 'AVAILABLE' || d.status === 'ACTIVE'
  );
  const completedDonations = donations.filter((d) => d.status === 'COMPLETED');

  // Count-up animation after donations load
  useEffect(() => {
    if (donations.length === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const targets = [
      { ref: activeStatRef, val: activeDonations.length },
      { ref: totalStatRef,  val: donations.length },
      { ref: completedStatRef, val: completedDonations.length },
    ];

    targets.forEach(({ ref, val }) => {
      if (!ref.current) return;
      const el = ref.current;
      const counter = { v: 0 };
      gsap.to(counter, {
        v: val,
        duration: 0.9,
        ease: 'power2.out',
        snap: { v: 1 },
        onUpdate() {
          el.textContent = String(Math.round(counter.v));
        },
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donations]);

  // Scroll entrance animations
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      if (statsRef.current) {
        gsap.from(statsRef.current, {
          y: 24,
          opacity: 0,
          duration: 0.55,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 88%',
            once: true,
          },
        });
      }
      if (listingsRef.current) {
        gsap.from(listingsRef.current, {
          y: 24,
          opacity: 0,
          duration: 0.55,
          ease: 'power3.out',
          delay: 0.1,
          scrollTrigger: {
            trigger: listingsRef.current,
            start: 'top 88%',
            once: true,
          },
        });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="max-w-page mx-auto px-[var(--space-page)] py-section">
      {/* Welcome */}
      <div className="mb-8">
        <h1
          className="text-step-3 font-bold text-ink mb-1"
          style={{ letterSpacing: '-0.02em', textWrap: 'balance' } as React.CSSProperties}
        >
          Welcome back, {user.display_name || 'Donor'}
        </h1>
        <p className="text-ink-muted">Manage your donations and see your impact.</p>
      </div>

      {justPosted && (
        <Alert type="success" className="mb-6">
          Your donation has been listed. Thank you for giving.
        </Alert>
      )}

      {/* Quick stats */}
      <div ref={statsRef} className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface border border-line rounded-md p-5">
          <p
            className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1"
            style={{ letterSpacing: '0.08em' }}
          >
            Active Listings
          </p>
          <p
            ref={activeStatRef}
            className="text-step-3 font-bold text-accent"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {activeDonations.length}
          </p>
        </div>
        <div className="bg-surface border border-line rounded-md p-5">
          <p
            className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1"
            style={{ letterSpacing: '0.08em' }}
          >
            Total Listed
          </p>
          <p
            ref={totalStatRef}
            className="text-step-3 font-bold text-accent"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {donations.length}
          </p>
        </div>
        <div className="bg-surface border border-line rounded-md p-5">
          <p
            className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-1"
            style={{ letterSpacing: '0.08em' }}
          >
            Completed
          </p>
          <p
            ref={completedStatRef}
            className="text-step-3 font-bold text-accent"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {completedDonations.length}
          </p>
        </div>
      </div>

      {/* Post CTA */}
      <div className="mb-8">
        <Link
          href="/dashboard/post"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Post a donation
        </Link>
      </div>

      {/* Listings */}
      <section ref={listingsRef} aria-labelledby="listings-heading">
        <h2
          id="listings-heading"
          className="text-step-1 font-semibold text-ink mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          Your Active Listings
        </h2>

        {donationsLoading && (
          <div className="flex items-center gap-3 py-8">
            <LoadingSpinner size="md" label="Loading listings" />
            <span className="text-ink-muted text-sm">Loading your listings…</span>
          </div>
        )}

        {donationsError && (
          <>
            <Alert type="error">{donationsError}</Alert>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="mt-3 inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[44px]"
            >
              Retry
            </button>
          </>
        )}

        {cancelError && (
          <Alert type="error" className="mb-4">
            {cancelError}
          </Alert>
        )}

        {!donationsLoading && !donationsError && donations.length === 0 && (
          <div className="py-12 text-center border border-dashed border-line rounded-md">
            <p className="text-ink-muted mb-2">You haven&apos;t listed any donations yet.</p>
            <Link href="/dashboard/post" className="text-accent font-medium hover:text-accent-dark">
              Post your first donation →
            </Link>
          </div>
        )}

        {!donationsLoading && donations.length > 0 && (
          <div className="space-y-4">
            {donations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                showCancelButton
                onCancel={handleCancelDonation}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading dashboard" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
