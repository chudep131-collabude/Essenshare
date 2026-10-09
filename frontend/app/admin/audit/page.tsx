'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiException } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  outcome: string;
  ip_address: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

interface AuditResponse {
  rows: AuditLogEntry[];
  total: number;
}

const LIMIT = 50;

export default function AdminAuditPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [allRows, setAllRows] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && user.role !== 'ADMIN') router.push('/');
  }, [user, loading, router]);

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setFetchLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(LIMIT) });
      const envelope = await apiFetch<AuditResponse>(`/admin/audit-logs?${params.toString()}`);
      const newRows = envelope.data?.rows ?? [];
      const newTotal = envelope.data?.total ?? 0;
      setAllRows((prev) => append ? [...prev, ...newRows] : newRows);
      setTotal(newTotal);
    } catch (err) {
      setError(err instanceof ApiException ? err.message : 'Failed to load audit logs.');
    } finally {
      if (append) setLoadingMore(false);
      else setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && user.role === 'ADMIN') {
      fetchPage(1, false);
    }
  }, [loading, user, fetchPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  };

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Client-side filter within loaded rows
  const filteredRows = actionFilter.trim()
    ? allRows.filter((r) => r.action.toLowerCase().includes(actionFilter.toLowerCase()))
    : allRows;

  const allLoaded = allRows.length >= total;

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
        Audit Logs
      </h1>

      {/* Filter bar */}
      <div style={{ marginBottom: 'var(--space-l)' }}>
        <input
          type="search"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="Filter by action…"
          aria-label="Filter audit logs by action"
          style={{
            padding: 'var(--space-xs) var(--space-s)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line-strong)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            fontSize: 'var(--step-0)',
            width: '100%',
            maxWidth: '360px',
          }}
        />
        {actionFilter && (
          <p style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--step--1)', color: 'var(--ink-muted)' }}>
            {filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''} for "{actionFilter}"
          </p>
        )}
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
        <>
          {/* Timeline list */}
          <ul
            aria-label="Audit log timeline"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              position: 'relative',
              paddingInlineStart: 'var(--space-xl)',
              borderInlineStart: '2px solid var(--line)',
            }}
          >
            {filteredRows.length === 0 ? (
              <li
                style={{
                  padding: 'var(--space-xl)',
                  textAlign: 'center',
                  color: 'var(--ink-muted)',
                  fontSize: 'var(--step-0)',
                }}
              >
                No audit log entries found.
              </li>
            ) : (
              filteredRows.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    position: 'relative',
                    marginBottom: 'var(--space-m)',
                    paddingBottom: 'var(--space-m)',
                  }}
                >
                  {/* Timeline dot */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      insetInlineStart: 'calc(-1 * var(--space-xl) - 3px)',
                      top: '5px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      display: 'block',
                      flexShrink: 0,
                    }}
                  />

                  {/* Entry card */}
                  <div
                    style={{
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--line)',
                      padding: 'var(--space-s) var(--space-m)',
                    }}
                  >
                    {/* Row 1: action + outcome */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-s)',
                        flexWrap: 'wrap',
                        marginBottom: 'var(--space-2xs)',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 'var(--step-0)',
                          color: 'var(--ink)',
                          fontFamily: 'monospace',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {entry.action}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: 'var(--step--1)',
                          fontWeight: 500,
                          background: entry.outcome === 'SUCCESS' ? 'var(--success-bg)' : 'var(--error-bg)',
                          color: entry.outcome === 'SUCCESS' ? 'var(--success)' : 'var(--error)',
                          flexShrink: 0,
                        }}
                      >
                        {entry.outcome}
                      </span>
                    </div>

                    {/* Row 2: resource + timestamp */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-s)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--step--1)',
                          color: 'var(--ink-muted)',
                        }}
                      >
                        {entry.resource ?? '—'}
                      </span>
                      <time
                        dateTime={entry.created_at}
                        style={{
                          fontSize: 'var(--step--1)',
                          color: 'var(--ink-quiet)',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {new Date(entry.created_at).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>

                    {/* Row 3: IP address (if present) */}
                    {entry.ip_address && (
                      <p
                        style={{
                          fontSize: 'var(--step--1)',
                          color: 'var(--ink-quiet)',
                          marginTop: 'var(--space-2xs)',
                        }}
                      >
                        IP: {entry.ip_address}
                      </p>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Load more */}
          {!allLoaded && !actionFilter && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-l)' }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  padding: 'var(--space-xs) var(--space-xl)',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--line-strong)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  fontSize: 'var(--step-0)',
                  fontWeight: 500,
                  opacity: loadingMore ? 0.6 : 1,
                  minHeight: '44px',
                }}
              >
                {loadingMore ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <LoadingSpinner size="sm" label="Loading more…" /> Loading…
                  </span>
                ) : (
                  `Load more (${total - allRows.length} remaining)`
                )}
              </button>
            </div>
          )}

          {allLoaded && allRows.length > 0 && !actionFilter && (
            <p
              style={{
                textAlign: 'center',
                marginTop: 'var(--space-l)',
                fontSize: 'var(--step--1)',
                color: 'var(--ink-quiet)',
              }}
            >
              All {total.toLocaleString()} entries loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}
