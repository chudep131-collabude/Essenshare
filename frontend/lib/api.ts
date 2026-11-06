/**
 * lib/api.ts
 * Typed HTTP client for the EssenShare backend.
 *
 * Backend envelope: { success: boolean, message: string, data: T | null, timestamp, requestId }
 * Service errors:   { success: false, message, code, data: null, ... }
 *
 * Token strategy:
 *  - Access token: kept in module-level memory only (never localStorage/cookie)
 *  - On 401: attempt silent refresh via /auth/refresh, retry original request once
 *  - Refresh token: stored as httpOnly cookie by the backend never touched here
 */

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1');

/** Milliseconds before a request is aborted. */
const REQUEST_TIMEOUT_MS = 10_000;

// ── In-memory access token ────────────────────────────────────────────────────

/** Access token held in module memory never in localStorage or a cookie. */
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** The standard response envelope returned by every backend endpoint. */
export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
  requestId: string;
  code?: string;
}

export class ApiException extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.status = status;
  }
}

// ── Core fetch ────────────────────────────────────────────────────────────────

/**
 * Build an AbortSignal that fires after REQUEST_TIMEOUT_MS.
 * Falls back to manual AbortController for broader browser compatibility.
 */
function makeTimeoutSignal(): { signal: AbortSignal; clear: () => void } {
  if (typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), clear: () => {} };
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}

/**
 * Low-level fetch wrapper. Does not attempt token refresh.
 * Throws ApiException on non-2xx responses.
 */
async function rawFetch<T>(
  path: string,
  options: RequestInit,
  accessToken: string | null
): Promise<ApiEnvelope<T>> {
  const url = `${API_BASE}${path}`;
  const { signal, clear } = makeTimeoutSignal();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include', // send httpOnly refresh_token cookie automatically
      signal: options.signal ?? signal,
      headers,
    });

    const body: ApiEnvelope<T> = await res.json().catch(() => ({
      success: false,
      message: 'Invalid response from server.',
      data: null,
      timestamp: new Date().toISOString(),
      requestId: '',
      code: 'PARSE_ERROR',
    }));

    if (!res.ok) {
      throw new ApiException(
        body.code ?? 'UNKNOWN_ERROR',
        body.message ?? 'An unexpected error occurred.',
        res.status
      );
    }

    return body;
  } finally {
    clear();
  }
}

// ── Silent token refresh ──────────────────────────────────────────────────────

let _refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt a silent token refresh using the httpOnly refresh_token cookie.
 * Multiple concurrent 401s collapse into a single refresh request.
 * Returns the new access token, or null if refresh failed.
 */
async function silentRefresh(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const envelope = await rawFetch<{ accessToken: string }>(
        '/auth/refresh',
        { method: 'POST' },
        null // don't send expired access token on refresh call
      );
      const token = envelope.data?.accessToken ?? null;
      setAccessToken(token);
      return token;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ── Public API fetch ──────────────────────────────────────────────────────────

/**
 * Fetch a backend endpoint with automatic token injection and 401 retry.
 *
 * Usage:
 *   const envelope = await apiFetch<MyData>('/some/path', { method: 'POST', body: ... });
 *   // envelope.data is typed as MyData | null
 *
 * Throws ApiException on persistent errors.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  try {
    return await rawFetch<T>(path, options, _accessToken);
  } catch (err) {
    if (err instanceof ApiException && err.status === 401) {
      // Don't retry the refresh endpoint itself that would loop infinitely
      if (path === '/auth/refresh') throw err;

      const newToken = await silentRefresh();
      if (!newToken) throw err; // refresh failed caller must redirect to login

      // Retry original request once with the new token
      return rawFetch<T>(path, options, newToken);
    }
    throw err;
  }
}

/**
 * Convenience helper: POST with a JSON body.
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Convenience helper: PATCH with a JSON body.
 */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Convenience helper: DELETE request.
 */
export async function apiDelete<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  return apiFetch<T>(path, {
    method: 'DELETE',
    ...options,
  });
}
