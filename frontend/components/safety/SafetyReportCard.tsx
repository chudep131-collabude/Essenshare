'use client';

import { useState } from 'react';
import SafetyReportModal from './SafetyReportModal';

export default function SafetyReportCard() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="not-prose p-6 rounded-lg border border-line bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-ink text-base mb-1">
            Found an unsafe listing or expired items?
          </p>
          <p className="text-sm text-ink-muted">
            You can submit an immediate safety report directly online, or email our 24/7 moderation team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-error text-white font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer min-h-[44px]"
          >
            Submit Safety Report
          </button>
          <a
            href="mailto:safety@essenshare.org?subject=Urgent%20Safety%20Report"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-md border border-line text-ink-muted hover:text-ink font-medium text-sm transition-colors min-h-[44px]"
          >
            Email Safety Team
          </a>
        </div>
      </div>

      <SafetyReportModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
