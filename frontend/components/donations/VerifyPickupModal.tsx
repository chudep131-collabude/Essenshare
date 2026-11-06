'use client';

import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { apiPost } from '@/lib/api';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { friendlyError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n';

interface VerifyPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}

interface VerifiedPickupData {
  pickup: {
    id: string;
    donation_id: string;
    display_code: string;
    requested_qty: number;
    status: string;
    expires_at: string;
  };
  donation: {
    id: string;
    title: string;
    quantity: number;
    quantity_unit: string;
    weight_kg?: number | null;
  } | null;
}

export default function VerifyPickupModal({
  isOpen,
  onClose,
  onConfirmed,
}: VerifyPickupModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'enter_code' | 'scan_camera' | 'confirm_handover' | 'success'>('enter_code');
  const [code, setCode] = useState('');
  const [verifiedData, setVerifiedData] = useState<VerifiedPickupData | null>(null);
  const [confirmedQty, setConfirmedQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  const stopScanner = useCallback(async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch {
        // ignore
      }
      qrScannerRef.current = null;
    }
  }, []);

  // Cleanup on modal close or unmount
  useEffect(() => {
    if (isOpen) {
      setStep('enter_code');
      setCode('');
      setVerifiedData(null);
      setError(null);
      setCameraError(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      void stopScanner();
    }
    return () => {
      void stopScanner();
    };
  }, [isOpen, stopScanner]);

  const verifyCodeValue = useCallback(async (codeToVerify: string) => {
    const cleanCode = codeToVerify.trim().replace(/[-\s]/g, '');
    if (cleanCode.length < 6) {
      setError('Please enter a valid 8-character pickup code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const envelope = await apiPost<VerifiedPickupData>('/pickups/verify', { code: cleanCode });
      if (envelope.data && envelope.data.pickup) {
        setVerifiedData(envelope.data);
        setConfirmedQty(envelope.data.pickup.requested_qty || 1);
        setStep('confirm_handover');
      } else {
        setError('No pickup matching that code was found.');
      }
    } catch (err) {
      setError(friendlyError(err, 'Pickup code not found or already completed.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize camera scanner when step === 'scan_camera'
  useEffect(() => {
    if (step === 'scan_camera') {
      setCameraError(null);
      const elementId = 'reader-camera-stream';

      // Give DOM time to render div
      const timer = setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode(elementId);
          qrScannerRef.current = scanner;

          await scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
            },
            (decodedText) => {
              // On QR detected: Stop camera & verify automatically!
              void stopScanner().then(() => {
                setCode(decodedText.toUpperCase());
                void verifyCodeValue(decodedText);
              });
            },
            () => {
              // frame scan failure (ignore)
            }
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setCameraError(
            msg.includes('NotAllowedError') || msg.includes('Permission')
              ? 'Camera permission denied. Please allow camera access in your browser or enter the code manually.'
              : 'Could not start camera scanner. Please enter the 8-character code manually.'
          );
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        void stopScanner();
      };
    }
  }, [step, stopScanner, verifyCodeValue]);

  if (!isOpen) return null;

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    await verifyCodeValue(code);
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (!verifiedData?.pickup?.id) return;

    setLoading(true);
    setError(null);
    try {
      const payload: { confirmed_qty: number } = {
        confirmed_qty: Number(confirmedQty) || 1,
      };

      await apiPost(`/pickups/${verifiedData.pickup.id}/confirm`, payload);
      setStep('success');
      onConfirmed();
    } catch (err) {
      setError(friendlyError(err, 'Could not complete handover. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  function handleCloseModal() {
    void stopScanner();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-pickup-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleCloseModal}
      />

      {/* Modal Dialog */}
      <div className="relative bg-surface rounded-2xl shadow-modal w-full max-w-md p-6 space-y-4 border border-line z-10 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
          <h2 id="verify-pickup-title" className="text-step-0 font-bold text-ink">
            {step === 'success' ? 'Handover Complete' : 'Verify Handover Code'}
          </h2>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* ─── STEP 1: Enter Pickup Code (Manual) ─── */}
        {step === 'enter_code' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-ink-muted leading-relaxed">
              Ask recipient for their 8-character code or scan their QR code on screen.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('scan_camera')}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-accent/40 bg-[var(--accent-muted)]/40 hover:bg-[var(--accent-muted)] text-accent font-semibold text-sm transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Scan Recipient QR</span>
              </button>
            </div>

            <div>
              <label htmlFor="handover-code" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">
                Or Type 8-Character Code
              </label>
              <input
                id="handover-code"
                ref={inputRef}
                type="text"
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="e.g. B4C9-E710"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl border border-line text-xl font-mono tracking-widest text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] uppercase text-center font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 rounded-pill text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || code.trim().length < 6}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-pill bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 cursor-pointer min-h-[42px]"
              >
                {loading && <LoadingSpinner size="sm" label="Verifying code" />}
                {loading ? 'Verifying…' : 'Check Code'}
              </button>
            </div>
          </form>
        )}

        {/* ─── STEP 1B: Scan with Live Camera ─── */}
        {step === 'scan_camera' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-ink-muted">
              Point your camera at the QR code on the recipient&apos;s phone.
            </p>

            {cameraError ? (
              <div className="space-y-3">
                <Alert type="warning">{cameraError}</Alert>
                <button
                  type="button"
                  onClick={() => setStep('enter_code')}
                  className="px-4 py-2 rounded-pill bg-accent text-[var(--accent-on)] text-xs font-semibold"
                >
                  Enter Code Manually
                </button>
              </div>
            ) : (
              <div className="relative mx-auto rounded-2xl overflow-hidden border-2 border-accent bg-black aspect-square max-w-[280px]">
                <div id="reader-camera-stream" className="w-full h-full" />
                {loading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <LoadingSpinner size="md" label="Verifying scanned code" />
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  void stopScanner();
                  setStep('enter_code');
                }}
                className="inline-flex items-center justify-center px-4 py-2 rounded-pill border border-line text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
              >
                Switch to Manual Code Entry
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Confirm Handover ─── */}
        {step === 'confirm_handover' && verifiedData && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-soft border border-line-subtle space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-ink-muted uppercase tracking-wider">
                <span>Verified Match</span>
                <span className="font-mono text-accent font-bold text-sm">{verifiedData.pickup.display_code}</span>
              </div>
              <p className="text-base font-bold text-ink">
                {verifiedData.donation?.title ?? 'Food Donation'}
              </p>
              <p className="text-xs text-ink-muted">
                Requested Quantity: {verifiedData.pickup.requested_qty} {verifiedData.donation?.quantity_unit ?? 'items'}
              </p>
            </div>

            <div>
              <label htmlFor="confirm-quantity" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                Handover Quantity ({verifiedData.donation?.quantity_unit ?? 'items'})
              </label>
              <input
                id="confirm-quantity"
                type="number"
                min="1"
                max={verifiedData.pickup.requested_qty}
                value={confirmedQty}
                onChange={(e) => setConfirmedQty(parseInt(e.target.value, 10) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-line text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('enter_code')}
                className="px-4 py-2.5 rounded-pill text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-pill bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-50 cursor-pointer min-h-[42px]"
              >
                {loading && <LoadingSpinner size="sm" label="Confirming handover" />}
                {loading ? 'Confirming…' : 'Complete Handover'}
              </button>
            </div>
          </form>
        )}

        {/* ─── STEP 3: Success Screen ─── */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-step-1 font-bold text-ink">Food Handed Over Successfully!</h3>
            <p className="text-xs text-ink-muted max-w-[280px] mx-auto">
              Your surplus has been marked as collected and recorded in the community impact ledger. Thank you for preventing food waste!
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full py-2.5 px-6 rounded-pill bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors cursor-pointer"
              >
                {t('common.done') || 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
