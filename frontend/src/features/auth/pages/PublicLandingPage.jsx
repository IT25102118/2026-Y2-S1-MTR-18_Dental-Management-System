import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';
import heroClinicImg from '../../../assets/hero-clinic.jpg';
import patientAccessImg from '../../../assets/patient-access.jpg';
import staffAccessImg from '../../../assets/staff-access.jpg';
import '../public-entry.css';

function ArrowIcon({ className = 'icon-arrow' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5.5 5.7v5.7c0 4.2 2.7 7.8 6.5 9.6 3.8-1.8 6.5-5.4 6.5-9.6V5.7L12 3Z" />
      <path d="m9.3 12 1.8 1.8 3.7-4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.6-4.1 2.8-6.2 6.5-6.2s5.9 2.1 6.5 6.2" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.8 19c.5-3.7 2.2-5.5 5.2-5.5s4.7 1.8 5.2 5.5M16 6.5a2.7 2.7 0 0 1 0 5.3M16.5 14c2.2.5 3.5 2.2 3.8 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 10 4 4 8-8" />
    </svg>
  );
}

function ToothIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 6 3 10 .8 2.2 2 4 3 4s2.2-1.8 3-4c1.5-4 3-6.5 3-10 0-3.5-2.5-6-6-6z" />
      <path d="M9 10c1-1 2-1.5 3-1.5s2 .5 3 1.5" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m10.5 20.5 8-8a4.95 4.95 0 1 0-7-7l-8 8a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m12 12 8-4.5M12 12v9M12 12 4 7.5" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3v18l3-1.5 3 1.5 3-1.5 3 1.5 4-2V3l-4 2-3-2-3 2-3-2-3 2Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 8.8-8.8M16 7l2.5 2.5M18.5 4.5 21 7" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 7.5L10 12.5L15 7.5" />
    </svg>
  );
}

const faqItems = [
  {
    id: 'faq-1',
    question: 'Who can register directly on DentCare?',
    answer: 'Patients can register directly online using our Patient Registration form. Staff accounts (Dentist, Dental Assistant, Receptionist, and Administrator) are provisioned exclusively by system administrators to maintain clinical security.'
  },
  {
    id: 'faq-2',
    question: 'Why does DentCare provide separate Patient and Staff logins?',
    answer: 'To enforce strict role boundaries from the moment of entry. Patients access a dedicated personal portal with their self-registered account, while clinic staff sign into a protected operational workspace. The server strictly verifies the account role upon login and prevents cross-portal access.'
  },
  {
    id: 'faq-3',
    question: 'What happens if a user signs into the wrong portal?',
    answer: 'The system evaluates the account role upon verification. If a staff member enters credentials at the Patient Login or a patient enters credentials at the Staff Login, the session is safely invalidated and a clear message guides the user to the correct portal.'
  },
  {
    id: 'faq-4',
    question: 'Can patients view clinical records or other accounts?',
    answer: 'No. Clinical charting, inventory supply levels, and practice financial records are strictly protected. Patients only have access to their personal profile and dedicated patient portal.'
  }
];

