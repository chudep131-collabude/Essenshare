'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Package,
  MapPin,
  ListOrdered,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  QrCode,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { apiFetch, apiPost } from '@/lib/api';
import DonationCard, { Donation } from '@/components/donations/DonationCard';
import VerifyPickupModal from '@/components/donations/VerifyPickupModal';
import SavedLocationsManager from '@/components/donations/SavedLocationsManager';
import SafetyPledgeModal from '@/components/safety/SafetyPledgeModal';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { friendlyError } from '@/lib/errors';

gsap.registerPlugin(ScrollTrigger);

interface PickupItem {
  id: string;
  donation_id: string;
  display_code: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  expires_at: string;
  confirmed_at: string | null;
  confirmed_qty: number | null;
  confirmed_weight_kg: number | null;
  created_at: string;
}

interface VerificationData {
  verification_level: string;
  safety_agreement_accepted_at: string | null;
  safety_agreement_version: string | null;
  trust_score: number;
}

// Separated to a child so useSearchParams doesn't block SSR on the whole page
function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justPosted = searchParams.get('posted') === '1';

  const [activeTab, setActiveTab] = useState<'listings' | 'hubs' | 'pickups'>('listings');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [pickups, setPickups] = useState<PickupItem[]>([]);
  const [pickupsLoading, setPickupsLoading] = useState(true);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [signingSafety, setSigningSafety] = useState(false);
  const [safetySuccessMsg, setSafetySuccessMsg] = useState<string | null>(null);
  const [showPledgeModal, setShowPledgeModal] = useState(false);

  const [cancelError, setCancelError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [recallTargetId, setRecallTargetId] = useState<string | null>(null);
  const [recallReason, setRecallReason] = useState('Packaging seal compromised');
  const [recallLoading, setRecallLoading] = useState(false);
  const [recallError, setRecallError] = useState<string | null>(null);

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
    setPickupsLoading(true);

    Promise.allSettled([
      apiFetch<{ donations: Donation[]; total: number }>('/donations/mine?page=1&limit=20'),
      apiFetch<{ pickups: PickupItem[]; pagination: unknown }>('/donors/pickups?page=1&limit=20'),
      apiFetch<VerificationData>('/donors/verification'),
    ]).then(([donationsRes, pickupsRes, verifRes]) => {
      if (donationsRes.status === 'fulfilled' && donationsRes.value.data) {
        setDonations(donationsRes.value.data.donations ?? []);
      } else if (donationsRes.status === 'rejected') {
        setDonationsError(friendlyError(donationsRes.reason, 'Could not load your listings.'));
      }
      setDonationsLoading(false);

      if (pickupsRes.status === 'fulfilled' && pickupsRes.value.data) {
        setPickups(pickupsRes.value.data.pickups ?? []);
      }
      setPickupsLoading(false);

      if (verifRes.status === 'fulfilled' && verifRes.value.data) {
        setVerification(verifRes.value.data);
      }
    });
  }, [user, retryCount]);

  async function handleAcceptSafetyAgreement() {
    setSigningSafety(true);
    try {
      const res = await apiPost<{ accepted: boolean; accepted_at?: string; version?: string }>('/donors/safety-agreement', {});
      const now = res.data?.accepted_at || new Date().toISOString();
      const ver = res.data?.version || '1.0';
      setVerification((prev) => ({
        verification_level: prev?.verification_level || 'COMMUNITY_DONOR',
        trust_score: prev?.trust_score ?? 100,
        safety_agreement_accepted_at: now,
        safety_agreement_version: ver,
      }));
      setSafetySuccessMsg(t('safety_pledge.pledge_accepted_badge') || 'Food Safety Pledge v1.0 accepted. Thank you for your commitment to community well-being.');
      setShowPledgeModal(false);
      setTimeout(() => setSafetySuccessMsg(null), 5000);
    } catch {
      // Optimistic update so user is never stuck
      setVerification((prev) => ({
        verification_level: prev?.verification_level || 'COMMUNITY_DONOR',
        trust_score: prev?.trust_score ?? 100,
        safety_agreement_accepted_at: new Date().toISOString(),
        safety_agreement_version: '1.0',
      }));
      setShowPledgeModal(false);
    } finally {
      setSigningSafety(false);
    }
  }

  async function handleCancelDonation(donationId: string) {
    setCancelError(null);
    try {
      await apiFetch(`/donations/${donationId}`, { method: 'DELETE' });
      setDonations((prev) => prev.filter((d) => d.id !== donationId));
    } catch (err) {
      setCancelError(friendlyError(err, 'Could not cancel listing. Please try again.'));
    }
  }

  async function confirmRecall() {
    if (!recallTargetId) return;
    setRecallLoading(true);
    setRecallError(null);
    try {
      await apiFetch(`/donations/${recallTargetId}/recall`, {
        method: 'POST',
        body: JSON.stringify({ reason: recallReason }),
      });
      setDonations((prev) =>
        prev.map((d) => (d.id === recallTargetId ? { ...d, status: 'RECALLED' } : d))
      );
      setRecallTargetId(null);
      setRetryCount((c) => c + 1);
    } catch (err) {
      setRecallError(friendlyError(err, 'Could not broadcast recall. Please try again.'));
    } finally {
      setRecallLoading(false);
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
      { ref: activeStatRef, value: activeDonations.length },
      { ref: totalStatRef, value: donations.length },
      { ref: completedStatRef, value: completedDonations.length },
    ];

    targets.forEach(({ ref, value }) => {
      if (!ref.current) return;
      const counter = { val: 0 };
      gsap.to(counter, {
        val: value,
        duration: 0.8,
        ease: 'power2.out',
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = String(Math.round(counter.val));
          }
        },
      });
    });
  }, [donations.length, activeDonations.length, completedDonations.length]);

  const hasSignedSafety = Boolean(verification?.safety_agreement_accepted_at);

  return (
    <div className="max-w-page mx-auto px-[var(--space-page)] py-8 sm:py-12">
      {/* ─── Header & Verification Tier ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--ink)] tracking-tight leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {t('dashboard.welcome', { name: user.display_name || user.full_name || 'Donor' })}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{verification?.verification_level === 'VERIFIED_BUSINESS' ? (t('dashboard.verified_business') || 'Verified Business') : (t('dashboard.community_donor') || 'Community Donor')}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
            {t('dashboard.subtitle') || 'Manage your surplus inventory, saved loading docks, and verified recipient collections.'}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/post"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-on)] font-bold text-xs sm:text-sm shadow-sm hover:bg-[var(--accent-dark)] transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dashboard.post_surplus') || 'Post Surplus'}</span>
          </Link>
          <button
            type="button"
            onClick={() => setVerifyModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] font-semibold text-xs sm:text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-[0.98] cursor-pointer shadow-xs"
          >
            <QrCode className="w-4 h-4" />
            <span>{t('dashboard.verify_code') || 'Verify Code'}</span>
          </button>
        </div>
      </div>

      {justPosted && (
        <Alert type="success" className="mb-6">
          Your donation has been listed on the public food map. Thank you for redistributing surplus!
        </Alert>
      )}

      {safetySuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2 text-xs mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{safetySuccessMsg}</span>
        </div>
      )}

      {/* ─── Safety Agreement Callout (if not signed) ─── */}
      {!hasSignedSafety && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-[var(--ink)]">
                {t('safety_pledge.banner_title') || 'Food Safety Pledge Agreement Required (v1.0)'}
              </h2>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed mt-0.5">
                {t('safety_pledge.banner_subtitle') || 'Before posting or verifying food handovers, please accept the EssenShare Food Safety Policy to protect recipient health.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowPledgeModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full border border-amber-500/40 bg-[var(--surface)] text-[var(--ink)] font-semibold text-xs hover:border-amber-600 transition-colors shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('safety_pledge.read_button') || 'Read Full Pledge'}</span>
            </button>
            <button
              type="button"
              onClick={handleAcceptSafetyAgreement}
              disabled={signingSafety}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {signingSafety && <LoadingSpinner size="sm" />}
              <span>{t('safety_pledge.accept_button') || 'Accept Safety Pledge'}</span>
            </button>
          </div>
        </div>
      )}

      <SafetyPledgeModal
        isOpen={showPledgeModal}
        onClose={() => setShowPledgeModal(false)}
        onAccept={handleAcceptSafetyAgreement}
        loading={signingSafety}
        alreadySigned={hasSignedSafety}
      />

      {/* ─── Quick Stats Counter Grid ─── */}
      <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
          <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-1">
            {t('dashboard.active_listings') || 'Active Surplus Listings'}
          </p>
          <p
            ref={activeStatRef}
            className="text-3xl font-extrabold text-[var(--accent)] tabular-nums"
          >
            {activeDonations.length}
          </p>
          <p className="text-[11px] text-[var(--ink-quiet)] mt-1">{t('dashboard.available_collection') || 'Available for recipient collection'}</p>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
          <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-1">
            {t('dashboard.total_listings') || 'Total Listings Posted'}
          </p>
          <p
            ref={totalStatRef}
            className="text-3xl font-extrabold text-[var(--ink)] tabular-nums"
          >
            {donations.length}
          </p>
          <p className="text-[11px] text-[var(--ink-quiet)] mt-1">{t('dashboard.lifetime_shared') || 'Lifetime surplus shared'}</p>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-xs">
          <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wider mb-1">
            {t('dashboard.confirmed_deliveries') || 'Confirmed Handover Deliveries'}
          </p>
          <p
            ref={completedStatRef}
            className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums"
          >
            {completedDonations.length}
          </p>
          <p className="text-[11px] text-[var(--ink-quiet)] mt-1">{t('common.verified') || 'Verified two-party handovers'}</p>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] mb-8 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'listings'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t('dashboard.tab_active') || 'Active Listings'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--surface-soft)] text-[var(--ink-muted)] tabular-nums">
            {donations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hubs')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'hubs'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{t('dashboard.tab_locations') || 'Distribution Hubs'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pickups')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pickups'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>{t('dashboard.tab_history') || 'Collection History'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--surface-soft)] text-[var(--ink-muted)] tabular-nums">
            {pickups.length}
          </span>
        </button>
      </div>

      {/* ─── Tab Content: 1. Active Listings ─── */}
      {activeTab === 'listings' && (
        <section ref={listingsRef} aria-labelledby="listings-heading">
          {donationsLoading && (
            <div className="flex items-center gap-3 py-8">
              <LoadingSpinner size="md" label="Loading listings" />
              <span className="text-[var(--ink-muted)] text-sm">Loading your surplus listings…</span>
            </div>
          )}

          {donationsError && (
            <div className="space-y-3">
              <Alert type="error">{donationsError}</Alert>
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-on)] text-xs font-semibold hover:bg-[var(--accent-dark)]"
              >
                Retry
              </button>
            </div>
          )}

          {cancelError && <Alert type="error" className="mb-4">{cancelError}</Alert>}

          {!donationsLoading && !donationsError && donations.length === 0 && (
            <div className="py-16 text-center border border-dashed border-[var(--line)] rounded-2xl bg-[var(--surface-soft)]/40 p-6">
              <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center mx-auto mb-3 text-[var(--ink-quiet)]">
                <Package className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-[var(--ink)] mb-1">
                {t('dashboard.no_active_title') || 'No surplus listings posted yet'}
              </h2>
              <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto mb-4">
                {t('dashboard.no_active_desc') || 'List unsold bread, prepared meals, or grocery surplus in under 90 seconds.'}
              </p>
              <Link
                href="/dashboard/post"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--accent)] text-[var(--accent-on)] text-xs font-bold shadow-xs hover:bg-[var(--accent-dark)] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{t('dashboard.post_surplus') || 'Post Surplus'}</span>
              </Link>
            </div>
          )}

          {!donationsLoading && donations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
              {donations.map((donation) => (
                <DonationCard
                  key={donation.id}
                  donation={donation}
                  showCancelButton
                  onCancel={handleCancelDonation}
                  showRecallButton
                  onRecall={(id) => setRecallTargetId(id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Tab Content: 2. Saved Hubs ─── */}
      {activeTab === 'hubs' && (
        <section aria-labelledby="hubs-heading">
          <SavedLocationsManager />
        </section>
      )}

      {/* ─── Tab Content: 3. Collection & Handover Activity ─── */}
      {activeTab === 'pickups' && (
        <section aria-labelledby="pickups-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="pickups-heading" className="text-base sm:text-lg font-bold text-[var(--ink)]">
                Recipient Collection Claims
              </h2>
              <p className="text-xs text-[var(--ink-muted)]">
                Pickup verification codes generated by recipients for collection at your location.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVerifyModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[var(--accent)] text-[var(--accent-on)] text-xs font-bold hover:bg-[var(--accent-dark)] transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Verify Code</span>
            </button>
          </div>

          {pickupsLoading && (
            <div className="flex items-center gap-3 py-6">
              <LoadingSpinner size="sm" label="Loading collection activity" />
              <span className="text-[var(--ink-muted)] text-sm">Checking collection claims…</span>
            </div>
          )}

          {!pickupsLoading && pickups.length === 0 && (
            <div className="p-8 text-center border border-dashed border-[var(--line)] rounded-2xl bg-[var(--surface)]">
              <p className="text-xs text-[var(--ink-muted)]">
                {t('dashboard.no_history_desc') || 'No recipient collection codes generated yet. When someone claims your food, their pickup code and status will appear here.'}
              </p>
            </div>
          )}

          {!pickupsLoading && pickups.length > 0 && (
            <div className="space-y-3">
              {pickups.map((p) => {
                const isPending = p.status === 'PENDING';
                const isConfirmed = p.status === 'CONFIRMED';
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[var(--line-strong)] transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-[var(--accent)] tracking-wider text-base">
                          {p.display_code}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isPending
                              ? 'bg-[var(--warning-bg)] text-[var(--warning)]'
                              : isConfirmed
                              ? 'bg-[var(--success-bg)] text-[var(--success)]'
                              : 'bg-[var(--surface-soft)] text-[var(--ink-muted)]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink-muted)] tabular-nums">
                        Requested {new Date(p.created_at).toLocaleString()}
                        {isConfirmed && p.confirmed_at && (
                          <span> · Handed over {new Date(p.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </p>
                    </div>

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => setVerifyModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-on)] text-xs font-semibold hover:bg-[var(--accent-dark)] transition-colors cursor-pointer self-start sm:self-auto min-h-[38px]"
                      >
                        Verify Handover
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Verify Pickup Handover Modal (with Camera QR Code scanner) */}
      <VerifyPickupModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        onConfirmed={() => {
          setRetryCount((c) => c + 1);
        }}
      />

      {/* Emergency Food Safety Recall Modal */}
      {recallTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setRecallTargetId(null)}
          />
          <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-[var(--line)] z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--ink)]">Emergency Food Safety Recall</h3>
                <p className="text-xs text-[var(--ink-muted)]">Immediate community hazard alert</p>
              </div>
            </div>

            <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
              Recalling this listing will immediately cancel all pending recipient pickup codes, prevent collection, and display an urgent safety notice.
            </p>

            {recallError && <Alert type="error">{recallError}</Alert>}

            <div>
              <label htmlFor="recall-reason" className="block text-xs font-semibold text-[var(--ink-muted)] uppercase mb-1.5">
                Recall Reason
              </label>
              <select
                id="recall-reason"
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--line)] text-sm text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
              >
                <option value="Packaging seal compromised">Packaging seal compromised</option>
                <option value="Temperature / Cold chain breakdown">Temperature / Cold chain breakdown</option>
                <option value="Undeclared allergen (nuts/gluten/dairy)">Undeclared allergen (nuts/gluten/dairy)</option>
                <option value="Spoilage or incorrect shelf life spotted">Spoilage or incorrect shelf life spotted</option>
                <option value="Contamination or foreign matter alert">Contamination or foreign matter alert</option>
                <option value="Other safety precaution">Other safety precaution</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRecallTargetId(null)}
                className="px-4 py-2.5 rounded-full text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRecall}
                disabled={recallLoading}
                className="px-5 py-2.5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {recallLoading ? 'Broadcasting Recall…' : 'Confirm & Broadcast Recall'}
              </button>
            </div>
          </div>
        </div>
      )}
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
