import { useState, useCallback } from 'react';
import { UserSession } from '../types';
import { apiClient } from '../services/api';

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const status = await apiClient.getAuthStatus();
      if (status?.user) {
        setUser(status.user);
      }
      setError(null);
    } catch (err) {
      setError('Failed to check session');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      setError('Failed to logout');
      console.error('Logout error:', err);
    }
  }, []);

  return { user, setUser, loading, error, checkSession, logout };
}
