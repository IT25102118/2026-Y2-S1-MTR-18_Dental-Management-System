import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../auth.css';

/**
 * DentCare Login Page.
 * Securely authenticates users, supports return-to internal redirection,
 * and classifies backend errors without leaking internals.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: trimmedEmail, password });

      // Determine safe internal destination
      const target = location.state?.from;
      const safeDestination =
        typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
          ? target
          : '/account';

      navigate(safeDestination, { replace: true });
    } catch (err) {
      setIsSubmitting(false);

      if (err?.status === 401) {
        setErrorMessage('Invalid email or password');
      } else if (err?.status === 403) {
        setErrorMessage('Security validation failed. Please refresh the page and try again.');
      } else if (err?.status === 400) {
        const fieldError = err.fieldErrors?.email || err.fieldErrors?.password;
        setErrorMessage(fieldError || err.message || 'Validation failed for login request.');
      } else if (err?.status === 0) {
        setErrorMessage('Unable to connect to the authentication service. Please check your connection.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again later.');
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-back-link">
            &larr; Back to Home
          </Link>
          <div className="auth-logo-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 6 3 10 .8 2.2 2 4 3 4s2.2-1.8 3-4c1.5-4 3-6.5 3-10 0-3.5-2.5-6-6-6z" />
              <path d="M9 10c1-1 2-1.5 3-1.5s2 .5 3 1.5" />
            </svg>
            <span>DentCare</span>
          </div>
          <h1>Sign In</h1>
          <p className="auth-subtitle">
            Enter your credentials to access your DentCare account.
          </p>
        </div>

        {errorMessage && (
          <div
            className="error-alert"
            role="alert"
            aria-live="polite"
            data-testid="login-error-alert"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="e.g. user@dentcare.com"
              disabled={isSubmitting}
              data-testid="login-email-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={isSubmitting}
                data-testid="login-password-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
            data-testid="login-submit-button"
          >
            {isSubmitting ? (
              <span className="btn-loading-content">
                <span className="btn-spinner" aria-hidden="true"></span>
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Register as a Patient
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
