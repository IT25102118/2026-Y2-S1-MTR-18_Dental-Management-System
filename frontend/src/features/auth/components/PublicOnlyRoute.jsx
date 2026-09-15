import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';

export default function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-container" role="status" aria-live="polite" data-testid="auth-entry-loading">
        <div className="auth-spinner" aria-hidden="true"></div>
        <p>Checking your session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return children;
}
