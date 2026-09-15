import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerPatient } from '../api/authApi';
import '../auth.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export default function PatientRegistrationPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredAccount, setRegisteredAccount] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length > 60) {
      errors.firstName = 'First name cannot exceed 60 characters';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length > 60) {
      errors.lastName = 'Last name cannot exceed 60 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    } else if (formData.email.trim().length > 150) {
      errors.email = 'Email cannot exceed 150 characters';
    }

    if (formData.phone && formData.phone.trim().length > 25) {
      errors.phone = 'Phone number cannot exceed 25 characters';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8 || formData.password.length > 100) {
      errors.password = 'Password must be between 8 and 100 characters';
    } else if (!PASSWORD_PATTERN.test(formData.password)) {
      errors.password = 'Password must contain at least one letter and one digit';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await registerPatient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      setRegisteredAccount(response);
    } catch (err) {
      if (err.status === 409) {
        setServerError('An account with this email address already exists. Please use a different email address.');
        setFieldErrors((prev) => ({
          ...prev,
          email: 'An account with this email address already exists'
        }));
      } else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
        setServerError('Please correct the validation errors below.');
      } else {
        setServerError(err.message || 'An unexpected error occurred during registration. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (registeredAccount) {
    return (
      <div className="auth-container">
        <div className="auth-card auth-success-card" role="region" aria-label="Registration Success">
          <div className="auth-success-icon" aria-hidden="true">✓</div>
          <h2>Registration Successful</h2>
          <p>
            Your patient account has been created and is active.
          </p>

          <div className="auth-success-details">
            <div><strong>Name:</strong> {registeredAccount.firstName} {registeredAccount.lastName}</div>
            <div><strong>Email:</strong> {registeredAccount.email}</div>
            <div><strong>Account Role:</strong> {registeredAccount.role}</div>
            <div><strong>Status:</strong> {registeredAccount.active ? 'Active' : 'Inactive'}</div>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Your patient login is ready. Sign in with the email address you registered.
          </p>

          <div className="auth-success-actions">
            <Link
              to="/login"
              state={{ prefillEmail: registeredAccount.email }}
              className="btn btn-primary"
            >
              Sign in now
            </Link>
            <Link to="/" className="auth-home-link">Return to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <header className="auth-header">
          <h1>Patient Registration</h1>
          <p>Create your DentCare patient account</p>
        </header>

        {serverError && (
          <div className="auth-alert-error" role="alert">
            {serverError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">
                First Name<span className="required-indicator" aria-hidden="true">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleChange}
                disabled={submitting}
                className={fieldErrors.firstName ? 'input-error' : ''}
                aria-invalid={Boolean(fieldErrors.firstName)}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                required
              />
              {fieldErrors.firstName && (
                <span id="firstName-error" className="error-message" role="alert">
                  {fieldErrors.firstName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">
                Last Name<span className="required-indicator" aria-hidden="true">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleChange}
                disabled={submitting}
                className={fieldErrors.lastName ? 'input-error' : ''}
                aria-invalid={Boolean(fieldErrors.lastName)}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                required
              />
              {fieldErrors.lastName && (
                <span id="lastName-error" className="error-message" role="alert">
                  {fieldErrors.lastName}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address<span className="required-indicator" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={submitting}
              className={fieldErrors.email ? 'input-error' : ''}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              required
            />
            {fieldErrors.email && (
              <span id="email-error" className="error-message" role="alert">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">
              Phone Number <span style={{ fontWeight: 'normal', color: '#64748b' }}>(Optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled={submitting}
              className={fieldErrors.phone ? 'input-error' : ''}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
            />
            {fieldErrors.phone && (
              <span id="phone-error" className="error-message" role="alert">
                {fieldErrors.phone}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password<span className="required-indicator" aria-hidden="true">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={submitting}
              className={fieldErrors.password ? 'input-error' : ''}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
              required
            />
            <span id="password-hint" className="form-hint">
              Minimum 8 characters with at least one letter and one number
            </span>
            {fieldErrors.password && (
              <span id="password-error" className="error-message" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password<span className="required-indicator" aria-hidden="true">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={submitting}
              className={fieldErrors.confirmPassword ? 'input-error' : ''}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              required
            />
            {fieldErrors.confirmPassword && (
              <span id="confirmPassword-error" className="error-message" role="alert">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-button"
            disabled={submitting}
          >
            {submitting ? 'Registering Account...' : 'Register Patient Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
