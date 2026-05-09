'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

interface User { id: string; email: string; role: string; name: string; }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient<User>('/api/auth/me').then(u => { setUser(u); }).catch(() => setUser(null)).finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiClient<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await apiClient('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  return { user, login, logout, isLoading };
}
