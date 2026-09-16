import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { BILLING_ROLES, isStaffRole } from '../features/auth/roleAccess';

/**
 * DentCare Authenticated Application Shell Header.
 * Provides consistent top navigation, brand identity, authenticated user info,
 * role badge, responsive navigation, and direct logout action.
 */
export default function AppHeader() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'DentCare User';
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const isPatient = user?.role === 'PATIENT';
  const isStaff = isStaffRole(user?.role);
  const canUseBilling = BILLING_ROLES.includes(user?.role);

  return (
    <header className={`app-header ${!isLoading && !isAuthenticated ? 'app-header-public' : ''}`}>
      <div className="app-header-inner">
        <div className="app-header-brand">
          <Link to="/" className="brand-logo-link" aria-label="DentCare Home">
            <span className="brand-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 6 3 10 .8 2.2 2 4 3 4s2.2-1.8 3-4c1.5-4 3-6.5 3-10 0-3.5-2.5-6-6-6z" />
                <path d="M9 10c1-1 2-1.5 3-1.5s2 .5 3 1.5" />
              </svg>
            </span>
            <span className="brand-name">DentCare</span>
          </Link>
        </div>

        <button
          type="button"
          className="mobile-nav-toggle"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <nav className={`app-header-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {isAuthenticated && isPatient ? (
            <>
              <NavLink
                to="/patient/dashboard"
                end
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Patient Dashboard
              </NavLink>
              <NavLink
                to="/account"
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                My Account
              </NavLink>
            </>
          ) : isAuthenticated && isStaff ? (
            <>
              <NavLink
                to="/staff/dashboard"
                end
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Staff Dashboard
              </NavLink>
              <NavLink
                to="/inventory"
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Inventory
              </NavLink>
              <NavLink
                to="/clinical"
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Clinical
              </NavLink>
              <NavLink
                to="/prescriptions"
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Prescriptions
              </NavLink>
              {canUseBilling && (
                <NavLink
                  to="/billing/invoices"
                  className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Billing
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/admin/staff"
                  className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Staff Management
                </NavLink>
              )}
              <NavLink
                to="/account"
                className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Account
              </NavLink>
            </>
          ) : (
            <NavLink
              to="/"
              end
              className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </NavLink>
          )}
        </nav>

        <div className="app-header-user">
          {isLoading ? (
            <span className="app-session-status" role="status">Checking session...</span>
          ) : isAuthenticated ? (
            <div className="user-profile-widget" data-testid="user-header-widget">
              <Link to="/account" className="user-profile-link" title="View Account Profile">
                <span className="user-display-name">{fullName}</span>
                <span className={`user-role-badge badge-role-${user?.role?.toLowerCase() || 'default'}`}>
                  {user?.role}
                </span>
              </Link>
              <button
                type="button"
                className="btn-header-logout"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Sign out"
                data-testid="header-logout-button"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <div className="auth-action-buttons">
              <Link to="/login" className="btn btn-sm btn-outline-primary" data-testid="header-login-link">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-sm btn-primary" data-testid="header-register-link">
                <span className="header-register-label-full">Patient Registration</span>
                <span className="header-register-label-short">Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
