import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';

/**
 * Route guard component protecting authenticated routes.
 * Handles loading, error with retry, and unauthenticated redirects with full URI preservation.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, isLoading, isError, error, retryHydration } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-container" data-testid="auth-loading">
        <div className="auth-spinner" aria-label="Loading session"></div>
        <p>Loading session...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="auth-error-container" data-testid="auth-error-state">
        <div className="auth-error-card">
          <h2>Connection Error</h2>
          <p>
            {error?.message || 'Unable to communicate with the authentication service.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={retryHydration}
            data-testid="auth-retry-button"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const destination = location.pathname + location.search + location.hash;
    return <Navigate to="/login" state={{ from: destination }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      return (
        <Navigate
          to={getDashboardPath(user?.role)}
          state={{ accessDenied: true }}
          replace
        />
      );
    }
  }

  return children ? children : <Outlet />;
}
