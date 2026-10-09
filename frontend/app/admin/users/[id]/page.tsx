'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiException } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';

interface AdminUserDetail {
  id: string;
  email: string;
  role: string;
  status: string;
  full_name: string | null;
  created_at: string;
  donation_count?: number;
  report_count?: number;
}

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case 'ADMIN': return <Badge variant="primary">Admin</Badge>;
    case 'INDIVIDUAL_DONOR': return <Badge variant="default">Individual</Badge>;
    case 'BUSINESS_DONOR': return <Badge variant="default">Business</Badge>;
    case 'ORGANIZATION': return <Badge variant="default">Organisation</Badge>;
    default: return <Badge variant="default">{role}</Badge>;
  }
}

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: 'var(--success-bg)', color: 'var(--success)' },
    SUSPENDED: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    DELETED:   { bg: 'var(--error-bg)',   color: 'var(--error)' },
    PENDING:   { bg: 'var(--info-bg)',    color: 'var(--info)' },
    BANNED:    { bg: 'var(--error-bg)',   color: 'var(--error)' },
  };
  const s = styles[status] ?? { bg: 'var(--surface-soft)', color: 'var(--ink-muted)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
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

export default function AdminUserDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [userData, setUserData] = useState<AdminUserDetail | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'ADMIN') router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && user.role === 'ADMIN' && userId) {
      (async () => {
        setFetchLoading(true);
        setFetchError(null);
        try {
          const envelope = await apiFetch<AdminUserDetail>(`/admin/users/${userId}`);
          setUserData(envelope.data);
          if (envelope.data) setNewStatus(envelope.data.status);
        } catch (err) {
          setFetchError(err instanceof ApiException ? err.message : 'Failed to load user.');
        } finally {
          setFetchLoading(false);
        }
      })();
    }
  }, [loading, user, userId]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setUpdateError('Reason is required.');
      return;
    }
    if (newStatus === 'BANNED') {
      const confirmed = window.confirm(
        `Are you sure you want to BAN this user? This action will mark them as permanently removed.`
      );
      if (!confirmed) return;
    }
    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason: reason.trim() }),
      });
      setUpdateSuccess(`Status updated to ${newStatus} successfully.`);
      setUserData((prev) => prev ? { ...prev, status: newStatus } : prev);
      setReason('');
    } catch (err) {
      setUpdateError(err instanceof ApiException ? err.message : 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <Link
          href="/admin/users"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 'var(--step-0)', display: 'inline-block', marginBottom: 'var(--space-l)' }}
        >
          ← Back to Users
        </Link>
        <Alert type="error">{fetchError}</Alert>
      </div>
    );
  }

  if (!userData) return null;

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--step--1)',
    fontWeight: 600,
    color: 'var(--ink-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 'var(--space-2xs)',
    display: 'block',
  };

  const fieldStyle: React.CSSProperties = {
    fontSize: 'var(--step-0)',
    color: 'var(--ink)',
    fontWeight: 500,
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <Link
        href="/admin/users"
        style={{
          color: 'var(--accent)',
          textDecoration: 'none',
          fontSize: 'var(--step-0)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2xs)',
          marginBottom: 'var(--space-l)',
        }}
      >
        ← Back to Users
      </Link>

      <h1
        style={{
          fontSize: 'var(--step-3)',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBlockEnd: 'var(--space-xl)',
          letterSpacing: '-0.02em',
        }}
      >
        User Detail
      </h1>

      {/* Profile card */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-l)',
          }}
        >
          <div>
            <span style={labelStyle}>Full Name</span>
            <span style={fieldStyle}>{userData.full_name ?? '—'}</span>
          </div>
          <div>
            <span style={labelStyle}>Email</span>
            <span style={fieldStyle}>{userData.email}</span>
          </div>
          <div>
            <span style={labelStyle}>Role</span>
            <div style={{ marginTop: 'var(--space-2xs)' }}>
              <RoleBadge role={userData.role} />
            </div>
          </div>
          <div>
            <span style={labelStyle}>Status</span>
            <div style={{ marginTop: 'var(--space-2xs)' }}>
              <StatusChip status={userData.status} />
            </div>
          </div>
          <div>
            <span style={labelStyle}>Joined</span>
            <span style={{ ...fieldStyle, fontVariantNumeric: 'tabular-nums' }}>
              {new Date(userData.created_at).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          </div>
          <div>
            <span style={labelStyle}>User ID</span>
            <span style={{ ...fieldStyle, fontSize: 'var(--step--1)', fontFamily: 'monospace', color: 'var(--ink-muted)' }}>
              {userData.id}
            </span>
          </div>
          {userData.donation_count !== undefined && (
            <div>
              <span style={labelStyle}>Donations</span>
              <span style={{ ...fieldStyle, fontVariantNumeric: 'tabular-nums' }}>
                {userData.donation_count}
              </span>
            </div>
          )}
          {userData.report_count !== undefined && (
            <div>
              <span style={labelStyle}>Reports</span>
              <span style={{ ...fieldStyle, fontVariantNumeric: 'tabular-nums' }}>
                {userData.report_count}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions panel */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-sm)',
          padding: 'var(--space-xl)',
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
          Update Status
        </h2>

        {updateSuccess && (
          <div style={{ marginBottom: 'var(--space-m)' }}>
            <Alert type="success">{updateSuccess}</Alert>
          </div>
        )}
        {updateError && (
          <div style={{ marginBottom: 'var(--space-m)' }}>
            <Alert type="error">{updateError}</Alert>
          </div>
        )}

        <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
          <div>
            <label
              htmlFor="status-select"
              style={{ ...labelStyle, marginBottom: 'var(--space-xs)' }}
            >
              New Status
            </label>
            <select
              id="status-select"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-xs) var(--space-s)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line-strong)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 'var(--step-0)',
              }}
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="reason-textarea"
              style={{ ...labelStyle, marginBottom: 'var(--space-xs)' }}
            >
              Reason <span aria-label="required" style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              id="reason-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Explain the reason for this status change…"
              aria-required="true"
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

          <div>
            <button
              type="submit"
              disabled={updating}
              style={{
                padding: 'var(--space-xs) var(--space-xl)',
                borderRadius: 'var(--radius-pill)',
                border: 'none',
                background: 'var(--accent)',
                color: 'var(--accent-on)',
                fontSize: 'var(--step-0)',
                fontWeight: 600,
                cursor: updating ? 'not-allowed' : 'pointer',
                opacity: updating ? 0.7 : 1,
                minHeight: '44px',
              }}
            >
              {updating ? 'Updating…' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
