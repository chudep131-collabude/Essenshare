'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, apiPost, ApiException } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';
import AdminTable, { Column } from '@/components/admin/AdminTable';

interface AdminDonation {
  id: string;
  title: string;
  category: string;
  status: string;
  donor_name?: string;
  created_at: string;
}

interface DonationsResponse {
  rows: AdminDonation[];
  total: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'HIDDEN', label: 'Hidden' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

const COLUMNS: Column[] = [
  { key: 'title', label: 'Title', width: '25%' },
  { key: 'category', label: 'Category', width: '15%' },
  { key: 'status', label: 'Status', width: '12%' },
  { key: 'donor_name', label: 'Donor', width: '18%' },
  { key: 'created_at', label: 'Created', width: '14%' },
  { key: 'actions', label: 'Actions', width: '16%' },
];

function DonationStatusChip({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: 'var(--success-bg)', color: 'var(--success)' },
    HIDDEN:    { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    COMPLETED: { bg: 'var(--info-bg)',    color: 'var(--info)' },
    CANCELLED: { bg: 'var(--error-bg)',   color: 'var(--error)' },
    EXPIRED:   { bg: 'var(--error-bg)',   color: 'var(--error)' },
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

export default function AdminDonationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<AdminDonation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'ADMIN') router.push('/');
  }, [user, loading, router]);

  const fetchDonations = useCallback(async () => {
    setFetchLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (statusFilter) params.set('status', statusFilter);

      const envelope = await apiFetch<DonationsResponse>(`/admin/donations?${params.toString()}`);
      setRows(envelope.data?.rows ?? []);
      setTotal(envelope.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Failed to load donations.');
    } finally {
      setFetchLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (!loading && user && user.role === 'ADMIN') {
      fetchDonations();
    }
  }, [loading, user, fetchDonations]);

  const handleHide = async (donationId: string) => {
    if (!window.confirm('Hide this donation?')) return;
    setActionLoadingId(donationId);
    try {
      await apiPost(`/admin/donations/${donationId}/hide`, { reason: 'Admin review' });
      await fetchDonations();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : 'Failed to hide donation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReinstate = async (donationId: string) => {
    if (!window.confirm('Reinstate this donation?')) return;
    setActionLoadingId(donationId);
    try {
      await apiPost(`/admin/donations/${donationId}/reinstate`, {});
      await fetchDonations();
    } catch (err) {
      alert(err instanceof ApiException ? err.message : 'Failed to reinstate donation.');
    } finally {
      setActionLoadingId(null);
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

  const tableRows: Record<string, unknown>[] = rows.map((d) => ({
    title: d.title,
    category: d.category,
    status: d.status,
    donor_name: d.donor_name ?? '—',
    created_at: d.created_at,
    actions: d,
  }));

  function renderCell(key: string, value: unknown, _row: Record<string, unknown>): React.ReactNode {
    if (key === 'status') return <DonationStatusChip status={value as string} />;
    if (key === 'created_at') {
      return (
        <span style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {new Date(value as string).toLocaleDateString()}
        </span>
      );
    }
    if (key === 'actions') {
      const d = value as AdminDonation;
      const isLoading = actionLoadingId === d.id;
      return (
        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
          {d.status === 'ACTIVE' && (
            <button
              onClick={() => handleHide(d.id)}
              disabled={isLoading}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid color-mix(in oklch, var(--warning) 40%, transparent)',
                background: 'var(--warning-bg)',
                color: 'var(--warning)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--step--1)',
                fontWeight: 500,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? '…' : 'Hide'}
            </button>
          )}
          {d.status === 'HIDDEN' && (
            <button
              onClick={() => handleReinstate(d.id)}
              disabled={isLoading}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid color-mix(in oklch, var(--success) 40%, transparent)',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 'var(--step--1)',
                fontWeight: 500,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? '…' : 'Reinstate'}
            </button>
          )}
        </div>
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
        Donations
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
          {total.toLocaleString()} donation{total !== 1 ? 's' : ''}
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
    </div>
  );
}
