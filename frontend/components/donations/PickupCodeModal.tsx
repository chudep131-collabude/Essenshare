'use client';
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';
import { apiFetch, ApiException } from '@/lib/api';

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

interface PickupCodeModalProps {
  donationId: string | null;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
}

export default function PickupCodeModal({ donationId, onClose, triggerRef }: PickupCodeModalProps) {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [pickup, setPickup] = useState<PickupResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingId = `pickup-modal-heading-${donationId}`;

  const requestPickup = useCallback(async () => {
    if (!donationId) return;
    setState('loading');
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
        body: JSON.stringify({ donation_id: donationId, requested_qty: 1 }),
        headers: {
          'x-session-token': sessionToken ?? '',
          'Content-Type': 'application/json',
        },
      });
      if (envelope.data) {
        setPickup(envelope.data);
        setState('success');
      } else {
        throw new Error('No pickup data returned.');
      }
    } catch (err) {
      setState('error');
      setErrorMsg(
        err instanceof ApiException
          ? err.message
          : 'Could not generate your code. Please try again.'
      );
    }
  }, [donationId]);

  useEffect(() => {
    if (donationId) requestPickup();
  }, [donationId, requestPickup]);

  // Focus trap & Escape key runs only when modal opens/closes, not on state transitions
  useEffect(() => {
    if (!donationId) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Capture a non-null reference for use inside the keydown closure
    const trapTarget: HTMLDivElement = dialog;
    // Focus the dialog container itself on open so the trap is immediately active.
    trapTarget.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        // Re-query on every Tab so focusable elements after state changes are included
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
      // Return focus to the element that triggered the modal (WCAG SC 3.2.2 / ARIA modal pattern)
      triggerRef?.current?.focus();
    };
  }, [donationId, onClose, triggerRef]);

  async function handleCancel() {
    if (!pickup) return;
    setCancelLoading(true);
    try {
      await apiFetch(`/pickups/${pickup.pickup_id}`, { method: 'DELETE' });
    } catch {
      // ignore close regardless
    }
    setCancelLoading(false);
    onClose();
  }

  function formatExpiry(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (!donationId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop — blur + dim */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          backdropFilter: 'blur(4px) brightness(0.72)',
          WebkitBackdropFilter: 'blur(4px) brightness(0.72)',
          backgroundColor: 'oklch(0% 0 0 / 0.25)',
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative bg-surface rounded-lg shadow-modal w-full max-w-sm mx-4 p-6 space-y-5"
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2
          id={headingId}
          className="text-step-1 font-bold text-ink"
          style={{ letterSpacing: '-0.02em' }}
        >
          Your Pickup Code
        </h2>

        {state === 'loading' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <LoadingSpinner size="md" label="Generating your code" />
            <p className="text-sm text-ink-muted">Generating your code…</p>
          </div>
        )}

        {state === 'success' && pickup && (
          <>
            <div className="text-center py-4">
              <p
                aria-label={`Pickup code: ${pickup.display_code}`}
                style={{
                  fontSize: 'clamp(2rem, 10vw, 3.5rem)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.12em',
                  color: 'var(--accent)',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  animation: 'codeReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
                }}
              >
                {pickup.display_code}
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (!pickup?.display_code) return;
                  try {
                    await navigator.clipboard.writeText(pickup.display_code);
                  } catch {
                    return;
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                aria-label="Copy pickup code to clipboard"
                style={{
                  marginBlockStart: 'var(--space-s)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  paddingInline: 'var(--space-m)',
                  paddingBlock: '0.4rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  color: copied ? 'var(--success)' : 'var(--ink-muted)',
                  fontSize: 'var(--step--1)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: `color var(--dur-fast)`,
                  minHeight: '36px',
                }}
              >
                {copied ? 'Copied!' : 'Copy code'}
              </button>
              <p className="mt-3 text-sm text-ink-muted">
                Show this code to the donor when you collect.
              </p>
              {pickup.expires_at && (
                <p
                  className="mt-1 text-xs text-ink-muted"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  Valid until {formatExpiry(pickup.expires_at)}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center px-5 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[44px]"
              >
                I&apos;ve collected
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-md border border-line text-sm font-medium text-ink-muted hover:bg-surface-soft transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {cancelLoading && <LoadingSpinner size="sm" label="Cancelling" />}
                Cancel this request
              </button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            {errorMsg && <Alert type="error">{errorMsg}</Alert>}
            <button
              type="button"
              onClick={requestPickup}
              className="w-full flex items-center justify-center px-5 py-3 rounded-md bg-accent text-[var(--accent-on)] font-semibold text-sm hover:bg-accent-dark transition-colors min-h-[44px]"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
