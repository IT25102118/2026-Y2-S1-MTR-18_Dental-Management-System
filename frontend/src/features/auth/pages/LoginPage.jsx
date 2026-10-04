import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canRoleAccessPath, getDashboardPath, isSafeInternalPath, isStaffRole } from '../roleAccess';
import staffWorkspaceImg from '../../../assets/staff-workspace.jpg';
import patientAccessImg from '../../../assets/patient-access.jpg';
import '../auth.css';
import '../public-auth.css';

function VisibilityIcon({ visible }) {
  return visible
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A9 9 0 0112 4c7 0 10 8 10 8a15 15 0 01-2.1 3.4M6.6 6.6C3.7 8.5 2 12 2 12s3 8 10 8a9.4 9.4 0 005.4-1.7" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ToothIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 6 3 10 .8 2.2 2 4 3 4s2.2-1.8 3-4c1.5-4 3-6.5 3-10 0-3.5-2.5-6-6-6z" />
      <path d="M9 10c1-1 2-1.5 3-1.5s2 .5 3 1.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg className="btn-arrow-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

export default function LoginPage({ portalType: propPortalType }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [email, setEmail] = useState(() => typeof location.state?.prefillEmail === 'string' ? location.state.prefillEmail : '');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Determine effective portal context (patient, staff, or unified)
  const portalType = (() => {
    if (propPortalType) return propPortalType;
    if (location.pathname.startsWith('/patient/login')) return 'patient';
    if (location.pathname.startsWith('/staff/login')) return 'staff';
    const params = new URLSearchParams(location.search);
    if (params.get('portal') === 'patient') return 'patient';
    if (params.get('portal') === 'staff') return 'staff';
    return 'unified';
  })();

  const isPatientPortal = portalType === 'patient';
  const isStaffPortal = portalType === 'staff';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email: trimmedEmail, password }, portalType);

      // Enforce strict portal-level authorization boundaries as secondary guard
      if (isPatientPortal && loggedInUser?.role !== 'PATIENT') {
        try { await logout(); } catch { /* ignore logout error on rejection */ }
        setErrorMessage('Unauthorized portal for this account. Staff accounts must use the Staff Login.');
        setIsSubmitting(false);
        return;
      }

      if (isStaffPortal && !isStaffRole(loggedInUser?.role)) {
        try { await logout(); } catch { /* ignore logout error on rejection */ }
        setErrorMessage('Unauthorized portal for this account. Patient accounts must use the Patient Login.');
        setIsSubmitting(false);
        return;
      }

      const target = location.state?.from;
      const safeDestination = isSafeInternalPath(target) && canRoleAccessPath(loggedInUser?.role, target)
        ? target
        : getDashboardPath(loggedInUser?.role);
      navigate(safeDestination, { replace: true });
    } catch (err) {
      setIsSubmitting(false);
      if (err?.isPortalMismatch || err?.message?.includes('Unauthorized portal')) {
        setErrorMessage(err.message);
      } else if (err?.status === 401) {
        setErrorMessage('Invalid email or password');
      } else if (err?.status === 403) {
        setErrorMessage('Security validation failed. Please refresh the page and try again.');
      } else if (err?.status === 400) {
        setErrorMessage(err.fieldErrors?.email || err.fieldErrors?.password || err.message || 'Validation failed for login request.');
      } else if (err?.status === 0) {
        setErrorMessage('Unable to connect to the authentication service. Please check your connection.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again later.');
      }
    }
  };

  const hasError = Boolean(errorMessage);

  // Dedicated Premium Split-Layout for Staff Portal
  if (isStaffPortal) {
    return (
      <main className="public-auth-page staff-portal-layout" aria-labelledby="login-title">
        <div className="staff-split-shell" data-testid="login-card-staff">
          {/* Left / Visual Overview Panel */}
          <aside className="staff-visual-panel" aria-label="Staff Portal Overview">
            <div className="staff-panel-header staff-anim-header">
              <Link to="/" className="staff-panel-brand" aria-label="DentCare Home">
                <span className="staff-brand-icon" aria-hidden="true">
                  <ToothIcon />
                </span>
                <span className="staff-brand-title">DentCare</span>
              </Link>
              <div className="staff-portal-badge">
                <ShieldIcon />
                <span>STAFF PORTAL</span>
              </div>
            </div>

            <div className="staff-panel-content">
              <div className="staff-panel-copy staff-anim-copy">
                <span className="staff-panel-kicker">Clinic Operations Workspace</span>
                <h2 className="staff-panel-headline">Clinical operations, securely connected.</h2>
                <p className="staff-panel-desc">
                  Protected operational workspace for authorized dentists, dental assistants, receptionists, and practice administrators.
                </p>
              </div>

              <div className="staff-panel-media staff-anim-media">
                <img
                  src={staffWorkspaceImg}
                  alt="Modern dental clinic consultation suite and doctor workstation"
                  className="staff-panel-img"
                  width="800"
                  height="600"
                />
                <div className="staff-panel-media-overlay" aria-hidden="true" />
                <div className="staff-panel-media-badge">
                  <span className="staff-badge-pulse" aria-hidden="true" />
                  <span>Practice Operations Active</span>
                </div>
              </div>

              <div className="staff-capabilities-list staff-anim-chips" aria-label="Staff workspace capabilities">
                <div className="staff-capability-chip">
                  <span className="chip-dot" aria-hidden="true" />
                  <span>Clinical workflows</span>
                </div>
                <div className="staff-capability-chip">
                  <span className="chip-dot" aria-hidden="true" />
                  <span>Practice operations</span>
                </div>
                <div className="staff-capability-chip">
                  <span className="chip-dot" aria-hidden="true" />
                  <span>Inventory &amp; administration</span>
                </div>
              </div>
            </div>

            <div className="staff-security-notice staff-anim-notice" role="note">
              <span className="notice-icon" aria-hidden="true"><ShieldIcon /></span>
              <p>Staff accounts are provisioned exclusively by clinic administrators. Public registration is not permitted for staff roles.</p>
            </div>
          </aside>

          {/* Right / Login Form Panel */}
          <div className="staff-form-panel staff-anim-form">
            <Link to="/" className="public-auth-back">
              <span aria-hidden="true">←</span> Back to home
            </Link>

            <header className="public-auth-header staff-form-header">
              <div className="public-portal-tag staff-tag">
                <ShieldIcon />
                <span>Authorized Clinic Staff</span>
              </div>
              <h1 id="login-title">Staff Login</h1>
              <p className="staff-welcome-text">Welcome back. Sign in to your DentCare staff workspace.</p>
            </header>

            {errorMessage && (
              <div id="login-error" className="public-auth-alert" role="alert" aria-live="polite" data-testid="login-error-alert">
                <span aria-hidden="true">!</span>
                <p>{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="public-auth-form" noValidate>
              <div className="public-field">
                <label htmlFor="login-email">Staff Email address</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="staff@dentcare.com"
                  disabled={isSubmitting}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? 'login-error' : undefined}
                  data-testid="login-email-input"
                />
              </div>

              <div className="public-field">
                <label htmlFor="login-password">Password</label>
                <div className="public-password-field">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? 'login-error' : undefined}
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={isSubmitting}
                  >
                    <VisibilityIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="public-auth-submit submit-staff-btn"
                disabled={isSubmitting}
                data-testid="login-submit-button"
              >
                {isSubmitting ? (
                  <span className="public-submit-loading"><span aria-hidden="true" />Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Staff Workspace</span>
                    <ArrowIcon />
                  </>
                )}
              </button>

              <p className="staff-auth-disclaimer">
                For authorized DentCare clinic staff only.
              </p>
            </form>

            <div className="public-auth-footer staff-auth-footer">
              <p>Looking for patient records? <Link to="/patient/login">Go to Patient Login</Link></p>
              <span>New patients can register online using <Link to="/register">Patient Registration</Link>.</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Dedicated Premium Split-Layout for Patient Portal
  if (isPatientPortal) {
    return (
      <main className="public-auth-page patient-portal-layout" aria-labelledby="login-title">
        <div className="patient-split-shell" data-testid="login-card-patient">
          {/* Left / Visual Overview Panel */}
          <aside className="patient-visual-panel" aria-label="Patient Portal Overview">
            <div className="patient-panel-header patient-anim-header">
              <Link to="/" className="patient-panel-brand" aria-label="DentCare Home">
                <span className="patient-brand-icon" aria-hidden="true">
                  <ToothIcon />
                </span>
                <span className="patient-brand-title">DentCare</span>
              </Link>
              <div className="patient-portal-badge">
                <UserIcon />
                <span>PATIENT ACCESS</span>
              </div>
            </div>

            <div className="patient-panel-content">
              <div className="patient-panel-copy patient-anim-copy">
                <span className="patient-panel-kicker">Personal Care &amp; Appointments</span>
                <h2 className="patient-panel-headline">Your dental wellness, comfortably managed.</h2>
                <p className="patient-panel-desc">
                  Access your upcoming visits, verified treatment plans, digital prescriptions, and payment receipts in one secure personal workspace.
                </p>
              </div>

              <div className="patient-panel-media patient-anim-media">
                <img
                  src={patientAccessImg}
                  alt="Welcoming DentCare dental clinic reception and comfortable patient consultation environment"
                  className="patient-panel-img"
                  width="800"
                  height="600"
                />
                <div className="patient-panel-media-overlay" aria-hidden="true" />
                <div className="patient-panel-media-badge">
                  <span className="patient-badge-pulse" aria-hidden="true" />
                  <span>Patient Services Active</span>
                </div>
              </div>

              <div className="patient-capabilities-list patient-anim-chips" aria-label="Patient features">
                <div className="patient-capability-chip">
                  <span className="chip-dot" aria-hidden="true" />
                  <span>Appointment scheduling</span>
                </div>
                <div className="patient-capability-chip">
                  <span className="chip-dot" aria-hidden="true" />
                  <span>Treatment history</span>
                </div>
                <div className="patient-capability-chip">
                  <span className="chip-dot" aria-hidden="true" />
                  <span>Invoices &amp; payments</span>
                </div>
              </div>
            </div>

            <div className="patient-comfort-notice patient-anim-notice" role="note">
              <span className="notice-icon" aria-hidden="true"><UserIcon /></span>
              <p>Need immediate dental attention? Contact our clinic reception directly or schedule an appointment after signing in.</p>
            </div>
          </aside>

          {/* Right / Login Form Panel */}
          <div className="patient-form-panel patient-anim-form">
            <Link to="/" className="public-auth-back">
              <span aria-hidden="true">←</span> Back to home
            </Link>

            <header className="public-auth-header patient-form-header">
              <div className="public-portal-tag patient-tag">
                <UserIcon />
                <span>Patient Portal</span>
              </div>
              <h1 id="login-title" aria-label="Patient Login - Welcome back">
                <span className="sr-only">Patient Login - </span>
                Welcome back
              </h1>
              <p className="patient-welcome-text">
                Sign in to manage your DentCare appointments and patient account.
              </p>
            </header>

            {errorMessage && (
              <div id="login-error" className="public-auth-alert" role="alert" aria-live="polite" data-testid="login-error-alert">
                <span aria-hidden="true">!</span>
                <p>{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="public-auth-form" noValidate>
              <div className="public-field">
                <label htmlFor="login-email">Patient Email address</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="patient@example.com"
                  disabled={isSubmitting}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? 'login-error' : undefined}
                  data-testid="login-email-input"
                />
              </div>

              <div className="public-field">
                <label htmlFor="login-password">Password</label>
                <div className="public-password-field">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? 'login-error' : undefined}
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={isSubmitting}
                  >
                    <VisibilityIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="public-auth-submit submit-patient-btn"
                disabled={isSubmitting}
                data-testid="login-submit-button"
              >
                {isSubmitting ? (
                  <span className="public-submit-loading"><span aria-hidden="true" />Signing In...</span>
                ) : (
                  <>
                    <span>Sign In as Patient</span>
                    <ArrowIcon />
                  </>
                )}
              </button>

              <p className="patient-auth-disclaimer">
                Secure personal access for registered DentCare patients.
              </p>
            </form>

            <div className="public-auth-footer patient-auth-footer">
              <p>New patient? <Link to="/register">Register as a Patient</Link></p>
              <span>Clinic staff member? <Link to="/staff/login">Go to Staff Login</Link></span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Unified / Fallback Login View
  return (
    <main className="public-auth-page public-auth-login" aria-labelledby="login-title">
      <div className="public-auth-card" data-testid={`login-card-${portalType}`}>
        <Link to="/" className="public-auth-back"><span aria-hidden="true">←</span> Back to home</Link>

        <header className="public-auth-header">
          <div className="public-portal-tag">
            <span className="portal-sparkle" aria-hidden="true">✦</span>
            <span>DentCare Account</span>
          </div>
          <h1 id="login-title">Sign in to your account</h1>
          <p>Enter your DentCare email and password to continue.</p>
          <div className="portal-choice-pills" role="navigation" aria-label="Portal Selection">
            <Link to="/patient/login" className="portal-pill-btn">
              <UserIcon /> Patient Portal →
            </Link>
            <Link to="/staff/login" className="portal-pill-btn staff-pill">
              <ShieldIcon /> Staff Portal →
            </Link>
          </div>
        </header>

        {errorMessage && (
          <div id="login-error" className="public-auth-alert" role="alert" aria-live="polite" data-testid="login-error-alert">
            <span aria-hidden="true">!</span>
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="public-auth-form" noValidate>
          <div className="public-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
              disabled={isSubmitting}
              aria-invalid={hasError}
              aria-describedby={hasError ? 'login-error' : undefined}
              data-testid="login-email-input"
            />
          </div>

          <div className="public-field">
            <label htmlFor="login-password">Password</label>
            <div className="public-password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={isSubmitting}
                aria-invalid={hasError}
                aria-describedby={hasError ? 'login-error' : undefined}
                data-testid="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                <VisibilityIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="public-auth-submit"
            disabled={isSubmitting}
            data-testid="login-submit-button"
          >
            {isSubmitting ? (
              <span className="public-submit-loading"><span aria-hidden="true" />Signing In...</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="public-auth-footer">
          <p>New patient? <Link to="/register">Register as a Patient</Link></p>
          <span>Dedicated access: <Link to="/patient/login">Patient Login</Link> · <Link to="/staff/login">Staff Login</Link></span>
        </div>
      </div>
    </main>
  );
}
