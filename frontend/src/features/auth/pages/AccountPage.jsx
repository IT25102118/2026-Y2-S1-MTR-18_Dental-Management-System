import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';
import { updatePatientProfile, changePatientPassword } from '../../patient/api/patientPortalApi';
import '../auth.css';

/**
 * DentCare Authenticated Account Page.
 * Displays safe profile details (name, email, phone, role) and provides a secure logout control.
 * For authenticated PATIENT users, enables bounded self-service:
 * 1. Secure phone number update
 * 2. Secure password change with current-password verification
 * Non-patient staff accounts retain clean, read-only account inspection.
 */
export default function AccountPage() {
  const { user, logout, updateUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const navigate = useNavigate();

  const isPatient = user?.role === 'PATIENT';

  // Phone edit state (PATIENT only)
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Password change state (PATIENT only)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError('');

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setIsLoggingOut(false);
      if (err?.status === 403) {
        setLogoutError('Logout failed: Security validation error. Please try again.');
      } else if (err?.status === 0) {
        setLogoutError('Logout failed: Network connection error. Please try again.');
      } else {
        setLogoutError('Logout failed. Please try again later.');
      }
    }
  };

  const handleStartEditPhone = () => {
    setPhoneInput(user?.phone || '');
    setPhoneError('');
    setPhoneSuccess('');
    setIsEditingPhone(true);
  };

  const handleCancelEditPhone = () => {
    setIsEditingPhone(false);
    setPhoneError('');
  };

  const handleSavePhone = async (e) => {
    if (e) {
      e.preventDefault();
    }
    setPhoneError('');
    setPhoneSuccess('');

    const trimmed = phoneInput.trim();
    if (trimmed.length > 25) {
      setPhoneError('Phone number cannot exceed 25 characters');
      return;
    }

    setIsSavingPhone(true);
    try {
      const response = await updatePatientProfile({ phone: trimmed });
      if (updateUser) {
        updateUser({ phone: response?.phone ?? trimmed });
      }
      setPhoneSuccess('Phone number updated successfully.');
      setIsEditingPhone(false);
    } catch (err) {
      setPhoneError(err?.message || 'Failed to update phone number. Please try again.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 100) {
      setPasswordError('Password must be between 8 and 100 characters.');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).+$/.test(newPassword)) {
      setPasswordError('Password must contain at least one letter and one digit.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePatientPassword({
        currentPassword,
        newPassword
      });
      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err?.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'DentCare User';

  return (
    <div className="auth-container account-container">
      <div className="auth-card account-card">
        <div className="account-header">
          <Link to="/" className="auth-back-link">
            &larr; Back to Home
          </Link>
          <div className="account-title-group">
            <h1>My Account</h1>
            <p className="auth-subtitle">Authenticated DentCare Profile</p>
          </div>
        </div>

        {logoutError && (
          <div
            className="error-alert"
            role="alert"
            aria-live="polite"
            data-testid="logout-error-alert"
          >
            {logoutError}
          </div>
        )}

        <div className="account-details" data-testid="account-details">
          <div className="account-field">
            <span className="account-field-label">Name</span>
            <span className="account-field-value" data-testid="account-user-name">
              {fullName}
            </span>
          </div>

          <div className="account-field">
            <span className="account-field-label">Email Address</span>
            <span className="account-field-value" data-testid="account-user-email">
              {user?.email || '—'}
            </span>
          </div>

          <div className="account-field">
            <span className="account-field-label">Phone Number</span>
            <span className="account-field-value" data-testid="account-user-phone">
              {user?.phone || 'Not provided'}
            </span>
          </div>

          <div className="account-field">
            <span className="account-field-label">Assigned Role</span>
            <span
              className="account-field-value role-badge"
              data-testid="account-role-badge"
            >
              {user?.role || '—'}
            </span>
          </div>
        </div>

        {isPatient && (
          <>
            {/* Section A: Contact Information */}
            <div className="account-section" data-testid="contact-info-section">
              <div className="account-section-header">
                <h2 className="account-section-title">Contact Information</h2>
                <p className="account-section-subtitle">Manage your personal contact details</p>
              </div>

              {phoneSuccess && (
                <div
                  className="account-alert-success"
                  role="status"
                  aria-live="polite"
                  data-testid="phone-success-alert"
                >
                  {phoneSuccess}
                </div>
              )}

              {!isEditingPhone ? (
                <div className="account-phone-display" data-testid="account-phone-display">
                  <div>
                    <span className="account-field-label">Contact Phone</span>
                    <div className="account-phone-value">
                      {user?.phone || 'Not provided'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="account-btn-sm account-btn-primary"
                    onClick={handleStartEditPhone}
                    data-testid="edit-phone-btn"
                  >
                    Edit Phone
                  </button>
                </div>
              ) : (
                <form className="account-inline-form" onSubmit={handleSavePhone} data-testid="phone-edit-form">
                  <div className="account-form-group">
                    <label htmlFor="account-phone-input" className="account-form-label">
                      Phone Number
                    </label>
                    <input
                      id="account-phone-input"
                      type="tel"
                      className="account-form-input"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      maxLength={25}
                      placeholder="e.g. +1 555-0100"
                      disabled={isSavingPhone}
                      data-testid="phone-input"
                      autoFocus
                    />
                  </div>

                  {phoneError && (
                    <div
                      className="account-alert-error"
                      role="alert"
                      aria-live="polite"
                      data-testid="phone-error-alert"
                    >
                      {phoneError}
                    </div>
                  )}

                  <div className="account-form-actions">
                    <button
                      type="submit"
                      className="account-btn-sm account-btn-primary"
                      disabled={isSavingPhone}
                      data-testid="save-phone-btn"
                    >
                      {isSavingPhone ? 'Saving...' : 'Save Phone'}
                    </button>
                    <button
                      type="button"
                      className="account-btn-sm account-btn-secondary"
                      onClick={handleCancelEditPhone}
                      disabled={isSavingPhone}
                      data-testid="cancel-phone-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Section B: Security */}
            <div className="account-section" data-testid="security-section">
              <div className="account-section-header">
                <h2 className="account-section-title">Security</h2>
                <p className="account-section-subtitle">Update your password to keep your account safe</p>
              </div>

              {passwordSuccess && (
                <div
                  className="account-alert-success"
                  role="status"
                  aria-live="polite"
                  data-testid="password-success-alert"
                >
                  {passwordSuccess}
                </div>
              )}

              {passwordError && (
                <div
                  className="account-alert-error"
                  role="alert"
                  aria-live="polite"
                  data-testid="password-error-alert"
                >
                  {passwordError}
                </div>
              )}

              <form className="account-inline-form" onSubmit={handleChangePassword} data-testid="password-change-form">
                <div className="account-form-group">
                  <label htmlFor="current-password-input" className="account-form-label">
                    Current Password
                  </label>
                  <input
                    id="current-password-input"
                    type="password"
                    className="account-form-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    placeholder="Enter current password"
                    data-testid="current-password-input"
                  />
                </div>

                <div className="account-form-group">
                  <label htmlFor="new-password-input" className="account-form-label">
                    New Password
                  </label>
                  <input
                    id="new-password-input"
                    type="password"
                    className="account-form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    placeholder="Min 8 chars, 1 letter, 1 digit"
                    data-testid="new-password-input"
                  />
                </div>

                <div className="account-form-group">
                  <label htmlFor="confirm-password-input" className="account-form-label">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password-input"
                    type="password"
                    className="account-form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSavingPassword}
                    placeholder="Re-enter new password"
                    data-testid="confirm-password-input"
                  />
                </div>

                <div className="account-form-actions">
                  <button
                    type="submit"
                    className="account-btn-sm account-btn-primary"
                    disabled={isSavingPassword}
                    data-testid="change-password-btn"
                  >
                    {isSavingPassword ? 'Updating Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        <div className="account-actions">
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleLogout}
            disabled={isLoggingOut}
            data-testid="logout-button"
          >
            {isLoggingOut ? 'Logging Out...' : 'Log Out'}
          </button>
        </div>

        <div className="account-footer-links">
          <Link to={getDashboardPath(user?.role)} className="auth-link">
            Return to Dashboard &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
