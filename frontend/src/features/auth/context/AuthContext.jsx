import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '../api/authApi';

const AuthContext = createContext(null);

/**
 * Authentication Provider component coordinating session state, startup hydration,
 * login, and logout lifecycle across DentCare.
 *
 * State model:
 * - status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
 * - user: AuthUserResponse | null
 * - error: Error | null
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const hydrateSession = useCallback(async (isMountedCheck = () => true) => {
    setStatus('loading');
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      if (!isMountedCheck()) return;

      if (currentUser) {
        setUser(currentUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (err) {
      if (!isMountedCheck()) return;
      setUser(null);
      setError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    hydrateSession(() => isMounted);

    return () => {
      isMounted = false;
    };
  }, [hydrateSession]);

  const retryHydration = useCallback(() => {
    return hydrateSession(() => true);
  }, [hydrateSession]);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await apiLogin(credentials);
    setUser(loggedInUser);
    setStatus('authenticated');
    setError(null);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
      setUser(null);
      setStatus('unauthenticated');
      setError(null);
      return true;
    } catch (err) {
      // Retain authenticated state on 403 or network failure
      setError(err);
      throw err;
    }
  }, []);

  const value = {
    status,
    user,
    error,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isError: status === 'error',
    retryHydration,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to consume the AuthContext.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
