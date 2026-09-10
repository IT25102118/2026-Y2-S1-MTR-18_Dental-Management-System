import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '../api/authApi';

const AuthContext = createContext(null);

/**
 * Authentication Provider component coordinating session state, startup hydration,
 * login, and logout lifecycle across DentCare.
 *
 * Employs a generation-counter ref (authOperationIdRef) to guarantee that stale
 * async hydration requests cannot overwrite state established by newer login, logout,
 * or retry operations.
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

  const authOperationIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hydrateSession = useCallback(async () => {
    const operationId = ++authOperationIdRef.current;
    setStatus('loading');
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      if (!isMountedRef.current || operationId !== authOperationIdRef.current) {
        return;
      }

      if (currentUser) {
        setUser(currentUser);
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus('unauthenticated');
      }
    } catch (err) {
      if (!isMountedRef.current || operationId !== authOperationIdRef.current) {
        return;
      }
      setUser(null);
      setError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const retryHydration = useCallback(() => {
    return hydrateSession();
  }, [hydrateSession]);

  const login = useCallback(async (credentials) => {
    const loggedInUser = await apiLogin(credentials);
    // Only after successful server authentication: advance generation
    // to invalidate any prior in-flight hydration requests.
    ++authOperationIdRef.current;

    if (isMountedRef.current) {
      setUser(loggedInUser);
      setStatus('authenticated');
      setError(null);
    }
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
      // Only after confirmed successful/unauthenticated result: advance generation
      // to invalidate any prior in-flight hydration requests.
      ++authOperationIdRef.current;

      if (isMountedRef.current) {
        setUser(null);
        setStatus('unauthenticated');
        setError(null);
      }
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
      }
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
