import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';
import '../public-entry.css';

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" /></svg>;
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5.5 5.7v5.7c0 4.2 2.7 7.8 6.5 9.6 3.8-1.8 6.5-5.4 6.5-9.6V5.7L12 3Z" /><path d="m9.3 12 1.8 1.8 3.7-4" /></svg>;
}

function UserIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.6-4.1 2.8-6.2 6.5-6.2s5.9 2.1 6.5 6.2" /></svg>;
}

function TeamIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3.8 19c.5-3.7 2.2-5.5 5.2-5.5s4.7 1.8 5.2 5.5M16 6.5a2.7 2.7 0 0 1 0 5.3M16.5 14c2.2.5 3.5 2.2 3.8 5" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PillIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10.5 20.5 8-8a4.95 4.95 0 1 0-7-7l-8 8a4.95 4.95 0 1 0 7 7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="m8.5 8.5 7 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function PackageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ReceiptIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3v18l3-1.5 3 1.5 3-1.5 3 1.5 4-2V3l-4 2-3-2-3 2-3-2-3 2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function KeyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7.5" cy="15.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="m10.7 12.3 8.8-8.8M16 7l2.5 2.5M18.5 4.5 21 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function PublicLandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="auth-loading-container" role="status" aria-live="polite" data-testid="landing-loading"><div className="auth-spinner" aria-hidden="true" /><p>Preparing DentCare...</p></div>;
  }

  if (isAuthenticated) return <Navigate to={getDashboardPath(user?.role)} replace />;

  return (
    <main className="public-home" data-testid="public-landing-page">
      {/* 1. Hero Section */}
      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-container public-hero-grid">
          <div className="public-hero-copy">
            <p className="public-intro">Dental Management System</p>
            <h1 id="public-hero-title">A clear, secure way to access dental care.</h1>
            <p className="public-hero-lead">DentCare connects patients with their account and gives authorized clinic staff a protected workspace for managing care.</p>
            <div className="public-actions" aria-label="Account actions">
              <Link to="/login" className="public-button public-button-primary">Sign In <ArrowIcon /></Link>
              <Link to="/register" className="public-button public-button-secondary">Patient Registration</Link>
            </div>
            <p className="public-staff-note">Clinic staff sign in using their existing account.</p>
          </div>

          <div className="access-map" aria-label="Account access routes">
            <div className="access-map-header">
              <span className="access-map-tag">System Access Architecture</span>
              <ShieldIcon />
            </div>

            <div className="access-map-signin">
              <span className="access-map-icon"><ShieldIcon /></span>
              <div>
                <strong>Unified sign in</strong>
                <span>Verified email and password</span>
              </div>
            </div>

            <div className="access-map-tree" aria-hidden="true">
              <div className="access-map-stem" />
              <div className="access-map-branches" />
            </div>

            <div className="access-map-destinations">
              <div className="access-map-dest-card">
                <div className="access-map-dest-header">
                  <span className="access-map-icon"><UserIcon /></span>
                  <span className="access-map-role-badge">Patients</span>
                </div>
                <strong>Patient Workspace</strong>
                <p>Self-registration, profile management, and dedicated patient portal access.</p>
              </div>

              <div className="access-map-dest-card">
                <div className="access-map-dest-header">
                  <span className="access-map-icon"><TeamIcon /></span>
                  <span className="access-map-role-badge">Clinic Staff</span>
                </div>
                <strong>Staff Workspace</strong>
                <p>Clinical charting, prescriptions, stock inventory, and invoice operations.</p>
              </div>
            </div>

            <div className="access-map-footer">
              <span className="access-map-dot" aria-hidden="true" />
              <p>Routing and permissions are strictly enforced on the server by account role.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Real Product Capabilities */}
      <section className="public-capabilities" aria-labelledby="public-capabilities-title">
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">Practice Operations</p>
              <h2 id="public-capabilities-title">Integrated tools built for dental practices</h2>
            </div>
            <p>From initial dental charting to inventory supply control and patient billing, DentCare supports day-to-day clinic operations within a unified platform.</p>
          </div>

          <div className="public-capabilities-layout">
            <article className="capability-spotlight">
              <div className="capability-spotlight-content">
                <span className="capability-tag">Clinical Care</span>
                <h3>Examinations, Tooth Charting &amp; Treatment Plans</h3>
                <p>DentCare structures clinical workflows from initial patient assessment through multi-stage care delivery. Clinicians document oral health evaluations, record anatomical tooth-level findings, and assemble clear treatment plans with procedure notes and estimated fees.</p>
                <ul className="capability-feature-list" aria-label="Clinical care capabilities">
                  <li><CheckIcon /><span>Comprehensive examination records with medical history and chief complaints</span></li>
                  <li><CheckIcon /><span>Anatomical tooth charting with specific condition tracking and findings</span></li>
                  <li><CheckIcon /><span>Staged treatment plans with procedure tracking and status progression</span></li>
                </ul>
              </div>
              <div className="capability-spotlight-meta">
                <div className="capability-meta-item">
                  <span className="capability-meta-label">Authorized Roles</span>
                  <strong>Dentist &amp; Dental Assistant</strong>
                </div>
                <div className="capability-meta-item">
                  <span className="capability-meta-label">Clinical Scope</span>
                  <strong>Examinations · Findings · Plans</strong>
                </div>
              </div>
            </article>

            <div className="capability-secondary-grid">
              <article className="capability-card">
                <div className="capability-card-icon"><PillIcon /></div>
                <div className="capability-card-body">
                  <span className="capability-tag">Medication</span>
                  <h3>Prescription Authoring</h3>
                  <p>Dentists author structured medication orders with specific dosage forms, frequencies, durations, and clinical instructions tied directly to patient care.</p>
                </div>
              </article>

              <article className="capability-card">
                <div className="capability-card-icon"><PackageIcon /></div>
                <div className="capability-card-body">
                  <span className="capability-tag">Supply Chain</span>
                  <h3>Inventory &amp; Batch Tracking</h3>
                  <p>Maintain clinic operational readiness through real-time stock item cataloging, batch expiration date monitoring, and automated low-stock reorder thresholds.</p>
                </div>
              </article>

              <article className="capability-card">
                <div className="capability-card-icon"><ReceiptIcon /></div>
                <div className="capability-card-body">
                  <span className="capability-tag">Financials</span>
                  <h3>Invoices &amp; Payment Receipts</h3>
                  <p>Generate itemized patient invoices for completed procedures, record payments immediately, issue official receipts, and track practice revenue trends.</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Patient vs Staff Experience */}
      <section className="public-access" aria-labelledby="public-access-title">
        <div className="public-container">
          <div className="public-section-heading">
            <h2 id="public-access-title">The right access for every account</h2>
            <p>DentCare keeps the public journey simple while authenticated operations remain strictly segregated by assigned role.</p>
          </div>
          <div className="public-access-grid">
            <article className="access-role-card">
              <div className="access-role-header">
                <span className="access-role-icon"><UserIcon /></span>
                <div>
                  <span className="access-role-kicker">Patient Track</span>
                  <h3>For patients</h3>
                </div>
              </div>
              <p>Register as a new patient in minutes or sign in to manage your account details through a private, dedicated portal.</p>
              <ul className="access-perks" aria-label="Patient access features">
                <li><CheckIcon /><span>Fast self-registration with immediate account activation</span></li>
                <li><CheckIcon /><span>Secure sign in with email and password credentials</span></li>
                <li><CheckIcon /><span>Personal account profile and contact details management</span></li>
              </ul>
              <Link to="/register" className="access-link">Register as a patient <ArrowIcon /></Link>
            </article>

            <article className="access-role-card">
              <div className="access-role-header">
                <span className="access-role-icon"><TeamIcon /></span>
                <div>
                  <span className="access-role-kicker">Staff Track</span>
                  <h3>For clinic staff</h3>
                </div>
              </div>
              <p>Authorized dental team members use the unified sign-in to enter role-configured operational dashboards.</p>
              <ul className="access-perks" aria-label="Staff access features">
                <li><CheckIcon /><span>Accounts managed and provisioned by clinic administrators</span></li>
                <li><CheckIcon /><span>Role-specific access for Dentists, Assistants, and Receptionists</span></li>
                <li><CheckIcon /><span>Direct entry to clinical charts, stock inventory, and billing</span></li>
              </ul>
              <Link to="/login" className="access-link">Staff sign in <ArrowIcon /></Link>
            </article>
          </div>
        </div>
      </section>

      {/* 4. Security & Trust Architecture */}
      <section className="public-security" aria-labelledby="public-security-title">
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">Security &amp; Architecture</p>
              <h2 id="public-security-title">Access designed around verified roles</h2>
            </div>
            <p>DentCare implements defense-in-depth protections to ensure public access, patient accounts, and clinic operations remain strictly isolated.</p>
          </div>

          <div className="public-security-grid">
            <div className="security-pillar">
              <div className="security-icon-wrap"><ShieldIcon /></div>
              <h3>Server-Enforced Authorization</h3>
              <p>All sensitive operations and data endpoints are protected server-side with Spring Security. Role authorities are validated on every HTTP request.</p>
            </div>

            <div className="security-pillar">
              <div className="security-icon-wrap"><LockIcon /></div>
              <h3>Separated Workspaces</h3>
              <p>Patient accounts cannot view or interact with operational clinic data, including clinical charts, supply inventory, or practice financials.</p>
            </div>

            <div className="security-pillar">
              <div className="security-icon-wrap"><KeyIcon /></div>
              <h3>Protected Sessions &amp; CSRF</h3>
              <p>State-changing requests require valid cryptographic CSRF tokens, paired with secure session cookie controls to prevent unauthorized access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Getting Started Workflow */}
      <section className="public-process" aria-labelledby="public-process-title">
        <div className="public-container public-process-grid">
          <div>
            <p className="public-intro">Clear Workflow</p>
            <h2 id="public-process-title">Getting started is straightforward</h2>
            <p>Choose the path that matches your role, and DentCare directs you to the appropriate workspace.</p>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Create or use your account</strong>
                <p>New patients can register directly online in minutes. Clinic staff accounts are provisioned by an administrator with their assigned operational role.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Enter your credentials</strong>
                <p>Sign in with the verified email address and password associated with your account through our unified authentication portal.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Continue to your workspace</strong>
                <p>DentCare automatically evaluates your account role and directs you to either the patient portal or the staff operational workspace.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* 6. Purposeful FAQ Section */}
      <section className="public-faq" aria-labelledby="public-faq-title">
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">Clarifications</p>
              <h2 id="public-faq-title">Frequently asked questions</h2>
            </div>
            <p>Answers to common questions about account registration, role permissions, and how DentCare works.</p>
          </div>

          <div className="public-faq-grid">
            <div className="faq-item">
              <h3>Who can register directly on DentCare?</h3>
              <p>Patients can register directly online using our Patient Registration form. Staff accounts (Dentist, Dental Assistant, Receptionist, and Administrator) are provisioned exclusively by system administrators to maintain clinical security.</p>
            </div>

            <div className="faq-item">
              <h3>Do patients and clinic staff sign in at the same place?</h3>
              <p>Yes. All users access DentCare through the single Sign In page. Upon verification, the server checks the account's assigned role and automatically routes the user to their designated workspace.</p>
            </div>

            <div className="faq-item">
              <h3>What operational tools can clinic staff access?</h3>
              <p>Depending on their assigned role, authorized staff members have access to Clinical Examinations and Treatment Plans, Medication Prescriptions, Supply Inventory and Batch Alerts, and Patient Invoicing.</p>
            </div>

            <div className="faq-item">
              <h3>Can patients view clinical records or other accounts?</h3>
              <p>No. Clinical charting, inventory supply levels, and practice financial records are strictly protected. Patients only have access to their personal profile and dedicated patient portal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Closing CTA */}
      <section className="public-cta" aria-labelledby="public-cta-title">
        <div className="public-container public-cta-inner">
          <div>
            <h2 id="public-cta-title">Ready to access DentCare?</h2>
            <p>Sign in to an existing account or register as a new patient to get started.</p>
          </div>
          <div className="public-actions">
            <Link to="/login" className="public-button public-button-primary">Sign In <ArrowIcon /></Link>
            <Link to="/register" className="public-button public-button-secondary">Patient Registration</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="public-footer">
        <div className="public-container">
          <div className="public-footer-brand-wrap">
            <span className="public-footer-brand">DentCare</span>
            <span className="public-footer-desc">Dental Management System</span>
          </div>
          <p className="public-footer-copy">&copy; 2026 DentCare. Secure Dental Management.</p>
          <nav aria-label="Footer navigation">
            <Link to="/">Home</Link>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Patient Registration</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
