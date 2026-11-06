'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiException } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';
import AdminTable, { Column } from '@/components/admin/AdminTable';

interface AdminReport {
  id: string;
  donation_id: string;
  category: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
  auto_hidden: boolean;
}

interface ReportsResponse {
  rows: AdminReport[];
  total: number;
}

interface ResolveFormState {
  reportId: string;
  status: string;
  notes: string;
  autoHidden: boolean;
  restoreDonation: boolean;
  loading: boolean;
  error: string | null;
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'REVIEWING', label: 'Reviewing' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const COLUMNS: Column[] = [
  { key: 'category', label: 'Category', width: '18%' },
  { key: 'severity', label: 'Severity', width: '13%' },
  { key: 'status', label: 'Status', width: '13%' },
  { key: 'auto_hidden', label: 'Auto-hidden', width: '12%' },
  { key: 'created_at', label: 'Reported at', width: '15%' },
  { key: 'actions', label: 'Actions', width: '14%' },
];

function SeverityChip({ severity }: { severity: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: 'var(--error-bg)',   color: 'var(--error)' },
    HIGH:     { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    MEDIUM:   { bg: 'var(--info-bg)',    color: 'var(--info)' },
    LOW:      { bg: 'var(--surface-soft)', color: 'var(--ink-muted)' },
  };
  const s = styles[severity] ?? { bg: 'var(--surface-soft)', color: 'var(--ink-muted)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--step--1)',
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {severity}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    OPEN:      { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    REVIEWING: { bg: 'var(--info-bg)',    color: 'var(--info)' },
    RESOLVED:  { bg: 'var(--success-bg)', color: 'var(--success)' },
    DISMISSED: { bg: 'var(--surface-soft)', color: 'var(--ink-muted)' },
  };
  const s = styles[status] ?? { bg: 'var(--surface-soft)', color: 'var(--ink-muted)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--step--1)',
        fontWeight: 500,
        background: s.bg,
        color: s.color,
      }}
    >
      {status}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: 'var(--space-xs) var(--space-s)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--line-strong)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 'var(--step-0)',
  cursor: 'pointer',
  minWidth: '160px',
};

const LIMIT = 20;

export default function AdminReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolveForm, setResolveForm] = useState<ResolveFormState | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'ADMIN') router.push('/');
  }, [user, loading, router]);

  const fetchReports = useCallback(async () => {
    setFetchLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) params.set('status', statusFilter);

      const envelope = await apiFetch<ReportsResponse>(`/admin/reports?${params.toString()}`);
      setRows(envelope.data?.rows ?? []);
      setTotal(envelope.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Failed to load reports.');
    } finally {
      setFetchLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (!loading && user && user.role === 'ADMIN') {
      fetchReports();
    }
  }, [loading, user, fetchReports]);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveForm) return;
    setResolveForm((prev) => prev ? { ...prev, loading: true, error: null } : prev);
    try {
      await apiFetch(`/admin/reports/${resolveForm.reportId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: resolveForm.status,
          resolution_notes: resolveForm.notes,
          notes: resolveForm.notes,
          restore_donation: resolveForm.restoreDonation,
        }),
      });
      setResolveForm(null);
      await fetchReports();
    } catch (err) {
      const msg = err instanceof ApiException ? err.message : 'Failed to resolve report.';
      setResolveForm((prev) => prev ? { ...prev, loading: false, error: msg } : prev);
    }
  };

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalPages = Math.ceil(total / LIMIT);

  const tableRows: Record<string, unknown>[] = rows.map((r) => ({
    category: r.category,
    severity: r.severity,
    status: r.status,
    auto_hidden: r.auto_hidden,
    created_at: r.created_at,
    actions: r,
  }));

  function renderCell(key: string, value: unknown, _row: Record<string, unknown>): React.ReactNode {
    if (key === 'severity') return <SeverityChip severity={value as string} />;
    if (key === 'status') return <StatusChip status={value as string} />;
    if (key === 'auto_hidden') {
      return value === true ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 'var(--step--1)',
            fontWeight: 500,
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
          }}
        >
          Auto-hidden
        </span>
      ) : null;
    }
    if (key === 'created_at') {
      return (
        <span style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {new Date(value as string).toLocaleDateString()}
        </span>
      );
    }
    if (key === 'actions') {
      const r = value as AdminReport;
      const isOpen = r.status === 'OPEN' || r.status === 'REVIEWING';
      if (!isOpen) return null;
      return (
        <button
          onClick={() =>
            setResolveForm({
              reportId: r.id,
              status: 'RESOLVED',
              notes: '',
              autoHidden: r.auto_hidden,
              restoreDonation: r.auto_hidden,
              loading: false,
              error: null,
            })
          }
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid color-mix(in oklch, var(--accent) 40%, transparent)',
            background: 'var(--accent-muted)',
            color: 'var(--accent-dark)',
            cursor: 'pointer',
            fontSize: 'var(--step--1)',
            fontWeight: 500,
          }}
        >
          Resolve
        </button>
      );
    }
    return <span style={{ fontSize: 'var(--step-0)', color: 'var(--ink)' }}>{String(value ?? '')}</span>;
  }

  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--step-3)',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBlockEnd: 'var(--space-l)',
          letterSpacing: '-0.02em',
        }}
      >
        Reports
      </h1>

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-s)',
          marginBottom: 'var(--space-l)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={selectStyle}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)', marginInlineStart: 'auto' }}>
          {total.toLocaleString()} report{total !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-l)' }}>
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {fetchLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <AdminTable columns={COLUMNS} rows={tableRows} renderCell={renderCell} />
      )}

      {/* Pagination */}
      {!fetchLoading && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-m)',
            marginTop: 'var(--space-l)',
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: 'var(--space-xs) var(--space-m)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
              fontSize: 'var(--step-0)',
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 'var(--step-0)', color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: 'var(--space-xs) var(--space-m)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1,
              fontSize: 'var(--step-0)',
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Resolve modal */}
      {resolveForm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Resolve report"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-m)',
            background: 'oklch(0% 0 0 / 0.4)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setResolveForm(null);
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-modal)',
              padding: 'var(--space-xl)',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--step-1)',
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: 'var(--space-l)',
                letterSpacing: '-0.02em',
              }}
            >
              Resolve Report
            </h2>

            {resolveForm.error && (
              <div style={{ marginBottom: 'var(--space-m)' }}>
                <Alert type="error">{resolveForm.error}</Alert>
              </div>
            )}

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
              <div>
                <label
                  htmlFor="resolve-status"
                  style={{
                    display: 'block',
                    fontSize: 'var(--step--1)',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  Resolution
                </label>
                <select
                  id="resolve-status"
                  value={resolveForm.status}
                  onChange={(e) => setResolveForm((prev) => prev ? { ...prev, status: e.target.value } : prev)}
                  style={{ ...selectStyle, width: '100%' }}
                >
                  <option value="RESOLVED">Resolved</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="resolve-notes"
                  style={{
                    display: 'block',
                    fontSize: 'var(--step--1)',
                    fontWeight: 600,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  Notes (optional)
                </label>
                <textarea
                  id="resolve-notes"
                  value={resolveForm.notes}
                  onChange={(e) => setResolveForm((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                  rows={3}
                  placeholder="Add notes about the resolution…"
                  style={{
                    width: '100%',
                    padding: 'var(--space-xs) var(--space-s)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line-strong)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: 'var(--step-0)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {resolveForm.autoHidden && resolveForm.status === 'RESOLVED' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <input
                    id="restore-donation-check"
                    type="checkbox"
                    checked={resolveForm.restoreDonation}
                    onChange={(e) =>
                      setResolveForm((prev) => (prev ? { ...prev, restoreDonation: e.target.checked } : prev))
                    }
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <label
                    htmlFor="restore-donation-check"
                    style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Restore listing to Active status (unhide from browse)
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-s)', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setResolveForm(null)}
                  style={{
                    padding: 'var(--space-xs) var(--space-l)',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--line-strong)',
                    background: 'transparent',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    fontSize: 'var(--step-0)',
                    fontWeight: 500,
                    minHeight: '44px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveForm.loading}
                  style={{
                    padding: 'var(--space-xs) var(--space-l)',
                    borderRadius: 'var(--radius-pill)',
                    border: 'none',
                    background: 'var(--accent)',
                    color: 'var(--accent-on)',
                    cursor: resolveForm.loading ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--step-0)',
                    fontWeight: 600,
                    opacity: resolveForm.loading ? 0.7 : 1,
                    minHeight: '44px',
                  }}
                >
                  {resolveForm.loading ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
