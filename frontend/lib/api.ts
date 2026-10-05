const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

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
  const res = await fetch(url, {
    ...options,
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
}
