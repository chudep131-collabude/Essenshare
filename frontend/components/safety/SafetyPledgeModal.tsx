'use client';

import { useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Snowflake,
  AlertTriangle,
  PackageCheck,
  HeartHandshake,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface SafetyPledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  loading?: boolean;
  alreadySigned?: boolean;
}

export default function SafetyPledgeModal({
  isOpen,
  onClose,
  onAccept,
  loading = false,
  alreadySigned = false,
}: SafetyPledgeModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pledge-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div
        ref={modalRef}
        className="bg-[var(--surface)] border border-[var(--line-strong)] text-[var(--ink)] max-w-2xl w-full max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--line)] flex items-start justify-between gap-4 bg-[var(--surface-soft)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-800 dark:text-teal-300 mb-1">
                Policy Agreement v1.0
              </span>
              <h2 id="pledge-modal-title" className="text-lg sm:text-xl font-extrabold text-[var(--ink)] tracking-tight">
                {t('safety_pledge.title')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close safety pledge"
            className="p-1.5 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm leading-relaxed text-[var(--ink-muted)]">
          <p className="font-medium text-[var(--ink)] text-sm sm:text-base">
            {t('safety_pledge.subtitle')}
          </p>

          <div className="space-y-4">
            {/* Principle 1 */}
            <div className="p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)]">
              <div className="flex items-center gap-2.5 font-bold text-[var(--ink)] mb-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('safety_pledge.rule1_title')}</span>
              </div>
              <p className="leading-relaxed">
                {t('safety_pledge.rule1_desc')}
              </p>
            </div>

            {/* Principle 2 */}
            <div className="p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)]">
              <div className="flex items-center gap-2.5 font-bold text-[var(--ink)] mb-1.5 text-sm">
                <Snowflake className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{t('safety_pledge.rule2_title')}</span>
              </div>
              <p className="leading-relaxed">
                {t('safety_pledge.rule2_desc')}
              </p>
            </div>

            {/* Principle 3 */}
            <div className="p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)]">
              <div className="flex items-center gap-2.5 font-bold text-[var(--ink)] mb-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t('safety_pledge.rule3_title')}</span>
              </div>
              <p className="leading-relaxed">
                {t('safety_pledge.rule3_desc')}
              </p>
            </div>

            {/* Principle 4 */}
            <div className="p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)]">
              <div className="flex items-center gap-2.5 font-bold text-[var(--ink)] mb-1.5 text-sm">
                <PackageCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{t('safety_pledge.rule4_title')}</span>
              </div>
              <p className="leading-relaxed">
                {t('safety_pledge.rule4_desc')}
              </p>
            </div>

            {/* Principle 5 */}
            <div className="p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--line)]">
              <div className="flex items-center gap-2.5 font-bold text-[var(--ink)] mb-1.5 text-sm">
                <HeartHandshake className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{t('safety_pledge.rule5_title')}</span>
              </div>
              <p className="leading-relaxed">
                {t('safety_pledge.rule5_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--line)] bg-[var(--surface-soft)] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[var(--ink-quiet)] text-center sm:text-start">
            {alreadySigned ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('safety_pledge.pledge_accepted_badge')}
              </span>
            ) : (
              <span>Your acceptance is cryptographically recorded in the immutable audit ledger.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-[var(--line-strong)] text-[var(--ink)] font-semibold text-xs hover:bg-[var(--line)] transition-colors cursor-pointer"
            >
              {alreadySigned || !onAccept ? t('common.close') : t('common.cancel')}
            </button>

            {onAccept && !alreadySigned && (
              <button
                type="button"
                onClick={onAccept}
                disabled={loading}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? t('common.loading') : t('safety_pledge.accept_checkbox')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
