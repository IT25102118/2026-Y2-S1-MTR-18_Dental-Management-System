import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { registerPatient } from '../api/authApi';
import '../auth.css';
import '../public-auth.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

function VisibilityIcon({ visible }) {
  return visible
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A9 9 0 0112 4c7 0 10 8 10 8a15 15 0 01-2.1 3.4M6.6 6.6C3.7 8.5 2 12 2 12s3 8 10 8a9.4 9.4 0 005.4-1.7" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
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
    setServerError(null);
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) { setFieldErrors(clientErrors); return; }
    setSubmitting(true);
    try {
      const response = await registerPatient({ firstName: formData.firstName, lastName: formData.lastName, email: formData.email, phone: formData.phone, password: formData.password });
      setFormData((previous) => ({ ...previous, password: '', confirmPassword: '' }));
      setRegisteredAccount(response);
    } catch (err) {
      if (err.status === 409) {
        setServerError('An account with this email address already exists. Please use a different email address.');
        setFieldErrors((previous) => ({ ...previous, email: 'An account with this email address already exists' }));
      } else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
        setServerError('Please correct the validation errors below.');
      } else setServerError(err.message || 'An unexpected error occurred during registration. Please try again.');
    } finally { setSubmitting(false); }
  };

  const describedBy = (name, hint) => [hint, fieldErrors[name] ? `${name}-error` : null].filter(Boolean).join(' ') || undefined;
  const passwordToggle = (field, label) => <button type="button" onClick={() => setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))} aria-label={passwordVisibility[field] ? `Hide ${label}` : `Show ${label}`} aria-pressed={passwordVisibility[field]} disabled={submitting}><VisibilityIcon visible={passwordVisibility[field]} /></button>;

  if (registeredAccount) {
    return (
      <main className="public-auth-page public-auth-success-page">
        <section className="public-auth-card public-auth-success" role="region" aria-label="Registration Success">
          <div className="public-success-icon" aria-hidden="true">✓</div>
          <h2>Registration Successful</h2>
          <p>Your patient account has been created and is ready to use.</p>
          <dl>
            <div><dt>Name</dt><dd>{registeredAccount.firstName} {registeredAccount.lastName}</dd></div>
            <div><dt>Email</dt><dd>{registeredAccount.email}</dd></div>
            <div><dt>Account role</dt><dd>{registeredAccount.role}</dd></div>
            <div><dt>Status</dt><dd>{registeredAccount.active ? 'Active' : 'Inactive'}</dd></div>
          </dl>
          <p className="public-success-note">Sign in using the password you created. Only your email address will be carried to the sign-in page.</p>
          <div className="public-success-actions"><Link to="/login" state={{ prefillEmail: registeredAccount.email }} className="public-auth-submit">Sign in now</Link><Link to="/" className="public-auth-secondary">Return to Home</Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className="public-auth-page public-auth-register" aria-labelledby="registration-title">
      <div className="public-auth-card public-auth-card-wide">
        <Link to="/" className="public-auth-back"><span aria-hidden="true">←</span> Back to home</Link>
        <header className="public-auth-header">
          <h1 id="registration-title">Patient Registration</h1>
          <p>Create a patient account to access DentCare. Required fields are marked with an asterisk.</p>
        </header>

        {serverError && <div className="public-auth-alert" role="alert" aria-live="polite"><span aria-hidden="true">!</span><p>{serverError}</p></div>}

        <form className="public-auth-form public-registration-form" onSubmit={handleSubmit} noValidate>
          <fieldset>
            <legend>Personal details</legend>
            <div className="public-form-grid">
              <div className="public-field"><label htmlFor="firstName">First Name<span aria-hidden="true">*</span></label><input id="firstName" name="firstName" type="text" autoComplete="given-name" value={formData.firstName} onChange={handleChange} disabled={submitting} aria-invalid={Boolean(fieldErrors.firstName)} aria-describedby={describedBy('firstName')} required />{fieldErrors.firstName && <span id="firstName-error" className="public-field-error" role="alert">{fieldErrors.firstName}</span>}</div>
              <div className="public-field"><label htmlFor="lastName">Last Name<span aria-hidden="true">*</span></label><input id="lastName" name="lastName" type="text" autoComplete="family-name" value={formData.lastName} onChange={handleChange} disabled={submitting} aria-invalid={Boolean(fieldErrors.lastName)} aria-describedby={describedBy('lastName')} required />{fieldErrors.lastName && <span id="lastName-error" className="public-field-error" role="alert">{fieldErrors.lastName}</span>}</div>
              <div className="public-field"><label htmlFor="email">Email Address<span aria-hidden="true">*</span></label><input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={formData.email} onChange={handleChange} disabled={submitting} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={describedBy('email','email-hint')} required /><span id="email-hint" className="public-field-hint">This will be your sign-in email.</span>{fieldErrors.email && <span id="email-error" className="public-field-error" role="alert">{fieldErrors.email}</span>}</div>
              <div className="public-field"><label htmlFor="phone">Phone Number <span className="public-optional">Optional</span></label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={handleChange} disabled={submitting} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={describedBy('phone')} />{fieldErrors.phone && <span id="phone-error" className="public-field-error" role="alert">{fieldErrors.phone}</span>}</div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Account security</legend>
            <div className="public-form-grid">
              <div className="public-field"><label htmlFor="password">Password<span aria-hidden="true">*</span></label><div className="public-password-field"><input id="password" name="password" type={passwordVisibility.password ? 'text' : 'password'} autoComplete="new-password" value={formData.password} onChange={handleChange} disabled={submitting} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={describedBy('password','password-hint')} required />{passwordToggle('password','password')}</div><span id="password-hint" className="public-field-hint">8–100 characters with at least one letter and one number.</span>{fieldErrors.password && <span id="password-error" className="public-field-error" role="alert">{fieldErrors.password}</span>}</div>
              <div className="public-field"><label htmlFor="confirmPassword">Confirm Password<span aria-hidden="true">*</span></label><div className="public-password-field"><input id="confirmPassword" name="confirmPassword" type={passwordVisibility.confirmPassword ? 'text' : 'password'} autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} disabled={submitting} aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby={describedBy('confirmPassword','confirmPassword-hint')} required />{passwordToggle('confirmPassword','confirmed password')}</div><span id="confirmPassword-hint" className="public-field-hint">Enter the same password again.</span>{fieldErrors.confirmPassword && <span id="confirmPassword-error" className="public-field-error" role="alert">{fieldErrors.confirmPassword}</span>}</div>
            </div>
          </fieldset>

          <button type="submit" className="public-auth-submit" disabled={submitting}>{submitting ? <span className="public-submit-loading"><span aria-hidden="true" />Registering Account...</span> : 'Register Patient Account'}</button>
        </form>
        <div className="public-auth-footer"><p>Already registered? <Link to="/login">Sign in instead</Link></p></div>
      </div>
    </main>
  );
}
