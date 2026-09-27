import React from 'react';
import { Link } from 'react-router-dom';
import '../public.css';

/**
 * DentCare Public Landing Page.
 * Rendered at `/` for unauthenticated visitors.
 * Provides a clear practice introduction, service capabilities overview,
 * and direct calls-to-action for Patient Registration and Account Sign In.
 */
export default function LandingPage() {
  return (
    <main className="public-landing" data-testid="public-landing-page">
      {/* 1. Hero Section */}
      <header className="landing-hero">
        <div className="landing-container">
          <div className="hero-badge">
            <span aria-hidden="true">✦</span> Dental Practice Management System
          </div>
          <h1 className="hero-title">
            Modern Dental Care &amp; <span className="hero-title-highlight">Practice Operations</span>
          </h1>
          <p className="hero-subtitle">
            A unified clinical and operational platform supporting patient registration,
            dental examinations, electronic prescriptions, billing, and supply inventory.
          </p>
          <div className="hero-actions">
            <Link
              to="/register"
              className="btn-landing-primary"
              data-testid="landing-register-cta"
            >
              Register as Patient →
            </Link>
            <Link
              to="/login"
              className="btn-landing-secondary"
              data-testid="landing-login-cta"
            >
              Sign In to Account
            </Link>
          </div>
          <div className="hero-disclaimer">
            Patients can self-register online. Staff accounts are provisioned by clinic administrators.
          </div>
        </div>
      </header>

      {/* 2. Supported Capabilities / Feature Overview Section */}
      <section className="landing-features" aria-labelledby="features-heading">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-tag">Practice Capabilities</div>
            <h2 id="features-heading" className="section-title">
              Integrated Dental Clinic Management
            </h2>
            <p className="section-description">
              DentCare coordinates clinical care, patient prescriptions, transparent billing,
              and supply logistics in one secure system.
            </p>
          </div>

          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon-wrapper icon-blue" aria-hidden="true">
                📝
              </div>
              <h3 className="feature-title">Patient Registration &amp; Account</h3>
              <p className="feature-text">
                Self-service registration for patients with secure session handling,
                profile management, and strict access controls.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper icon-teal" aria-hidden="true">
                🦷
              </div>
              <h3 className="feature-title">Clinical Examinations &amp; Plans</h3>
              <p className="feature-text">
                Detailed dental examinations, tooth condition findings, and dentist-confirmed
                treatment procedures and plans.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper icon-purple" aria-hidden="true">
                💊
              </div>
              <h3 className="feature-title">Electronic Prescriptions</h3>
              <p className="feature-text">
                Authoritative prescription creation, dosage instructions, draft-to-finalized
                lifecycle, and clean printable formats.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper icon-emerald" aria-hidden="true">
                💳
              </div>
              <h3 className="feature-title">Invoicing, Payments &amp; Receipts</h3>
              <p className="feature-text">
                Itemized invoice generation, payment recording, controlled reversals,
                printable receipts, and daily clinic income reports.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper icon-amber" aria-hidden="true">
                📦
              </div>
              <h3 className="feature-title">Inventory &amp; Supply Monitoring</h3>
              <p className="feature-text">
                Track clinic items, lot numbers, batch expiration dates, stock movement
                audit histories, and automated low-stock alerts.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 3. Dual Onboarding & Access Section */}
      <section className="landing-access-section" aria-labelledby="access-heading">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-tag">Account Access</div>
            <h2 id="access-heading" className="section-title">
              Get Started with DentCare
            </h2>
          </div>

          <div className="access-grid">
            {/* Patient Card */}
            <div className="access-card access-card-patient">
              <div>
                <span className="access-badge access-badge-patient">Patient Onboarding</span>
                <h3>New Patients</h3>
                <p>
                  Register your patient profile to begin receiving coordinated dental care,
                  examination reviews, and prescriptions.
                </p>
                <ul className="access-points">
                  <li>
                    <span className="check-bullet" aria-hidden="true">✓</span>
                    <span>Quick self-registration with verified credentials</span>
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">✓</span>
                    <span>Secure personal profile &amp; contact management</span>
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">✓</span>
                    <span>Coordinated clinical records with your practitioner</span>
                  </li>
                </ul>
              </div>
              <div className="access-card-footer">
                <Link
                  to="/register"
                  className="btn-landing-primary"
                  style={{ width: '100%' }}
                >
                  Register Patient Account
                </Link>
              </div>
            </div>

            {/* Staff Card */}
            <div className="access-card access-card-staff">
              <div>
                <span className="access-badge access-badge-staff">Clinic Staff</span>
                <h3>Practitioners &amp; Staff</h3>
                <p>
                  Secure access for clinic Administrators, Dentists, Receptionists, and Dental Assistants.
                </p>
                <ul className="access-points">
                  <li>
                    <span className="check-bullet" aria-hidden="true">✓</span>
                    <span>Role-based access to clinical, billing, and inventory tools</span>
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">✓</span>
                    <span>Authoritative audit trails for all operations</span>
                  </li>
                  <li>
                    <span className="check-bullet" aria-hidden="true">✓</span>
                    <span>Staff accounts are provisioned by clinic administrators</span>
                  </li>
                </ul>
              </div>
              <div className="access-card-footer">
                <Link
                  to="/login"
                  className="btn-landing-secondary"
                  style={{ width: '100%' }}
                >
                  Staff Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-brand-row">
            <span aria-hidden="true">🦷</span> DentCare Dental Practice Management
          </div>
          <div>Secure clinical and administrative operations.</div>
        </div>
      </footer>
    </main>
  );
}
