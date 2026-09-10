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
          <div className="auth-logo-badge">DentCare</div>
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
            <input
              id="login-password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isSubmitting}
              data-testid="login-password-input"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
            data-testid="login-submit-button"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
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
