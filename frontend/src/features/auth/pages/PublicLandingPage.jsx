import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';
import heroClinicImg from '../../../assets/hero-clinic.jpg';
import patientAccessImg from '../../../assets/patient-access.jpg';
import staffAccessImg from '../../../assets/staff-access.jpg';
import drRobinsonImg from '../../../assets/dr_robinson.jpg';
import drTurnerImg from '../../../assets/dr_turner.jpg';
import drWilsonImg from '../../../assets/dr_wilson.jpg';
import patientChristinaImg from '../../../assets/patient_christina.jpg';
import beforeAfterTeethImg from '../../../assets/before_after_teeth.jpg';
import teethBeforeImg from '../../../assets/teeth_before.jpg';
import teethAfterImg from '../../../assets/teeth_after.jpg';
import clinicContactConfig from '../../../config/clinicContactConfig';
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

function TeethComparisonSlider() {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = React.useRef(null);
  const activePointerIdRef = React.useRef(null);

  const getClientX = (e) => {
    if (typeof e.clientX === 'number') return e.clientX;
    if (typeof e.nativeEvent?.clientX === 'number') return e.nativeEvent.clientX;
    if (e.touches && e.touches[0] && typeof e.touches[0].clientX === 'number') return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches[0] && typeof e.changedTouches[0].clientX === 'number') return e.changedTouches[0].clientX;
    return undefined;
  };

  const updatePosition = React.useCallback((clientX) => {
    if (typeof clientX !== 'number' || Number.isNaN(clientX) || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 300;
    const offsetX = clientX - (rect.left || 0);
    const clampedPercent = Math.min(100, Math.max(0, (offsetX / width) * 100));
    setSliderPosition(Number(clampedPercent.toFixed(1)));
  }, []);

  const stopDragging = React.useCallback(() => {
    setIsDragging(false);
    if (containerRef.current && activePointerIdRef.current !== null) {
      try {
        if (
          typeof containerRef.current.releasePointerCapture === 'function' &&
          containerRef.current.hasPointerCapture?.(activePointerIdRef.current)
        ) {
          containerRef.current.releasePointerCapture(activePointerIdRef.current);
        }
      } catch {
        /* Ignore pointer capture release error */
      }
      activePointerIdRef.current = null;
    }
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    setIsDragging(true);
    if (typeof e.pointerId === 'number') {
      activePointerIdRef.current = e.pointerId;
      if (typeof e.currentTarget?.setPointerCapture === 'function') {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* Fallback gracefully if pointer capture unsupported */
        }
      }
    }
    const clientX = getClientX(e);
    if (typeof clientX === 'number') {
      updatePosition(clientX);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    setIsDragging(true);
    const clientX = getClientX(e);
    if (typeof clientX === 'number') {
      updatePosition(clientX);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = getClientX(e);
    if (typeof clientX === 'number') {
      updatePosition(clientX);
    }
  };

  const handlePointerUp = () => {
    stopDragging();
  };

  const handlePointerCancel = () => {
    stopDragging();
  };

  const handleLostPointerCapture = () => {
    stopDragging();
  };

  // Global window listeners for robust drag tracking and outside release/cancel
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMove = (e) => {
      const clientX = getClientX(e);
      if (typeof clientX === 'number') {
        updatePosition(clientX);
      }
    };

    const handleGlobalEnd = () => {
      stopDragging();
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalEnd);
    window.addEventListener('pointercancel', handleGlobalEnd);
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);

    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalEnd);
      window.removeEventListener('pointercancel', handleGlobalEnd);
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
    };
  }, [isDragging, stopDragging, updatePosition]);

  // Clean up pointer capture on unmount if component unmounts mid-drag
  useEffect(() => {
    return () => {
      if (containerRef.current && activePointerIdRef.current !== null) {
        try {
          if (
            typeof containerRef.current.releasePointerCapture === 'function' &&
            containerRef.current.hasPointerCapture?.(activePointerIdRef.current)
          ) {
            containerRef.current.releasePointerCapture(activePointerIdRef.current);
          }
        } catch {
          /* Ignore */
        }
      }
    };
  }, []);

  const handleKeyDown = (e) => {
    let delta = 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      delta = -5;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      delta = 5;
    } else if (e.key === 'Home') {
      setSliderPosition(0);
      e.preventDefault();
      return;
    } else if (e.key === 'End') {
      setSliderPosition(100);
      e.preventDefault();
      return;
    } else if (e.key === 'PageDown') {
      delta = -10;
    } else if (e.key === 'PageUp') {
      delta = 10;
    }

    if (delta !== 0) {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, Math.max(0, prev + delta)));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`patient-experience-before-after teeth-comparison-slider ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onMouseDown={handleMouseDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      data-testid="teeth-comparison-slider"
      aria-label="Interactive before and after teeth comparison illustrative simulation"
    >
      {/* After image (base layer) */}
      <img
        src={teethAfterImg}
        alt="Illustrative simulation of aligned smile result"
        className="patient-experience-ba-img teeth-slider-img teeth-slider-after"
        loading="lazy"
        draggable={false}
      />

      {/* Before image (top clipped layer) */}
      <img
        src={teethBeforeImg}
        alt="Illustrative simulation of smile before treatment"
        className="patient-experience-ba-img teeth-slider-img teeth-slider-before"
        style={{
          clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
        }}
        loading="lazy"
        draggable={false}
      />

      {/* Before & After UI Badges */}
      <span className="teeth-slider-tag tag-before" aria-hidden="true">BEFORE</span>
      <span className="teeth-slider-tag tag-after" aria-hidden="true">AFTER</span>

      {/* Vertical divider line */}
      <div
        className="teeth-slider-divider"
        style={{ left: `${sliderPosition}%` }}
        aria-hidden="true"
      >
        {/* Circular drag handle */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Before and after teeth comparison illustrative simulation slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderPosition)}
          aria-valuetext={`${Math.round(sliderPosition)}% before simulation revealed`}
          onKeyDown={handleKeyDown}
          className="teeth-slider-handle"
          data-testid="teeth-slider-handle"
        >
          <svg
            className="teeth-handle-arrows"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="8 7 3 12 8 17" />
            <polyline points="16 7 21 12 16 17" />
          </svg>
        </div>
      </div>

      <span className="patient-experience-ba-label" data-testid="teeth-slider-sim-badge">ILLUSTRATIVE SIMULATION</span>
    </div>
  );
}

function MapPinIcon({ className = 'icon-pin' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon({ className = 'icon-phone' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon({ className = 'icon-mail' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function ClockIcon({ className = 'icon-clock' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CompassIcon({ className = 'icon-compass' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function IllustrativeClinicMap() {
  return (
    <div className="clinic-map-frame" data-testid="clinic-map-frame">
      {clinicContactConfig.mapDisclaimerBadge ? (
        <div className="clinic-map-disclaimer-badge" data-testid="clinic-map-demo-badge">
          {clinicContactConfig.mapDisclaimerBadge}
        </div>
      ) : null}

      <div
        className="clinic-map-visual-wrap"
        role="region"
        aria-label={clinicContactConfig.mapAriaLabel}
        data-testid="clinic-map-visual"
      >
        <iframe
          title="DentCare Dental Clinic Location Map"
          src="https://www.google.com/maps?q=6.9147,79.8540+(DentCare+Dental+Clinic)&z=15&output=embed"
          width="100%"
          height="100%"
          style={{ border: 0, minHeight: '420px', width: '100%', display: 'block' }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="clinic-map-caption" data-testid="clinic-map-caption">
        <CompassIcon className="clinic-map-caption-icon" />
        <span>{clinicContactConfig.mapCaption}</span>
      </div>
    </div>
  );
}

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

      {/* 2b. Section 1 — Clinical Team / Standards */}
      <section className="editorial-team-section scroll-reveal" aria-labelledby="editorial-team-title">
        <div className="editorial-team-container">
          <div className="editorial-team-header">
            <p className="editorial-team-eyebrow">CLINICAL TEAM</p>
            <h2 id="editorial-team-title" className="editorial-team-heading">
              Meet our dental team
            </h2>
            <p className="editorial-team-lead">
              Explore dental professionals and the types of clinical care workflows supported by the DentCare platform.
            </p>
          </div>

          <div className="editorial-team-grid">
            {/* Profile 1: Dr. Maya Lawson */}
            <article className="editorial-team-card" data-testid="demo-dentist-card-lawson">
              <div className="editorial-team-image-wrapper">
                <img
                  src={drRobinsonImg}
                  alt="Representative dental professional in a clinic"
                  className="editorial-team-image"
                  loading="lazy"
                  width="600"
                  height="720"
                />
              </div>
              <div className="editorial-team-body">
                <h3 className="editorial-card-title">Dr. Anya Sharma</h3>
                <span className="editorial-card-role">Dentist</span>

                <span className="editorial-specialty-pill pill-restorative">
                  RESTORATIVE CARE
                </span>

                <div className="editorial-card-focus">
                  <span className="editorial-focus-label">Focus: </span>
                  <span className="editorial-focus-val">Restorative &amp; Aesthetic Dentistry</span>
                </div>

                <p className="editorial-card-desc">
                  Focuses on restorative dental treatments, smile aesthetics, and clear treatment planning to support comfortable, patient-centered care.
                </p>

                <div className="editorial-card-actions">
                  <Link
                    to="/patient/appointments"
                    className="editorial-card-book-btn"
                    data-testid="book-appointment-lawson"
                  >
                    <span>Book an Appointment</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>

            {/* Profile 2: Dr. Adrian Wells */}
            <article className="editorial-team-card" data-testid="demo-dentist-card-wells">
              <div className="editorial-team-image-wrapper">
                <img
                  src={drTurnerImg}
                  alt="Representative dental professional in a clinic"
                  className="editorial-team-image"
                  loading="lazy"
                  width="600"
                  height="720"
                />
              </div>
              <div className="editorial-team-body">
                <h3 className="editorial-card-title">Dr. Sarah Chen</h3>
                <span className="editorial-card-role">Dentist</span>

                <span className="editorial-specialty-pill pill-surgery">
                  ORAL SURGERY CARE
                </span>

                <div className="editorial-card-focus">
                  <span className="editorial-focus-label">Focus: </span>
                  <span className="editorial-focus-val">Oral Surgery &amp; Dental Treatment</span>
                </div>

                <p className="editorial-card-desc">
                  Provides treatment workflows for dental extractions, surgical consultations, and coordinated patient care.
                </p>

                <div className="editorial-card-actions">
                  <Link
                    to="/patient/appointments"
                    className="editorial-card-book-btn"
                    data-testid="book-appointment-wells"
                  >
                    <span>Book an Appointment</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>

            {/* Profile 3: Dr. Elena Mercer */}
            <article className="editorial-team-card" data-testid="demo-dentist-card-mercer">
              <div className="editorial-team-image-wrapper">
                <img
                  src={drWilsonImg}
                  alt="Representative dental professional in a clinic"
                  className="editorial-team-image"
                  loading="lazy"
                  width="600"
                  height="720"
                />
              </div>
              <div className="editorial-team-body">
                <h3 className="editorial-card-title">Dr. David Chen</h3>
                <span className="editorial-card-role">Dentist</span>

                <span className="editorial-specialty-pill pill-orthodontics">
                  PREVENTIVE &amp; ORTHODONTIC CARE
                </span>

                <div className="editorial-card-focus">
                  <span className="editorial-focus-label">Focus: </span>
                  <span className="editorial-focus-val">Preventive &amp; Orthodontic Care</span>
                </div>

                <p className="editorial-card-desc">
                  Highlights preventive dentistry, oral health education, and orthodontic consultation workflows.
                </p>

                <div className="editorial-card-actions">
                  <Link
                    to="/patient/appointments"
                    className="editorial-card-book-btn"
                    data-testid="book-appointment-mercer"
                  >
                    <span>Book an Appointment</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 2c. Section 2 — Patient Experience */}
      <section className="patient-experience-section scroll-reveal" aria-labelledby="patient-experience-title">
        <div className="patient-experience-container">
          <div className="patient-experience-grid">
            <div className="patient-experience-media" aria-label="Patient experience and clinical care coordination">
              <div className="patient-experience-main-wrap">
                <img
                  src={patientChristinaImg}
                  alt="Coordinated modern dental consultation"
                  className="patient-experience-main-image"
                  loading="lazy"
                  width="800"
                  height="960"
                />
                <div className="patient-experience-overlay-badge">
                  <span className="badge-kicker">PATIENT EXPERIENCE</span>
                  <strong className="badge-title">Coordinated Dental Care</strong>
                </div>
              </div>

              <TeethComparisonSlider />
            </div>

            <div className="patient-experience-content">
              <p className="patient-experience-eyebrow">PATIENT CENTERED</p>
              <h2 id="patient-experience-title" className="patient-experience-heading">
                A calm, refined approach to modern oral care
              </h2>
              <p className="patient-experience-lead">
                DentCare brings appointments, clinical records, treatment planning, billing, and prescriptions into one coordinated digital experience.
              </p>

              <div className="patient-experience-callout">
                <p className="patient-experience-callout-text">
                  DentCare coordinates clinical care and practice workflows through one integrated system, helping patients and staff manage treatment information more clearly.
                </p>
                <span className="patient-experience-callout-caption">
                  Care Coordination &amp; Practice Workflows
                </span>
              </div>

              <ul className="patient-experience-checklist" aria-label="Patient care coordination features">
                <li>
                  <span className="checklist-icon" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <span>Structured clinical and treatment records</span>
                </li>
                <li>
                  <span className="checklist-icon" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <span>Clear billing and appointment information</span>
                </li>
                <li>
                  <span className="checklist-icon" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <span>Coordinated prescription and follow-up workflows</span>
                </li>
              </ul>
            </div>
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

      {/* 8. Clinic Location & Contact (Stage 1 of Location & SMS) */}
      <section
        className="public-location scroll-reveal"
        id="clinic-location"
        aria-labelledby="clinic-location-title"
        data-testid="public-location-section"
      >
        <div className="public-container">
          <div className="public-section-heading">
            <div>
              <p className="public-intro">{clinicContactConfig.sectionEyebrow}</p>
              <h2 id="clinic-location-title">{clinicContactConfig.sectionTitle}</h2>
            </div>
            <p>{clinicContactConfig.sectionDescription}</p>
          </div>

          <div className="public-location-grid">
            {/* Left Column: Illustrative Map */}
            <IllustrativeClinicMap />

            {/* Right Column: Clinic Information Card */}
            <div className="clinic-info-card" data-testid="clinic-info-card">
              <div className="clinic-card-header">
                {clinicContactConfig.demoBadge ? (
                  <span className="clinic-demo-badge" data-testid="clinic-demo-badge">
                    {clinicContactConfig.demoBadge}
                  </span>
                ) : null}
                <h3 className="clinic-card-title">{clinicContactConfig.name}</h3>
                <div className="clinic-card-location">
                  <MapPinIcon className="clinic-info-icon" />
                  <span>{clinicContactConfig.location}</span>
                </div>
              </div>

              <div className="clinic-details-list">
                {/* Telephone Row */}
                <div className="clinic-info-item clinic-info-phone" data-testid="clinic-info-phone">
                  <div className="clinic-info-item-icon" aria-hidden="true">
                    <PhoneIcon />
                  </div>
                  <div className="clinic-info-item-content">
                    <span className="clinic-info-label">Telephone</span>
                    <span className="clinic-info-val clinic-non-actionable" data-testid="clinic-phone-value">
                      {clinicContactConfig.phone}
                    </span>
                    <span className="clinic-info-hint">Mon–Sat 8:30 AM–6:00 PM</span>
                  </div>
                </div>

                {/* Email Row */}
                <div className="clinic-info-item clinic-info-email" data-testid="clinic-info-email">
                  <div className="clinic-info-item-icon" aria-hidden="true">
                    <MailIcon />
                  </div>
                  <div className="clinic-info-item-content">
                    <span className="clinic-info-label">Email Address</span>
                    <span className="clinic-info-val clinic-non-actionable" data-testid="clinic-email-value">
                      {clinicContactConfig.email}
                    </span>
                    <span className="clinic-info-hint">Inquiries & appointments</span>
                  </div>
                </div>

                {/* Example Opening Hours */}
                <div className="clinic-hours-block" data-testid="clinic-hours-block">
                  <div className="clinic-hours-header">
                    <div className="clinic-info-item-icon" aria-hidden="true">
                      <ClockIcon />
                    </div>
                    <div className="clinic-hours-header-text">
                      <span className="clinic-info-label">Opening Hours</span>
                      <span className="clinic-hours-note" data-testid="clinic-hours-note">
                        {clinicContactConfig.hoursNote}
                      </span>
                    </div>
                  </div>
                  <ul className="clinic-hours-list" aria-label="Clinic opening hours">
                    {clinicContactConfig.hours.map((item, idx) => (
                      <li key={idx} className="clinic-hours-row">
                        <span className="clinic-hours-days">{item.days}</span>
                        <span className="clinic-hours-time">{item.hours}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Booking CTA Button */}
              <div className="clinic-action-wrap">
                <Link
                  to={clinicContactConfig.bookingPath}
                  className="public-button public-button-primary clinic-booking-button"
                  data-testid="clinic-booking-cta"
                >
                  <span>{clinicContactConfig.bookingLabel}</span>
                  <ArrowIcon />
                </Link>
                <p className="clinic-booking-footnote">
                  Direct patient portal appointment scheduling
                </p>
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
