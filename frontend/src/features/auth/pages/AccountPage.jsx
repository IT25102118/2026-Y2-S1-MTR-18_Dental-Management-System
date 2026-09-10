import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../auth.css';

/**
 * DentCare Authenticated Account Page.
 * Displays safe profile details (name, email, phone, role) and provides a secure logout control.
 */
export default function AccountPage() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setIsLoggingOut(false);
      if (err?.status === 403) {
        setLogoutError('Logout failed: Security validation error. Please try again.');
      } else if (err?.status === 0) {
        setLogoutError('Logout failed: Network connection error. Please try again.');
      } else {
        setLogoutError('Logout failed. Please try again later.');
      }
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'DentCare User';

  return (
    <div className="auth-container account-container">
      <div className="auth-card account-card">
        <div className="account-header">
          <Link to="/" className="auth-back-link">
            &larr; Back to Home
          </Link>
          <div className="account-title-group">
            <h1>My Account</h1>
            <p className="auth-subtitle">Authenticated DentCare Profile</p>
          </div>
        </div>

        {logoutError && (
          <div
            className="error-alert"
            role="alert"
            aria-live="polite"
            data-testid="logout-error-alert"
          >
            {logoutError}
          </div>
        )}

        <div className="account-details" data-testid="account-details">
          <div className="account-field">
            <span className="account-field-label">Name</span>
            <span className="account-field-value" data-testid="account-user-name">
              {fullName}
            </span>
          </div>

          <div className="account-field">
            <span className="account-field-label">Email Address</span>
            <span className="account-field-value" data-testid="account-user-email">
              {user?.email || '—'}
            </span>
          </div>

          <div className="account-field">
            <span className="account-field-label">Phone Number</span>
            <span className="account-field-value" data-testid="account-user-phone">
              {user?.phone || 'Not provided'}
            </span>
          </div>

          <div className="account-field">
            <span className="account-field-label">Assigned Role</span>
            <span
              className="account-field-value role-badge"
              data-testid="account-role-badge"
            >
              {user?.role || '—'}
            </span>
          </div>
        </div>

        <div className="account-actions">
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleLogout}
            disabled={isLoggingOut}
            data-testid="logout-button"
          >
            {isLoggingOut ? 'Logging Out...' : 'Log Out'}
          </button>
        </div>

        <div className="account-footer-links">
          <Link to="/inventory" className="auth-link">
            Go to Inventory Management &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