export default function PublicLandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    if (isLoading) return;

    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      document.querySelectorAll('.scroll-reveal').forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px 40px 0px' }
    );

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="auth-loading-container" role="status" aria-live="polite" data-testid="landing-loading">
        <div className="auth-spinner" aria-hidden="true" />
        <p>Preparing DentCare...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return (
    <main className="public-home" data-testid="public-landing-page">
      {/* 1. Hero Section */}
      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="hero-ambient-glow" aria-hidden="true" />
        <div className="hero-decor-canvas" aria-hidden="true">
          <svg className="hero-decor-svg" viewBox="0 0 1200 480" fill="none" preserveAspectRatio="none">
            <path d="M0,100 Q320,30 640,90 T1200,50" stroke="rgba(15,118,110,0.07)" strokeWidth="1.5" />
            <path d="M0,240 Q460,150 820,200 T1200,140" stroke="rgba(13,148,136,0.05)" strokeWidth="1.5" />
            <circle cx="460" cy="150" r="3.5" fill="rgba(15,118,110,0.2)" />
            <circle cx="820" cy="200" r="3.5" fill="rgba(13,148,136,0.2)" />
          </svg>
        </div>

        <div className="public-container public-hero-grid">
          <div className="public-hero-copy">
            <div className="public-intro-badge hero-animate-eyebrow">
              <span className="badge-sparkle" aria-hidden="true">✦</span>
              <span>Modern Dental Care, Connected</span>
            </div>
            <h1 id="public-hero-title" className="hero-animate-title">
              Better dental care starts with a better experience. <span className="hero-gradient-text">A clear, secure way to access dental care.</span>
            </h1>
            <p className="public-hero-lead hero-animate-lead">
              DentCare connects patients with their personal care information and provides authorized clinic staff with a protected workspace for clinical and practice operations.
            </p>
            <div className="public-actions hero-animate-actions" aria-label="Account access actions">
              <Link
                to="/patient/login"
                className="public-button public-button-primary"
                data-testid="landing-patient-login-cta"
                id="hero-patient-login-cta"
              >
                <UserIcon /> <span>Patient Login</span> <ArrowIcon />
              </Link>
              <Link
                to="/staff/login"
                className="public-button public-button-secondary public-button-staff"
                data-testid="landing-staff-login-cta"
                id="hero-staff-login-cta"
              >
                <ShieldIcon /> <span>Staff Login</span>
              </Link>
            </div>
            <div className="hero-subactions hero-animate-subactions">
              <Link to="/register" className="hero-register-link" data-testid="landing-register-cta">
                <span>Patient Registration</span> <ArrowIcon />
              </Link>
              <span className="hero-subactions-divider" aria-hidden="true">·</span>
              <p className="public-staff-note">Staff accounts are provisioned exclusively by clinic administrators.</p>
            </div>
          </div>

          <div className="hero-visual-wrapper hero-animate-card" aria-label="Modern dental operatory">
            <div className="hero-visual-card">
              <img
                src={heroClinicImg}
                alt="Modern dental clinic treatment operatory with clinical chair and soft natural light"
                className="hero-visual-img"
                width="960"
                height="720"
              />
              <div className="hero-visual-overlay" aria-hidden="true" />
              <div className="hero-accent-badge">
                <span className="hero-accent-dot" aria-hidden="true" />
                <div className="hero-accent-text">
                  <strong>DentCare Operatory</strong>
                  <span>Clinical Excellence &amp; Care Coordination</span>
                </div>
              </div>
            </div>
            <div className="hero-visual-glow" aria-hidden="true" />
            <div className="hero-visual-frame-accent" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* 2. Real Product Capabilities */}
      <section className="public-capabilities scroll-reveal" aria-labelledby="public-capabilities-title">
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">Practice Operations</p>
              <h2 id="public-capabilities-title">Integrated tools built for dental practices</h2>
            </div>
            <p>From initial examinations and anatomical tooth charting to medication orders, inventory supply tracking, and patient billing, DentCare supports daily clinic operations within a unified platform.</p>
          </div>

          <div className="public-capabilities-grid">
            <article className="capability-card">
              <div className="capability-card-icon"><ToothIcon /></div>
              <div className="capability-card-body">
                <span className="capability-tag">Clinical Care</span>
                <h3>Examinations, Tooth Charting &amp; Treatment Plans</h3>
                <p>Record comprehensive evaluations with anatomical tooth-level condition tracking, chief complaints, and staged procedure progress.</p>
              </div>
            </article>

            <article className="capability-card">
              <div className="capability-card-icon"><PillIcon /></div>
              <div className="capability-card-body">
                <span className="capability-tag">Medications</span>
                <h3>Prescription Authoring</h3>
                <p>Author structured medication orders specifying dosage forms, frequencies, durations, and clinical instructions.</p>
              </div>
            </article>

            <article className="capability-card">
              <div className="capability-card-icon"><PackageIcon /></div>
              <div className="capability-card-body">
                <span className="capability-tag">Supply Chain</span>
                <h3>Inventory &amp; Batch Tracking</h3>
                <p>Maintain clinic operational readiness through real-time stock item tracking, batch expiration monitoring, and low-stock alerts.</p>
              </div>
            </article>

            <article className="capability-card">
              <div className="capability-card-icon"><ReceiptIcon /></div>
              <div className="capability-card-body">
                <span className="capability-tag">Financials</span>
                <h3>Invoices &amp; Payment Receipts</h3>
                <p>Generate itemized invoices for completed procedures, record payments immediately, and issue official patient receipts.</p>
              </div>
            </article>

            <article className="capability-card">
              <div className="capability-card-icon"><ClipboardIcon /></div>
              <div className="capability-card-body">
                <span className="capability-tag">Care Pathways</span>
                <h3>Care Coordination &amp; History</h3>
                <p>Track longitudinal patient care notes, treatment progressions, and verified health summaries across appointments.</p>
              </div>
            </article>

            <article className="capability-card">
              <div className="capability-card-icon"><LockIcon /></div>
              <div className="capability-card-body">
                <span className="capability-tag">Security</span>
                <h3>Role-Isolated Workspaces</h3>
                <p>Ensure clinicians, assistants, front-desk staff, and patients only access workflows appropriate to their verified role.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 3. Login Choice / Access Area */}
      <section className="public-access scroll-reveal" id="access-portals" aria-labelledby="public-access-title">
        <div className="public-access-bg-ambient" aria-hidden="true" />
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">Account Portals</p>
              <h2 id="public-access-title">Choose your access portal</h2>
            </div>
            <p>DentCare provides two clearly separated login pathways. Select your portal to access your designated workspace.</p>
          </div>

          <div className="public-access-grid">
            <article className="access-role-card access-card-patient" data-testid="access-card-patient">
              <div className="access-role-header">
                <span className="access-role-icon"><UserIcon /></span>
                <div>
                  <span className="access-role-kicker">Patient Portal</span>
                  <h3>Patient Login</h3>
                </div>
              </div>
              <p className="access-role-desc">
                Access your personal dental profile, confirmed appointments, and verified care history in a secure patient portal.
              </p>

              <div className="access-panel-media">
                <img
                  src={patientAccessImg}
                  alt="Dentist consulting with a patient in a modern dental clinic"
                  className="access-panel-img"
                  loading="lazy"
                  width="1200"
                  height="896"
                />
                <div className="access-panel-media-overlay" aria-hidden="true" />
              </div>

              <ul className="access-perks" aria-label="Patient access features">
                <li><CheckIcon /><span>Self-service online registration with immediate account activation</span></li>
                <li><CheckIcon /><span>Direct access to personal dental care summaries and history</span></li>
                <li><CheckIcon /><span>Verified email and password credential protection</span></li>
              </ul>

              <div className="access-card-actions">
                <Link to="/patient/login" className="access-card-btn access-card-btn-patient" data-testid="portal-card-patient-login">
                  <span>Patient Login</span>
                  <ArrowIcon />
                </Link>
                <div className="access-subaction-wrap">
                  <span className="access-subaction-label">New to DentCare?</span>
                  <Link to="/register" className="access-card-sublink" data-testid="portal-card-patient-register">
                    <span>Create a patient account</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>

            <article className="access-role-card access-card-staff" data-testid="access-card-staff">
              <div className="access-role-header">
                <span className="access-role-icon"><TeamIcon /></span>
                <div>
                  <span className="access-role-kicker">Authorized Clinic Staff</span>
                  <h3>Staff Login</h3>
                </div>
              </div>
              <p className="access-role-desc">
                Protected clinical and administrative workspace for dentists, dental assistants, receptionists, and practice administrators.
              </p>

              <div className="access-panel-media">
                <img
                  src={staffAccessImg}
                  alt="Dental clinic clinical team reviewing patient care information"
                  className="access-panel-img"
                  loading="lazy"
                  width="1200"
                  height="896"
                />
                <div className="access-panel-media-overlay" aria-hidden="true" />
              </div>

              <ul className="access-perks" aria-label="Staff access features">
                <li><CheckIcon /><span>Clinical examinations, anatomical tooth charting &amp; treatment plans</span></li>
                <li><CheckIcon /><span>Structured medication orders, dosages &amp; prescription management</span></li>
                <li><CheckIcon /><span>Supply catalog, batch monitoring &amp; automated stock alerts</span></li>
              </ul>

              <div className="access-card-actions">
                <Link to="/staff/login" className="access-card-btn access-card-btn-staff" data-testid="portal-card-staff-login">
                  <span>Staff Login</span>
                  <ArrowIcon />
                </Link>
                <div className="access-card-note">
                  <ShieldIcon />
                  <span>Staff accounts are provisioned exclusively by clinic administrators</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 4. Trust & Privacy Architecture */}
      <section className="public-security scroll-reveal" aria-labelledby="public-security-title">
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">Account Privacy &amp; Segregation</p>
              <h2 id="public-security-title">Access designed around verified roles</h2>
            </div>
            <p>Your portal only shows information appropriate to your account and role. DentCare implements defense-in-depth protections to ensure public access, patient records, and operational clinic workspaces remain strictly isolated.</p>
          </div>

          <div className="public-security-grid">
            <div className="security-pillar">
              <div className="security-icon-wrap"><ShieldIcon /></div>
              <h3>Separate Access Boundaries</h3>
              <p>Patients and staff sign into distinct portals with independent authentication pathways. Cross-portal access is strictly prevented at login.</p>
            </div>

            <div className="security-pillar">
              <div className="security-icon-wrap"><LockIcon /></div>
              <h3>Protected Workspaces</h3>
              <p>Patient accounts cannot view operational clinic data, including clinical charts, supply inventory, or practice financials.</p>
            </div>

            <div className="security-pillar">
              <div className="security-icon-wrap"><KeyIcon /></div>
              <h3>Server-Enforced Validation</h3>
              <p>Role authorities and sessions are verified on every request with Spring Security, backed by secure cookies and CSRF protections.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Getting Started Workflow */}
      <section className="public-process scroll-reveal" aria-labelledby="public-process-title">
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
                <strong>Choose your portal</strong>
                <p>Select Patient Login to access your personal profile or Staff Login for authorized clinical and administrative operations.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Enter your credentials</strong>
                <p>Sign in with the verified email address and password associated with your account through the designated portal entry.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Access your workspace</strong>
                <p>DentCare strictly verifies your account role and grants immediate access to your designated workspace.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* 6. Purposeful FAQ Section */}
      <section className="public-faq scroll-reveal" aria-labelledby="public-faq-title">
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">Clarifications</p>
              <h2 id="public-faq-title">Frequently asked questions</h2>
            </div>
            <p>Answers to common questions about account registration, role permissions, and how DentCare works.</p>
          </div>

          <div className="public-faq-grid">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.id}>
                  <h3>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${item.id}`}
                      id={`faq-btn-${item.id}`}
                    >
                      <span className="faq-question-text">{item.question}</span>
                      <span className="faq-chevron" aria-hidden="true">
                        <ChevronIcon />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-answer-${item.id}`}
                    className="faq-answer-collapse"
                    role="region"
                    aria-labelledby={`faq-btn-${item.id}`}
                  >
                    <div className="faq-answer-content">
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Final Action Area */}
      <section className="public-cta scroll-reveal" aria-labelledby="public-cta-title">
        <div className="public-container public-cta-inner">
          <div className="public-cta-copy">
            <h2 id="public-cta-title">Ready to access DentCare?</h2>
            <p>Access your designated portal or register as a new patient to get started.</p>
          </div>
          <div className="public-cta-actions">
            <div className="public-cta-group">
              <span className="public-cta-group-label">Patients</span>
              <div className="public-cta-btn-row">
                <Link to="/patient/login" className="public-button public-button-primary">
                  <UserIcon /> <span>Access your dental care</span> <ArrowIcon />
                </Link>
                <Link to="/register" className="public-cta-sublink">
                  <span>Register as a new patient</span>
                </Link>
              </div>
            </div>
            <div className="public-cta-group">
              <span className="public-cta-group-label">Clinic Staff</span>
              <div className="public-cta-btn-row">
                <Link to="/staff/login" className="public-button public-button-secondary public-button-staff">
                  <ShieldIcon /> <span>Open staff workspace</span> <ArrowIcon />
                </Link>
              </div>
            </div>
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
            <Link to="/patient/login">Patient Login</Link>
            <Link to="/staff/login">Staff Login</Link>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Patient Registration</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
