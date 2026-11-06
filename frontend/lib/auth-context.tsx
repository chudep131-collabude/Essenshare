'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, apiPost, setAccessToken } from '@/lib/api';

interface AuthUser {
  id: string;
  role: string;
  status: string;
  display_name?: string;
  full_name?: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Silent refresh on mount to restore session from httpOnly cookie
    (async () => {
      try {
        const envelope = await apiFetch<{ user: AuthUser; accessToken: string }>('/auth/refresh', { method: 'POST' });
        if (envelope.data?.accessToken) {
          setAccessToken(envelope.data.accessToken);
          setTokenState(envelope.data.accessToken);
          setUser(envelope.data.user ?? null);
        }
      } catch {
        // Not logged in fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string): Promise<AuthUser | null> {
    const envelope = await apiPost<{ user: AuthUser; accessToken: string }>('/auth/login', {
      email,
      password,
    });
    if (envelope.data?.accessToken) {
      setAccessToken(envelope.data.accessToken);
      setTokenState(envelope.data.accessToken);
      const loggedInUser = envelope.data.user ?? null;
      setUser(loggedInUser);
      return loggedInUser;
    }
    return null;
  }

  async function logout(): Promise<void> {
    try {
      await apiPost('/auth/logout', {});
    } catch {
      // ignore clear client state regardless
    }
    setAccessToken(null);
    setTokenState(null);
    setUser(null);
    router.push('/');
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
