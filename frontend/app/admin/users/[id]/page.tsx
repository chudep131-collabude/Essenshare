'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiException } from '@/lib/api';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminUserDetail {
  id: string;
  email: string;
  role: string;
  status: string;
  full_name: string | null;
  phone: string | null;
  country_code: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  donation_count: number;
  report_count: number;
}

const STATUS_OPTIONS = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: 'var(--success-bg)', color: 'var(--success)' },
    SUSPENDED: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    DELETED:   { bg: 'var(--error-bg)',   color: 'var(--error)' },
    PENDING:   { bg: 'var(--info-bg)',    color: 'var(--info)' },
    PENDING_APPROVAL: { bg: 'var(--info-bg)', color: 'var(--info)' },
  };
  const s = styles[status] ?? { bg: 'var(--surface-soft)', color: 'var(--ink-muted)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--step--1)', fontWeight: 600, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 'var(--space-m)', padding: 'var(--space-m) 0', borderBottom: '1px solid var(--line-subtle)' }}>
      <span style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: '2px' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--step-0)', color: 'var(--ink)' }}>
        {value ?? <span style={{ color: 'var(--ink-quiet)' }}>—</span>}
      </span>
    </div>
  );
}

function StatTile({ label, value, colour }: { label: string; value: number; colour?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 'var(--space-l) var(--space-xl)' }}>
      <p style={{ fontSize: 'var(--step--1)', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: 'var(--space-xs)' }}>
        {label}
      </p>
      <p style={{ fontSize: 'var(--step-3)', fontWeight: 700, color: colour ?? 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = typeof params.id === 'string' ? params.id : '';

  const [profile, setProfile] = useState<AdminUserDetail | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Status update form
  const [newStatus, setNewStatus] = useState<StatusOption>('ACTIVE');
  const [reason, setReason] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [showBanConfirm, setShowBanConfirm] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && user.role !== 'ADMIN') router.push('/');
  }, [user, authLoading, router]);

  // Fetch profile
  useEffect(() => {
    if (!userId || authLoading || !user || user.role !== 'ADMIN') return;
    (async () => {
      setFetchLoading(true);
      setFetchError(null);
      try {
        const envelope = await apiFetch<AdminUserDetail>(`/admin/users/${userId}`);
        if (envelope.data) {
          setProfile(envelope.data);
          // Pre-select current status (never pre-select BANNED/DELETED)
          const cur = envelope.data.status;
          if (cur === 'ACTIVE' || cur === 'SUSPENDED') setNewStatus(cur);
        }
      } catch (err) {
        setFetchError(err instanceof ApiException ? err.message : 'Failed to load user.');
      } finally {
        setFetchLoading(false);
      }
    })();
  }, [userId, authLoading, user]);

  async function handleStatusUpdate() {
    if (!reason.trim()) {
      setUpdateError('Please provide a reason.');
      return;
    }
    if (newStatus === 'BANNED' && !showBanConfirm) {
      setShowBanConfirm(true);
      return;
    }
    setShowBanConfirm(false);
    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    try {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason: reason.trim() }),
      });
      setUpdateSuccess(`Status updated to ${newStatus}.`);
      setReason('');
      // Refresh profile
      const envelope = await apiFetch<AdminUserDetail>(`/admin/users/${userId}`);
      if (envelope.data) setProfile(envelope.data);
    } catch (err) {
      setUpdateError(err instanceof ApiException ? err.message : 'Failed to update status.');
    } finally {
      setUpdateLoading(false);
    }
  }

  if (authLoading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fetchLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div>
        <Link href="/admin/users" style={{ fontSize: 'var(--step--1)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', textDecoration: 'none', marginBottom: 'var(--space-l)' }}>
          ← Back to users
        </Link>
        <Alert type="error">{fetchError ?? 'User not found.'}</Alert>
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    INDIVIDUAL_DONOR: 'Individual Donor',
    BUSINESS_DONOR: 'Business Donor',
    ORGANIZATION: 'Organisation',
    ADMIN: 'Admin',
  };

  return (
    <div>
      {/* Back link */}
      <Link href="/admin/users" style={{ fontSize: 'var(--step--1)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', textDecoration: 'none', marginBottom: 'var(--space-xl)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to users
      </Link>

      {/* Page heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-l)', flexWrap: 'wrap', marginBottom: 'var(--space-2xl)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden="true">
          <span style={{ fontSize: 'var(--step-1)', fontWeight: 700, color: 'var(--accent)' }}>
            {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--step-2)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: '4px' }}>
            {profile.full_name ?? profile.email}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
            <Badge variant={profile.role === 'ADMIN' ? 'primary' : 'default'}>
              {roleLabel[profile.role] ?? profile.role}
            </Badge>
            <StatusChip status={profile.status} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-m)', marginBottom: 'var(--space-2xl)' }}>
        <StatTile label="Donations" value={profile.donation_count} />
        <StatTile label="Reports received" value={profile.report_count} colour={profile.report_count > 0 ? 'var(--warning)' : 'var(--accent)'} />
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-2xl)', alignItems: 'start' }} className="grid-cols-1 lg:grid-cols-2">

        {/* Profile details */}
        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" style={{ fontSize: 'var(--step-1)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 'var(--space-m)' }}>
            Profile
          </h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 'var(--space-l) var(--space-xl)' }}>
            <ProfileRow label="Full name" value={profile.full_name} />
            <ProfileRow label="Email" value={profile.email} />
            <ProfileRow label="Phone" value={profile.phone} />
            <ProfileRow label="Country" value={profile.country_code} />
            <ProfileRow label="Email verified" value={
              <span style={{ color: profile.email_verified ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                {profile.email_verified ? 'Verified' : 'Not verified'}
              </span>
            } />
            <ProfileRow label="Joined" value={new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
            <ProfileRow label="Last updated" value={new Date(profile.updated_at).toLocaleDateString()} />
            <ProfileRow label="User ID" value={
              <span style={{ fontFamily: 'monospace', fontSize: 'var(--step--1)', color: 'var(--ink-muted)' }}>
                {profile.id}
              </span>
            } />
          </div>
        </section>

        {/* Status update */}
        <section aria-labelledby="status-heading">
          <h2 id="status-heading" style={{ fontSize: 'var(--step-1)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 'var(--space-m)' }}>
            Update Status
          </h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 'var(--space-xl)' }}>

            {updateSuccess && (
              <Alert type="success" className="mb-4">
                {updateSuccess}
              </Alert>
            )}
            {updateError && (
              <Alert type="error" className="mb-4">
                {updateError}
              </Alert>
            )}

            <div style={{ marginBottom: 'var(--space-l)' }}>
              <label htmlFor="new-status" style={{ display: 'block', fontSize: 'var(--step--1)', fontWeight: 500, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-xs)' }}>
                New status
              </label>
              <select
                id="new-status"
                value={newStatus}
                onChange={(e) => { setNewStatus(e.target.value as StatusOption); setShowBanConfirm(false); }}
                style={{ width: '100%', padding: 'var(--space-s) var(--space-m)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 'var(--step-0)' }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 'var(--space-l)' }}>
              <label htmlFor="status-reason" style={{ display: 'block', fontSize: 'var(--step--1)', fontWeight: 500, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-xs)' }}>
                Reason <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <textarea
                id="status-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for status change…"
                style={{ width: '100%', padding: 'var(--space-s) var(--space-m)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 'var(--step-0)', resize: 'vertical' }}
              />
            </div>

            {/* Ban confirmation */}
            {showBanConfirm && (
              <Alert type="error" className="mb-4">
                <strong>Permanent action.</strong> Banning this user soft-deletes their account and hides all their donations. This cannot be undone from the UI. Click &quot;Confirm ban&quot; to proceed.
              </Alert>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-s)' }}>
              {showBanConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={updateLoading}
                    style={{ flex: 1, padding: 'var(--space-s) var(--space-m)', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--error)', color: '#fff', fontWeight: 600, fontSize: 'var(--step-0)', cursor: updateLoading ? 'not-allowed' : 'pointer', opacity: updateLoading ? 0.7 : 1, minHeight: '44px' }}
                  >
                    {updateLoading ? 'Banning…' : 'Confirm ban'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBanConfirm(false)}
                    style={{ padding: 'var(--space-s) var(--space-m)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 500, fontSize: 'var(--step-0)', cursor: 'pointer', minHeight: '44px' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={updateLoading || !reason.trim()}
                  style={{ padding: 'var(--space-s) var(--space-xl)', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 600, fontSize: 'var(--step-0)', cursor: (updateLoading || !reason.trim()) ? 'not-allowed' : 'pointer', opacity: (updateLoading || !reason.trim()) ? 0.5 : 1, minHeight: '44px', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
                >
                  {updateLoading && <LoadingSpinner size="sm" label="Updating" />}
                  {updateLoading ? 'Updating…' : 'Update status'}
                </button>
              )}
            </div>

            <p style={{ marginTop: 'var(--space-m)', fontSize: 'var(--step--1)', color: 'var(--ink-quiet)' }}>
              Status changes are logged in the audit trail.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
