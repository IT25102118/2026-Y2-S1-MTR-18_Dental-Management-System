import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';
import '../entry.css';

export default function PublicLandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-loading-container" role="status" aria-live="polite" data-testid="landing-loading">
        <div className="auth-spinner" aria-hidden="true"></div>
        <p>Preparing DentCare...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return (
    <main className="entry-page" data-testid="public-landing-page">
      <section className="entry-hero" aria-labelledby="entry-title">
        <div className="entry-hero-copy">
          <p className="entry-eyebrow">Dental Practice Management System</p>
          <h1 id="entry-title">Care begins with a clear, secure connection.</h1>
          <p className="entry-lead">
            DentCare gives patients a simple account entry point and gives authorized clinic teams
            a protected workspace for day-to-day care delivery.
          </p>
          <div className="entry-actions" aria-label="Account actions">
            <Link to="/login" className="btn btn-primary entry-primary-action">Sign In</Link>
            <Link to="/register" className="btn btn-secondary entry-secondary-action">Patient Registration</Link>
          </div>
        </div>

        <aside className="entry-assurance" aria-label="DentCare access information">
          <div className="entry-assurance-mark" aria-hidden="true">DC</div>
          <p className="entry-assurance-label">DentCare access</p>
          <h2>One front door. The right workspace for every role.</h2>
          <ul>
            <li>Patients enter a dedicated patient space.</li>
            <li>Clinic teams enter a role-aware staff workspace.</li>
            <li>Private tools stay behind authenticated access.</li>
          </ul>
        </aside>
      </section>

      <section className="entry-guidance" aria-label="Getting started">
        <article>
          <span className="entry-step">01</span>
          <h2>Already have an account?</h2>
          <p>Sign in with the email address and password associated with your DentCare account.</p>
        </article>
        <article>
          <span className="entry-step">02</span>
          <h2>New patient?</h2>
          <p>Create a patient account, then sign in immediately from the registration confirmation.</p>
        </article>
      </section>
    </main>
  );
}
