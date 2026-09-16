import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../entry.css';

export default function PatientDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const firstName = user?.firstName || 'Patient';

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('We could not sign you out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="role-dashboard" data-testid="patient-dashboard">
      <section className="role-dashboard-hero role-dashboard-hero-patient">
        <div>
          <p className="entry-eyebrow">Patient dashboard</p>
          <h1>Welcome, {firstName}.</h1>
          <p>Your DentCare patient account is ready. Use this space to manage your account securely.</p>
        </div>
        <span className="role-dashboard-badge">PATIENT</span>
      </section>

      {location.state?.accessDenied && (
        <div className="dashboard-notice" role="alert">
          That page is reserved for authorized clinic staff. You have been returned to your patient dashboard.
        </div>
      )}

      {logoutError && <div className="error-alert" role="alert">{logoutError}</div>}

      <section className="role-dashboard-grid" aria-label="Patient account actions">
        <article className="role-action-card">
          <span className="role-card-kicker">Account</span>
          <h2>Your profile</h2>
          <p>Review the name, email address, phone number, and account role held on your profile.</p>
          <Link to="/account" className="role-card-link">View my account <span aria-hidden="true">→</span></Link>
        </article>

        <article className="role-action-card role-action-card-muted">
          <span className="role-card-kicker">Privacy first</span>
          <h2>Patient-safe access</h2>
          <p>
            Clinical and practice-management tools are not exposed here until secure patient-owned
            record access is available.
          </p>
        </article>
      </section>

      <div className="role-dashboard-footer">
        <button type="button" className="btn btn-secondary" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
        </button>
      </div>
    </main>
  );
}
