'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiException } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';

interface DashboardData {
  total_users: number;
  active_donors: number;
  total_donations: number;
  pending_reports: number;
  total_pickups: number;
  recent_registrations_24h: number;
}

const STAT_TILES = [
  { key: 'total_users' as const, label: 'Total Users' },
  { key: 'active_donors' as const, label: 'Active Donors' },
  { key: 'total_donations' as const, label: 'Total Donations' },
  { key: 'pending_reports' as const, label: 'Pending Reports' },
  { key: 'total_pickups' as const, label: 'Total Pickups' },
  { key: 'recent_registrations_24h' as const, label: 'New (24h)' },
];

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'ADMIN') router.push('/');
  }, [user, loading, router]);

  const fetchData = async () => {
    setFetchLoading(true);
    setError(null);
    try {
      const envelope = await apiFetch<DashboardData>('/admin/dashboard');
      setData(envelope.data);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard data.');
      }
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user && user.role === 'ADMIN') {
      fetchData();
    }
  }, [loading, user]);

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--step-3)',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBlockEnd: 'var(--space-xl)',
          letterSpacing: '-0.02em',
        }}
      >
        Admin Dashboard
      </h1>

      {error && (
        <div style={{ marginBottom: 'var(--space-l)' }}>
          <Alert type="error">
            {error}{' '}
            <button
              onClick={fetchData}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--error)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 'inherit',
                padding: 0,
              }}
            >
              Retry
            </button>
          </Alert>
        </div>
      )}

      {fetchLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-m)]"
          aria-busy="true"
          aria-label="Loading dashboard statistics"
        >
          {STAT_TILES.map((tile) => (
            <div
              key={tile.key}
              className="skeleton"
              style={{
                borderRadius: 'var(--radius-md)',
                height: '112px',
              }}
              aria-hidden="true"
            />
          ))}
        </div>
      ) : data ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-m)]"
        >
          {STAT_TILES.map((tile) => {
            const value = data[tile.key];
            const isWarning = tile.key === 'pending_reports' && value > 0;
            return (
              <div
                key={tile.key}
                style={{
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: 'var(--space-l)',
                  border: '1px solid var(--line)',
                }}
              >
                <p
                  style={{
                    fontSize: 'var(--step--1)',
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  {tile.label}
                </p>
                <p
                  style={{
                    fontSize: 'var(--step-4)',
                    fontWeight: 700,
                    color: isWarning ? 'var(--warning)' : 'var(--accent)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1,
                  }}
                >
                  {value.toLocaleString()}
                </p>
              </div>
            );
          })}
          <style>{`
            @media (max-width: 767px) {
              .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}
