import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import {
  getAccessToken,
  getStoredUser,
  setAuthSession,
  clearAuthSession,
} from '../api/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(() => Boolean(getAccessToken()));

  const syncProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authApi.me();
      setUser(profile);
      setAuthSession({ user: profile });
    } catch {
      clearAuthSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncProfile();

    const handleExpired = () => {
      clearAuthSession();
      setUser(null);
    };

    window.addEventListener('arena:auth-expired', handleExpired);
    return () => window.removeEventListener('arena:auth-expired', handleExpired);
  }, [syncProfile]);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) {
        await authApi.logout();
      }
    } catch {
      // Logout local prossegue mesmo se token já expirou
    } finally {
      clearAuthSession();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      if (!user?.role) return false;
      return roles.some((r) => r.toLowerCase() === String(user.role).toLowerCase());
    },
    [user]
  );

  const value = {
    user,
    isAuthenticated: Boolean(user && getAccessToken()),
    isLoading,
    login,
    logout,
    hasRole,
    syncProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return ctx;
}

export default AuthContext;
