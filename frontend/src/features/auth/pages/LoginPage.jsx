import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canRoleAccessPath, getDashboardPath, isSafeInternalPath, isStaffRole } from '../roleAccess';
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

  return (
    <main className={`public-auth-page public-auth-login ${isPatientPortal ? 'portal-patient-theme' : ''} ${isStaffPortal ? 'portal-staff-theme' : ''}`} aria-labelledby="login-title">
      <div className={`public-auth-card ${isPatientPortal ? 'public-auth-card-patient' : ''} ${isStaffPortal ? 'public-auth-card-staff' : ''}`} data-testid={`login-card-${portalType}`}>
        <Link to="/" className="public-auth-back"><span aria-hidden="true">←</span> Back to home</Link>

        <header className="public-auth-header">
          {isPatientPortal ? (
            <>
              <div className="public-portal-tag patient-tag">
                <UserIcon />
                <span>Patient Portal</span>
              </div>
              <h1 id="login-title">Patient Login</h1>
              <p>Sign in with your verified patient email and password to access your personal dental workspace.</p>
            </>
          ) : isStaffPortal ? (
            <>
              <div className="public-portal-tag staff-tag">
                <ShieldIcon />
                <span>Authorized Clinic Staff</span>
              </div>
              <h1 id="login-title">Staff Login</h1>
              <p>Secure workspace sign-in for DentCare dentists, dental assistants, receptionists, and administrators.</p>
            </>
          ) : (
            <>
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
            </>
          )}
        </header>

        {isStaffPortal && (
          <div className="staff-security-notice" role="note">
            <span className="notice-icon" aria-hidden="true">🛡️</span>
            <p>Staff accounts are provisioned exclusively by clinic administrators. Public registration is not permitted for staff roles.</p>
          </div>
        )}

        {errorMessage && (
          <div id="login-error" className="public-auth-alert" role="alert" aria-live="polite" data-testid="login-error-alert">
            <span aria-hidden="true">!</span>
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="public-auth-form" noValidate>
          <div className="public-field">
            <label htmlFor="login-email">
              {isPatientPortal ? 'Patient Email address' : isStaffPortal ? 'Staff Email address' : 'Email address'}
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              placeholder={isStaffPortal ? 'staff@dentcare.com' : 'name@example.com'}
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
            className={`public-auth-submit ${isStaffPortal ? 'submit-staff-btn' : ''}`}
            disabled={isSubmitting}
            data-testid="login-submit-button"
          >
            {isSubmitting ? (
              <span className="public-submit-loading"><span aria-hidden="true" />Signing In...</span>
            ) : isPatientPortal ? (
              'Sign In as Patient'
            ) : isStaffPortal ? (
              'Sign In to Staff Workspace'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="public-auth-footer">
          {isPatientPortal ? (
            <>
              <p>New patient? <Link to="/register">Register as a Patient</Link></p>
              <span>Clinic staff member? <Link to="/staff/login">Go to Staff Login</Link></span>
            </>
          ) : isStaffPortal ? (
            <>
              <p>Looking for patient records? <Link to="/patient/login">Go to Patient Login</Link></p>
              <span>New patients can register online using <Link to="/register">Patient Registration</Link>.</span>
            </>
          ) : (
            <>
              <p>New patient? <Link to="/register">Register as a Patient</Link></p>
              <span>Dedicated access: <Link to="/patient/login">Patient Login</Link> · <Link to="/staff/login">Staff Login</Link></span>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
