import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard component protecting authenticated routes.
 * Handles loading, error with retry, and unauthenticated redirects with full URI preservation.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, isError, error, retryHydration, user } = useAuth();
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

  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="auth-error-container" data-testid="auth-forbidden-state">
        <div className="auth-error-card">
          <h2>Access Denied</h2>
          <p>You do not have the required permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
