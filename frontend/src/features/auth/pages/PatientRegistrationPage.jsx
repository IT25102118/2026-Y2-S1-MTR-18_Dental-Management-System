import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerPatient } from '../api/authApi';
import patientAccessImg from '../../../assets/patient-access.jpg';
import '../auth.css';
import '../public-auth.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

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

function CheckCircleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function PatientRegistrationPage() {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredAccount, setRegisteredAccount] = useState(null);
  const [passwordVisibility, setPasswordVisibility] = useState({ password: false, confirmPassword: false });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((previous) => ({ ...previous, [name]: null }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    else if (formData.firstName.trim().length > 60) errors.firstName = 'First name cannot exceed 60 characters';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    else if (formData.lastName.trim().length > 60) errors.lastName = 'Last name cannot exceed 60 characters';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!EMAIL_REGEX.test(formData.email.trim())) errors.email = 'Please enter a valid email address';
    else if (formData.email.trim().length > 150) errors.email = 'Email cannot exceed 150 characters';
    if (formData.phone && formData.phone.trim().length > 25) errors.phone = 'Phone number cannot exceed 25 characters';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 8 || formData.password.length > 100) errors.password = 'Password must be between 8 and 100 characters';
    else if (!PASSWORD_PATTERN.test(formData.password)) errors.password = 'Password must contain at least one letter and one digit';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setServerError(null);
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    setSubmitting(true);
    try {
      const response = await registerPatient({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
      });
      setFormData((previous) => ({ ...previous, password: '', confirmPassword: '' }));
      setRegisteredAccount(response);
    } catch (err) {
      if (err.status === 409) {
        setServerError('An account with this email address already exists. Please use a different email address.');
        setFieldErrors((previous) => ({ ...previous, email: 'An account with this email address already exists' }));
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

  const describedBy = (name, hint) => [hint, fieldErrors[name] ? `${name}-error` : null].filter(Boolean).join(' ') || undefined;

  const passwordToggle = (field, label) => (
    <button
      type="button"
      onClick={() => setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))}
      aria-label={passwordVisibility[field] ? `Hide ${label}` : `Show ${label}`}
      aria-pressed={passwordVisibility[field]}
      disabled={submitting}
    >
      <VisibilityIcon visible={passwordVisibility[field]} />
    </button>
  );

  // Confirmed Registration Success State (Replaces Form)
  if (registeredAccount) {
    const rawFirstName = registeredAccount.firstName || formData.firstName?.trim() || '';
    const welcomeMessage = rawFirstName ? `Welcome to DentCare, ${rawFirstName}!` : 'Welcome to DentCare!';

    return (
      <main className="public-auth-page registration-portal-layout" aria-labelledby="success-title">
        <section
          className="registration-success-shell registration-anim-success"
          data-testid="registration-success-card"
          role="status"
          aria-live="polite"
        >
          <div className="registration-success-badge-wrap">
            <div className="registration-success-icon" aria-hidden="true">
              <CheckCircleIcon />
            </div>
          </div>

          <div className="registration-success-content">
            <span className="registration-success-eyebrow">PATIENT REGISTRATION CONFIRMED</span>
            <h1 id="success-title" className="registration-success-title">Registration successful</h1>
            <p className="registration-success-welcome">{welcomeMessage}</p>
            <p className="registration-success-description">
              Your patient account has been created successfully. You can now sign in to access your DentCare patient portal.
            </p>

            <div className="registration-account-summary" aria-label="Account Details Summary">
              <div className="summary-row">
                <span className="summary-label">Name</span>
                <span className="summary-value">{registeredAccount.firstName} {registeredAccount.lastName}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Sign-in Email</span>
                <span className="summary-value">{registeredAccount.email}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Account role</span>
                <span className="summary-value summary-role-badge">PATIENT</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Status</span>
                <span className="summary-value">{registeredAccount.active !== false ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <p className="registration-security-tip">
              Sign in using the password you created. Only your email address will be carried to the sign-in page.
            </p>

            <div className="registration-success-actions">
              <Link
                to="/patient/login"
                state={{ prefillEmail: registeredAccount.email }}
                className="public-auth-submit submit-patient-btn success-cta-btn"
                aria-label="Continue to Patient Login - Sign in now"
              >
                <span>Continue to Patient Login</span>
                <ArrowIcon />
              </Link>
              <Link to="/" className="public-auth-secondary success-secondary-btn">
                Return to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Premium Patient Registration Split-Layout
  return (
    <main className="public-auth-page registration-portal-layout" aria-labelledby="registration-title">
      <div className="registration-split-shell" data-testid="registration-card-patient">
        {/* Left / Visual Overview Panel */}
        <aside className="patient-visual-panel registration-visual-panel" aria-label="Patient Registration Overview">
          <div className="patient-panel-header registration-anim-header">
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
            <div className="patient-panel-copy registration-anim-copy">
              <span className="patient-panel-kicker">New Patient Onboarding</span>
              <h2 className="patient-panel-headline">Begin your dental wellness journey with DentCare.</h2>
              <p className="patient-panel-desc">
                Create your verified patient account to schedule consultations, review personalized treatment plans, and access digital dental records with complete clinical privacy.
              </p>
            </div>

            <div className="patient-panel-media registration-anim-media">
              <img
                src={patientAccessImg}
                alt="DentCare modern patient reception and consultation clinic suite"
                className="patient-panel-img"
                width="800"
                height="600"
              />
              <div className="patient-panel-media-overlay" aria-hidden="true" />
              <div className="patient-panel-media-badge">
                <span className="patient-badge-pulse" aria-hidden="true" />
                <span>Patient Registration Active</span>
              </div>
            </div>

            <div className="patient-capabilities-list registration-anim-chips" aria-label="Registration benefits">
              <div className="patient-capability-chip">
                <span className="chip-dot" aria-hidden="true" />
                <span>Direct appointment booking</span>
              </div>
              <div className="patient-capability-chip">
                <span className="chip-dot" aria-hidden="true" />
                <span>Verified clinical records</span>
              </div>
              <div className="patient-capability-chip">
                <span className="chip-dot" aria-hidden="true" />
                <span>Private care portal</span>
              </div>
            </div>
          </div>

          <div className="patient-comfort-notice registration-anim-notice" role="note">
            <span className="notice-icon" aria-hidden="true"><ShieldIcon /></span>
            <p>Your health data and clinical records are strictly protected under clinical privacy safeguards.</p>
          </div>
        </aside>

        {/* Right / Registration Form Panel (Pearl Surface) */}
        <div className="patient-form-panel registration-form-panel registration-anim-form">
          <Link to="/" className="public-auth-back">
            <span aria-hidden="true">←</span> Back to home
          </Link>

          <header className="public-auth-header registration-form-header">
            <div className="public-portal-tag patient-tag">
              <UserIcon />
              <span>Patient Registration</span>
            </div>
            <h1 id="registration-title" aria-label="Patient Registration - Create your DentCare account">
              <span className="sr-only">Patient Registration - </span>
              Create your DentCare account
            </h1>
            <p className="patient-welcome-text">
              Create a patient account to access DentCare. Required fields are marked with an asterisk.
            </p>
          </header>

          {serverError && (
            <div className="public-auth-alert" role="alert" aria-live="polite">
              <span aria-hidden="true">!</span>
              <p>{serverError}</p>
            </div>
          )}

          <form className="public-auth-form public-registration-form" onSubmit={handleSubmit} noValidate>
            <fieldset>
              <legend>Personal details</legend>
              <div className="public-form-grid">
                <div className="public-field">
                  <label htmlFor="firstName">First Name<span aria-hidden="true">*</span></label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.firstName)}
                    aria-describedby={describedBy('firstName')}
                    placeholder="Enter your first name"
                    required
                  />
                  {fieldErrors.firstName && <span id="firstName-error" className="public-field-error" role="alert">{fieldErrors.firstName}</span>}
                </div>

                <div className="public-field">
                  <label htmlFor="lastName">Last Name<span aria-hidden="true">*</span></label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                    aria-describedby={describedBy('lastName')}
                    placeholder="Enter your last name"
                    required
                  />
                  {fieldErrors.lastName && <span id="lastName-error" className="public-field-error" role="alert">{fieldErrors.lastName}</span>}
                </div>

                <div className="public-field">
                  <label htmlFor="email">Email Address<span aria-hidden="true">*</span></label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={describedBy('email', 'email-hint')}
                    placeholder="name@example.com"
                    required
                  />
                  <span id="email-hint" className="public-field-hint">This will be your sign-in email.</span>
                  {fieldErrors.email && <span id="email-error" className="public-field-error" role="alert">{fieldErrors.email}</span>}
                </div>

                <div className="public-field">
                  <label htmlFor="phone">Phone Number <span className="public-optional">Optional</span></label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={submitting}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={describedBy('phone')}
                    placeholder="+94 77 123 4567"
                  />
                  {fieldErrors.phone && <span id="phone-error" className="public-field-error" role="alert">{fieldErrors.phone}</span>}
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Account security</legend>
              <div className="public-form-grid">
                <div className="public-field">
                  <label htmlFor="password">Password<span aria-hidden="true">*</span></label>
                  <div className="public-password-field">
                    <input
                      id="password"
                      name="password"
                      type={passwordVisibility.password ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={submitting}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={describedBy('password', 'password-hint')}
                      placeholder="Enter a secure password"
                      required
                    />
                    {passwordToggle('password', 'password')}
                  </div>
                  <span id="password-hint" className="public-field-hint">8–100 characters with at least one letter and one number.</span>
                  {fieldErrors.password && <span id="password-error" className="public-field-error" role="alert">{fieldErrors.password}</span>}
                </div>

                <div className="public-field">
                  <label htmlFor="confirmPassword">Confirm Password<span aria-hidden="true">*</span></label>
                  <div className="public-password-field">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={passwordVisibility.confirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={submitting}
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      aria-describedby={describedBy('confirmPassword', 'confirmPassword-hint')}
                      placeholder="Repeat your password"
                      required
                    />
                    {passwordToggle('confirmPassword', 'confirmed password')}
                  </div>
                  <span id="confirmPassword-hint" className="public-field-hint">Enter the same password again.</span>
                  {fieldErrors.confirmPassword && <span id="confirmPassword-error" className="public-field-error" role="alert">{fieldErrors.confirmPassword}</span>}
                </div>
              </div>
            </fieldset>

            <button
              type="submit"
              className="public-auth-submit submit-patient-btn registration-submit-btn"
              disabled={submitting}
              aria-label={submitting ? "Registering account... Creating account..." : "Register Patient Account - Create Patient Account"}
            >
              {submitting ? (
                <span className="public-submit-loading"><span aria-hidden="true" />Creating account...</span>
              ) : (
                <>
                  <span className="sr-only">Register Patient Account - </span>
                  <span>Create Patient Account</span>
                  <ArrowIcon />
                </>
              )}
            </button>
          </form>

          <div className="public-auth-footer registration-auth-footer">
            <p>Already have an account? <Link to="/patient/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}
