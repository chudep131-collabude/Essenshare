const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/** Milliseconds before an API request is aborted. */
const REQUEST_TIMEOUT_MS = 10_000;

interface ApiError {
  code: string;
  message: string;
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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  // Abort the request if it exceeds the timeout.
  // AbortSignal.timeout() is available in Node 17.3+ and modern browsers.
  // We use a manual AbortController as a fallback for broader compatibility.
  let signal: AbortSignal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (typeof AbortSignal.timeout === 'function') {
    signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  } else {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    signal = controller.signal;
  }

  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal ?? signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = (body as { error?: ApiError }).error;
      throw new ApiException(
        err?.code ?? 'UNKNOWN_ERROR',
        err?.message ?? 'An unexpected error occurred.',
        res.status
      );
    }

    return res.json() as Promise<T>;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
