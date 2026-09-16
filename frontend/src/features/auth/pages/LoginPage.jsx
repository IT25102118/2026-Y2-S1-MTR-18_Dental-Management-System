import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canRoleAccessPath, getDashboardPath, isSafeInternalPath } from '../roleAccess';
import '../auth.css';
import '../public-auth.css';

function VisibilityIcon({ visible }) {
  return visible
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A9 9 0 0112 4c7 0 10 8 10 8a15 15 0 01-2.1 3.4M6.6 6.6C3.7 8.5 2 12 2 12s3 8 10 8a9.4 9.4 0 005.4-1.7" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export default function LoginPage() {
  const location = useLocation();
  const [email, setEmail] = useState(() => typeof location.state?.prefillEmail === 'string' ? location.state.prefillEmail : '');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) { setErrorMessage('Please enter both email and password.'); return; }
    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email: trimmedEmail, password });
      const target = location.state?.from;
      const safeDestination = isSafeInternalPath(target) && canRoleAccessPath(loggedInUser?.role, target) ? target : getDashboardPath(loggedInUser?.role);
      navigate(safeDestination, { replace: true });
    } catch (err) {
      setIsSubmitting(false);
      if (err?.status === 401) setErrorMessage('Invalid email or password');
      else if (err?.status === 403) setErrorMessage('Security validation failed. Please refresh the page and try again.');
      else if (err?.status === 400) setErrorMessage(err.fieldErrors?.email || err.fieldErrors?.password || err.message || 'Validation failed for login request.');
      else if (err?.status === 0) setErrorMessage('Unable to connect to the authentication service. Please check your connection.');
      else setErrorMessage('An unexpected error occurred. Please try again later.');
    }
  };

  const hasError = Boolean(errorMessage);

  return (
    <main className="public-auth-page public-auth-login" aria-labelledby="login-title">
      <div className="public-auth-card">
        <Link to="/" className="public-auth-back"><span aria-hidden="true">←</span> Back to home</Link>
        <header className="public-auth-header">
          <h1 id="login-title">Sign in to your account</h1>
          <p>Enter your DentCare email and password to continue.</p>
        </header>

        {errorMessage && <div id="login-error" className="public-auth-alert" role="alert" aria-live="polite" data-testid="login-error-alert"><span aria-hidden="true">!</span><p>{errorMessage}</p></div>}

        <form onSubmit={handleSubmit} className="public-auth-form" noValidate>
          <div className="public-field">
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" inputMode="email" placeholder="name@example.com" disabled={isSubmitting} aria-invalid={hasError} aria-describedby={hasError ? 'login-error' : undefined} data-testid="login-email-input" />
          </div>
          <div className="public-field">
            <label htmlFor="login-password">Password</label>
            <div className="public-password-field">
              <input id="login-password" type={showPassword ? 'text' : 'password'} name="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Enter your password" disabled={isSubmitting} aria-invalid={hasError} aria-describedby={hasError ? 'login-error' : undefined} data-testid="login-password-input" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={isSubmitting}><VisibilityIcon visible={showPassword} /></button>
            </div>
          </div>
          <button type="submit" className="public-auth-submit" disabled={isSubmitting} data-testid="login-submit-button">{isSubmitting ? <span className="public-submit-loading"><span aria-hidden="true" />Signing In...</span> : 'Sign In'}</button>
        </form>

        <div className="public-auth-footer"><p>New patient? <Link to="/register">Register as a Patient</Link></p><span>Patient and staff accounts use this sign-in.</span></div>
      </div>
    </main>
  );
}
