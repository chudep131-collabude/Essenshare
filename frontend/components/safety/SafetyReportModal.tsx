'use client';

import { useState, useEffect, useRef } from 'react';
import { apiPost, apiFetch, ApiException } from '@/lib/api';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { friendlyError } from '@/lib/errors';

interface DonationOption {
  id: string;
  title: string;
  pickup_address: string;
}

const REPORT_CATEGORIES = [
  { value: 'UNSAFE_FOOD', label: 'Unsafe or contaminated food (Immediate auto-hide)' },
  { value: 'SPOILED_OR_EXPIRED', label: 'Spoiled or past use-by date' },
  { value: 'WRONG_ALLERGEN_INFO', label: 'Undeclared or incorrect allergens (Immediate auto-hide)' },
  { value: 'COLD_CHAIN_CONCERN', label: 'Improper storage / temperature break' },
  { value: 'WRONG_DESCRIPTION', label: 'Description does not match items' },
  { value: 'ALREADY_GONE', label: 'Listing no longer available / already collected' },
  { value: 'DONOR_MISCONDUCT', label: 'Donor misconduct or unsafe behavior' },
  { value: 'OTHER', label: 'Other concern' },
];

interface SafetyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SafetyReportModal({ isOpen, onClose }: SafetyReportModalProps) {
  const [donationId, setDonationId] = useState('');
  const [manualId, setManualId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [recentListings, setRecentListings] = useState<DonationOption[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccessMessage(null);
    setListingsLoading(true);

    apiFetch<{ donations: DonationOption[] }>('/donations?page=1&limit=20')
      .then((res) => {
        setRecentListings(res.data?.donations ?? []);
      })
      .catch(() => {
        // Fall back gracefully to manual ID input
      })
      .finally(() => {
        setListingsLoading(false);
      });
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const targetId = donationId === 'MANUAL' ? manualId.trim() : donationId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) {
      setError('Please select or specify the donation.');
      return;
    }
    if (!category) {
      setError('Please select a report category.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiPost<{ report_id: string; message: string }>('/reports', {
        donation_id: targetId,
        category,
        description: description.trim() || undefined,
      });

      setSuccessMessage(
        res.data?.message || 'Report submitted successfully. Thank you for protecting community health.'
      );
      setTimeout(() => {
        onClose();
        setDonationId('');
        setManualId('');
        setCategory('');
        setDescription('');
        setSuccessMessage(null);
      }, 2400);
    } catch (err) {
      setError(friendlyError(err, 'Could not submit report. Please check the ID and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-md border border-line text-sm text-ink placeholder:text-ink-quiet bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-error-bg text-error flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 id="safety-modal-title" className="text-step-1 font-bold text-ink">
              Submit Safety Report
            </h2>
            <p className="text-xs text-ink-muted">
              Anonymous report • High severity listings are immediately hidden
            </p>
          </div>
        </div>

        {successMessage ? (
          <Alert type="success" className="my-4">
            {successMessage}
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            {/* Donation selection */}
            <div>
              <label htmlFor="safety-donation-select" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Select Donation <span className="text-error">*</span>
              </label>
              <select
                id="safety-donation-select"
                value={donationId}
                onChange={(e) => setDonationId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">Choose a listed item…</option>
                {recentListings.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.pickup_address})
                  </option>
                ))}
                <option value="MANUAL">— Enter donation UUID manually —</option>
              </select>
            </div>

            {donationId === 'MANUAL' && (
              <div>
                <label htmlFor="safety-manual-id" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Donation UUID <span className="text-error">*</span>
                </label>
                <input
                  id="safety-manual-id"
                  type="text"
                  placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            )}

            {/* Category selection */}
            <div>
              <label htmlFor="safety-category-select" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Reason for report <span className="text-error">*</span>
              </label>
              <select
                id="safety-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">Select concern category…</option>
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="safety-description" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Details (optional)
              </label>
              <textarea
                id="safety-description"
                rows={3}
                maxLength={500}
                placeholder="Describe the issue, packaging date, off odor, broken seal, or observation…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} resize-none`}
              />
              <p className="mt-1 text-right text-xs text-ink-quiet font-tabular">
                {description.length}/500
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-md border border-line text-sm font-medium text-ink hover:bg-surface-soft transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-error text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
              >
                {submitting && <LoadingSpinner size="sm" label="Submitting report" />}
                {submitting ? 'Submitting…' : 'Submit Safety Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
