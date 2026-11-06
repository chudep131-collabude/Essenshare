'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiException } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';
import AdminTable, { Column } from '@/components/admin/AdminTable';
import Badge from '@/components/ui/Badge';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: string;
  full_name: string | null;
  created_at: string;
  donation_count?: number;
  report_count?: number;
}

interface UsersResponse {
  rows: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'INDIVIDUAL_DONOR', label: 'Individual Donor' },
  { value: 'BUSINESS_DONOR', label: 'Business Donor' },
  { value: 'ORGANIZATION', label: 'Organisation' },
  { value: 'ADMIN', label: 'Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DELETED', label: 'Deleted' },
  { value: 'PENDING', label: 'Pending' },
];

const COLUMNS: Column[] = [
  { key: 'name_email', label: 'Name / Email', width: '25%' },
  { key: 'role', label: 'Role', width: '15%' },
  { key: 'status', label: 'Status', width: '12%' },
  { key: 'created_at', label: 'Joined', width: '15%' },
  { key: 'actions', label: 'Actions', width: '18%' },
];

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case 'ADMIN':
      return <Badge variant="primary">Admin</Badge>;
    case 'INDIVIDUAL_DONOR':
      return <Badge variant="default">Individual</Badge>;
    case 'BUSINESS_DONOR':
      return <Badge variant="default">Business</Badge>;
    case 'ORGANIZATION':
      return <Badge variant="default">Organisation</Badge>;
    default:
      return <Badge variant="default">{role}</Badge>;
  }
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: 'var(--success-bg)', color: 'var(--success)' },
    SUSPENDED: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    DELETED:   { bg: 'var(--error-bg)',   color: 'var(--error)' },
    PENDING:   { bg: 'var(--info-bg)',    color: 'var(--info)' },
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

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const LIMIT = 20;

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'ADMIN') router.push('/');
  }, [user, loading, router]);

  const fetchUsers = useCallback(async () => {
    setFetchLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);

      const envelope = await apiFetch<UsersResponse>(`/admin/users?${params.toString()}`);
      setRows(envelope.data?.rows ?? []);
      setTotal(envelope.data?.total ?? 0);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to load users.');
      }
    } finally {
      setFetchLoading(false);
    }
  }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    if (!loading && user && user.role === 'ADMIN') {
      fetchUsers();
    }
  }, [loading, user, fetchUsers]);

  const handleSuspend = async (userId: string) => {
    if (!window.confirm('Suspend this user?')) return;
    setSuspendingId(userId);
    setActionError(null);
    try {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SUSPENDED', reason: 'Admin action' }),
      });
      await fetchUsers();
    } catch (err) {
      setActionError(err instanceof ApiException ? err.message : 'Failed to suspend user.');
    } finally {
      setSuspendingId(null);
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

  const tableRows: Record<string, unknown>[] = rows.map((u) => ({
    name_email: u,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
    actions: u,
    _raw: u,
  }));

  function renderCell(key: string, value: unknown, row: Record<string, unknown>): React.ReactNode {
    if (key === 'name_email') {
      const u = value as AdminUser;
      return (
        <div>
          <p style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: '2px' }}>
            {u.full_name ?? '—'}
          </p>
          <p style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)' }}>{u.email}</p>
        </div>
      );
    }
    if (key === 'role') return <RoleBadge role={value as string} />;
    if (key === 'status') return <StatusChip status={value as string} />;
    if (key === 'created_at') {
      return (
        <span style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {new Date(value as string).toLocaleDateString()}
        </span>
      );
    }
    if (key === 'actions') {
      const u = (row as Record<string, unknown>)._raw as AdminUser;
      return (
        <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
          {u.status !== 'SUSPENDED' && u.status !== 'DELETED' && (
            <button
              onClick={() => handleSuspend(u.id)}
              disabled={suspendingId === u.id}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid color-mix(in oklch, var(--warning) 40%, transparent)',
                background: 'var(--warning-bg)',
                color: 'var(--warning)',
                cursor: 'pointer',
                fontSize: 'var(--step--1)',
                fontWeight: 500,
              }}
            >
              {suspendingId === u.id ? 'Suspending…' : 'Suspend'}
            </button>
          )}
          <Link
            href={`/admin/users/${u.id}`}
            style={{
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--line-strong)',
              background: 'transparent',
              color: 'var(--ink)',
              fontSize: 'var(--step--1)',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            View
          </Link>
        </div>
      );
    }
    return String(value ?? '');
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
        Users
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
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          style={selectStyle}
          aria-label="Filter by role"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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
          {total.toLocaleString()} user{total !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-l)' }}>
          <Alert type="error">{error}</Alert>
        </div>
      )}
      {actionError && (
        <div style={{ marginBottom: 'var(--space-l)' }}>
          <Alert type="error">{actionError}</Alert>
        </div>
      )}

      {fetchLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <AdminTable
          columns={COLUMNS}
          rows={tableRows}
          renderCell={renderCell}
        />
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
          <span
            style={{
              fontSize: 'var(--step-0)',
              color: 'var(--ink-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
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
