'use client';
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';
import { apiFetch, ApiException } from '@/lib/api';
import { friendlyError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n';
import { HeartHandshake, Search, Clock, CheckCircle2 } from 'lucide-react';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface PickupResponse {
  pickup_id: string;
  display_code: string;
  raw_code: string;
  expires_at: string;
  donation: Record<string, unknown>;
}

interface PickupStatusResponse {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' | 'RECALLED';
  display_code: string;
  expires_at: string;
  recall_reason?: string | null;
}

interface PickupCodeModalProps {
  donationId: string | null;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
}

export default function PickupCodeModal({ donationId, onClose, triggerRef }: PickupCodeModalProps) {
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<'agreement' | 'loading' | 'success' | 'error'>('agreement');
  const [pickup, setPickup] = useState<PickupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recalledReason, setRecalledReason] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const headingId = `pickup-modal-heading-${donationId}`;

  // Reset to agreement on open
  useEffect(() => {
    if (donationId) {
      setStep('agreement');
      setPickup(null);
      setQrDataUrl(null);
      setErrorMsg(null);
      setRecalledReason(null);
      setIsConfirmed(false);
    }
  }, [donationId]);

  const requestPickup = useCallback(async () => {
    if (!donationId) return;
    setStep('loading');
    setErrorMsg(null);
    try {
      let sessionToken =
        typeof window !== 'undefined' ? sessionStorage.getItem('ess_session') : null;
      if (!sessionToken) {
        try {
          const sessionEnv = await apiFetch<{ session_token: string }>('/auth/sessions', {
            method: 'POST',
          });
          sessionToken = sessionEnv.data?.session_token ?? null;
        } catch {
          sessionToken = generateUUID();
        }
        if (sessionToken && typeof window !== 'undefined') {
          sessionStorage.setItem('ess_session', sessionToken);
        }
      }

      const envelope = await apiFetch<PickupResponse>('/pickups/request', {
        method: 'POST',
        body: JSON.stringify({
          donation_id: donationId,
          requested_qty: 1,
          liability_accepted: true,
        }),
        headers: {
          'x-session-token': sessionToken ?? '',
          'Content-Type': 'application/json',
        },
      });

      if (envelope.data) {
        setPickup(envelope.data);
        // Generate QR code for instant cashier camera scanning
        try {
          const qrUrl = await QRCode.toDataURL(envelope.data.display_code, {
            width: 200,
            margin: 1,
            color: { dark: '#0f766e', light: '#ffffff' },
          });
          setQrDataUrl(qrUrl);
        } catch {
          // Non-blocking fallback
        }
        setStep('success');
      } else {
        throw new Error('No pickup data returned.');
      }
    } catch (err: unknown) {
      setStep('error');
      const apiErr = err as { code?: string; message?: string };
      if (apiErr?.code === 'MAX_ACTIVE_RESERVATIONS') {
        setErrorMsg(
          'Active reservation limit reached (maximum 2 uncollected pickups). Please collect or cancel an existing pickup before claiming more surplus food.'
        );
      } else {
        setErrorMsg(friendlyError(err, 'Could not generate your code. Please try again.'));
      }
    }
  }, [donationId]);

  // Polling for status updates (e.g. Handover confirmed or Emergency Recall)
  useEffect(() => {
    if (step !== 'success' || !pickup) return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const sessionToken = sessionStorage.getItem('ess_session');
        const res = await apiFetch<PickupStatusResponse>(`/pickups/${pickup.pickup_id}/status`, {
          headers: { 'x-session-token': sessionToken ?? '' },
        });

        if (res.data) {
          if (res.data.status === 'RECALLED') {
            setRecalledReason(res.data.recall_reason || 'Food safety alert issued by donor.');
          } else if (res.data.status === 'CONFIRMED') {
            setIsConfirmed(true);
          }
        }
      } catch {
        // silent polling catch
      }
    }, 6000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [step, pickup]);

  // Focus trap & Escape key
  useEffect(() => {
    if (!donationId) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trapTarget: HTMLDivElement = dialog;
    trapTarget.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = trapTarget.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef?.current?.focus();
    };
  }, [donationId, onClose, triggerRef]);

  async function handleCancel() {
    if (!pickup) return;
    setCancelLoading(true);
    try {
      await apiFetch(`/pickups/${pickup.pickup_id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setCancelLoading(false);
    onClose();
  }

  function formatExpiry(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  if (!donationId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop blur + dim */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          backdropFilter: 'blur(4px) brightness(0.72)',
          WebkitBackdropFilter: 'blur(4px) brightness(0.72)',
          backgroundColor: 'oklch(0% 0 0 / 0.35)',
        }}
      />

      {/* Dialog container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative bg-surface rounded-2xl shadow-modal w-full max-w-md p-6 space-y-4 max-h-[92vh] overflow-y-auto border border-line"
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ─── STEP 1: Good Samaritan & Food Safety Agreement ─── */}
        {step === 'agreement' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 id={headingId} className="text-step-0 font-bold text-ink">
                  Food Safety & Community Agreement
                </h2>
                <p className="text-xs text-ink-muted">Good Samaritan surplus redistribution</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-soft border border-line-subtle space-y-3 text-xs leading-relaxed text-ink-muted">
              <div className="flex items-start gap-2.5">
                <HeartHandshake className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="text-ink font-semibold">Good Samaritan Donation:</strong>
                  <p>All items are surplus shared in good faith without fee or commercial warranty.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="text-ink font-semibold">Inspect on Collection:</strong>
                  <p>Check packaging integrity, smell, and temperature upon handover. If in doubt, do not consume.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="text-ink font-semibold">45-Minute Courtesy Hold:</strong>
                  <p>Claim only if you can travel now. Please cancel if plans change so food isn&apos;t wasted.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={requestPickup}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-pill bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors cursor-pointer shadow-sm min-h-[46px]"
              >
                <span>Accept & Reveal Pickup Code</span>
                <svg className="w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs text-ink-muted hover:text-ink font-medium"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* ─── LOADING ─── */}
        {step === 'loading' && (
          <div className="flex flex-col items-center py-10 gap-4">
            <LoadingSpinner size="md" label={t('common.loading')} />
            <p className="text-sm text-ink-muted">{t('common.loading')}</p>
          </div>
        )}

        {/* ─── STEP 2: CODE & QR CODE REVEALED ─── */}
        {step === 'success' && pickup && (
          <div className="space-y-4">
            {/* Emergency Recall Banner */}
            {recalledReason && (
              <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/50 text-red-200 space-y-2 text-left" role="alert">
                <div className="flex items-center gap-2 font-bold text-sm text-red-300">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>URGENT: DONATION RECALLED</span>
                </div>
                <p className="text-xs">{recalledReason}</p>
                <p className="text-xs font-semibold">Do not collect or consume this food item.</p>
              </div>
            )}

            {isConfirmed && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-center text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Handover confirmed by donor! Enjoy your meal.</span>
              </div>
            )}

            {!recalledReason && (
              <>
                <div className="text-center pt-1">
                  <h2 id={headingId} className="text-step-0 font-bold text-ink mb-1">
                    {t('pickup.modal_title')}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Show this code or QR to the donor when you collect
                  </p>
                </div>

                {/* QR Code Container */}
                {qrDataUrl && (
                  <div className="flex justify-center my-2">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-line inline-block">
                      <Image
                        src={qrDataUrl}
                        alt={`QR code for ${pickup.display_code}`}
                        width={170}
                        height={170}
                        className="rounded-lg"
                        priority
                      />
                    </div>
                  </div>
                )}

                {/* Text Code with Copy */}
                <div className="text-center">
                  <p
                    aria-label={`Pickup code: ${pickup.display_code}`}
                    className="font-mono text-3xl font-extrabold tracking-widest text-accent my-1"
                  >
                    {pickup.display_code}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!pickup?.display_code) return;
                      try {
                        await navigator.clipboard.writeText(pickup.display_code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        // ignore
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill border border-line text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
                  >
                    {copied ? t('pickup.copied') : t('pickup.copy_code')}
                  </button>
                </div>

                {/* Expiry Badge */}
                {pickup.expires_at && (
                  <div className="text-center">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                      ⏱️ Valid until {formatExpiry(pickup.expires_at)}
                    </span>
                  </div>
                )}

                {/* Donor Phone Contact */}
                {pickup.donation && typeof (pickup.donation as Record<string, unknown>).donor_phone === 'string' && (
                  <div className="p-3 rounded-xl bg-surface-soft border border-line-subtle text-center text-xs text-ink-muted">
                    <span>Contact donor: </span>
                    <a
                      href={`tel:${String((pickup.donation as Record<string, unknown>).donor_phone)}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      {String((pickup.donation as Record<string, unknown>).donor_phone)}
                    </a>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-pill bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[42px]"
              >
                {t('common.close')}
              </button>
              {!recalledReason && !isConfirmed && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-pill border border-line text-xs font-medium text-ink-muted hover:bg-surface-soft transition-colors disabled:opacity-50 min-h-[38px]"
                >
                  {cancelLoading && <LoadingSpinner size="sm" label={t('common.cancel')} />}
                  {t('pickup.cancel_code')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── ERROR STATE ─── */}
        {step === 'error' && (
          <div className="space-y-4">
            {errorMsg && <Alert type="error">{errorMsg}</Alert>}
            <button
              type="button"
              onClick={requestPickup}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-pill bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[42px]"
            >
              {t('common.retry')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs text-ink-muted hover:text-ink font-medium"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
