import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatientAppointments, createAppointmentRequest } from '../../patient/api/patientPortalApi';
import '../patient-dashboard.css';
import '../patient-appointments.css';

/* Accessible SVGs */
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PatientAppointmentsPage() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Booking Form State
  const [appointmentDate, setAppointmentDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Form Validation & Submission State
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const todayStr = getTodayLocalDate();

  const fetchAppointments = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await getPatientAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message || 'Unable to load your appointment requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const validateForm = () => {
    const errors = {};
    const trimmedReason = reason.trim();

    if (!appointmentDate) {
      errors.appointmentDate = 'Appointment date is required.';
    } else if (appointmentDate < todayStr) {
      errors.appointmentDate = 'Appointment date cannot be earlier than today.';
    }

    if (appointmentDate === todayStr && preferredTime) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      if (preferredTime < currentTimeStr) {
        errors.preferredTime = 'Appointment time cannot be earlier than current time today.';
      }
    }

    if (!trimmedReason) {
      errors.reason = 'Reason for visit is required.';
    } else if (trimmedReason.length > 255) {
      errors.reason = 'Reason cannot exceed 255 characters.';
    }

    if (notes && notes.length > 1000) {
      errors.notes = 'Notes cannot exceed 1000 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');
    setSuccessInfo(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        appointmentDate,
        preferredTime: preferredTime || null,
        reason: reason.trim(),
        notes: notes.trim() || null
      };

      const response = await createAppointmentRequest(payload);

      // Display Honest Confirmation
      setSuccessInfo({
        id: response.id,
        status: response.statusDescription || 'Pending confirmation',
        date: response.appointmentDate,
        time: response.preferredTime
      });

      // Reset form fields
      setAppointmentDate('');
      setPreferredTime('');
      setReason('');
      setNotes('');
      setFieldErrors({});

      // Refresh appointments list
      await fetchAppointments();
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setFormError(err.message || 'Unable to submit appointment request. Please review your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <main className="patient-appointments-page" data-testid="patient-appointments-page">
      <div className="patient-appointments-container">

        {/* Hero Header */}
        <section className="patient-portal-hero" aria-labelledby="appointments-hero-title">
          <div className="patient-hero-left">
            <span className="patient-portal-kicker">
              <span className="patient-portal-kicker-dot" />
              DentCare Patient Portal
            </span>
            <h1 id="appointments-hero-title">My Appointments</h1>
            <p className="patient-portal-desc">
              Request a dental visit and review your appointment requests.
            </p>
            <div className="patient-hero-meta-row">
              <span className="patient-badge-portal">
                <span className="patient-badge-portal-dot" />
                Verified Patient Booking
              </span>
              <span className="patient-code-pill">
                Clinic: DentCare Dental Center
              </span>
            </div>
          </div>

          <div className="patient-hero-actions">
            <Link
              to="/patient/dashboard"
              className="patient-hero-btn patient-hero-btn-secondary"
              data-testid="back-to-dashboard-btn"
            >
              <ArrowLeftIcon />
              <span>Patient Dashboard</span>
            </Link>
          </div>
        </section>

        {/* Success Confirmation Banner */}
        {successInfo && (
          <div className="appointment-success-banner" role="status" data-testid="appointment-success-banner">
            <div className="appointment-success-icon" aria-hidden="true">
              <CheckCircleIcon />
            </div>
            <div className="appointment-success-content">
              <h3>Appointment request submitted</h3>
              <p>
                Your request has been received and is pending clinic confirmation.
                Our reception team will review your preferred date ({formatDisplayDate(successInfo.date)}) and confirm your visit.
              </p>
            </div>
            <button
              type="button"
              className="appointment-success-dismiss"
              onClick={() => setSuccessInfo(null)}
              aria-label="Dismiss success notice"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="patient-appointments-layout">

          {/* Booking Form Card */}
          <article className="appointment-form-card" data-testid="appointment-form-card">
            <div className="appointment-form-card-header">
              <h2>Request Appointment</h2>
              <p>Submit your preferred date and visit reason. All requests are confirmed directly by clinic staff.</p>
            </div>

            {formError && (
              <div className="appointment-form-alert" role="alert" data-testid="appointment-form-error">
                <AlertCircleIcon />
                <span>{formError}</span>
              </div>
            )}

            <form className="appointment-booking-form" onSubmit={handleBookingSubmit} noValidate>
              <div className="form-group-row">
                {/* Preferred Date */}
                <div className="appointment-form-group">
                  <label htmlFor="appointment-date">
                    Preferred Date <span className="appointment-required-star" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="appointment-date"
                    name="appointmentDate"
                    type="date"
                    min={todayStr}
                    value={appointmentDate}
                    onChange={(e) => {
                      setAppointmentDate(e.target.value);
                      if (fieldErrors.appointmentDate) {
                        setFieldErrors((prev) => ({ ...prev, appointmentDate: undefined }));
                      }
                    }}
                    className={`appointment-form-input ${fieldErrors.appointmentDate ? 'input-error' : ''}`}
                    required
                    aria-required="true"
                    data-testid="input-appointment-date"
                  />
                  {fieldErrors.appointmentDate && (
                    <span className="appointment-field-error" role="alert" data-testid="error-appointment-date">
                      {fieldErrors.appointmentDate}
                    </span>
                  )}
                </div>

                {/* Preferred Time */}
                <div className="appointment-form-group">
                  <label htmlFor="preferred-time">
                    Preferred Time <span className="appointment-input-hint">(Optional)</span>
                  </label>
                  <input
                    id="preferred-time"
                    name="preferredTime"
                    type="time"
                    value={preferredTime}
                    onChange={(e) => {
                      setPreferredTime(e.target.value);
                      if (fieldErrors.preferredTime) {
                        setFieldErrors((prev) => ({ ...prev, preferredTime: undefined }));
                      }
                    }}
                    className={`appointment-form-input ${fieldErrors.preferredTime ? 'input-error' : ''}`}
                    data-testid="input-preferred-time"
                  />
                  {fieldErrors.preferredTime && (
                    <span className="appointment-field-error" role="alert" data-testid="error-preferred-time">
                      {fieldErrors.preferredTime}
                    </span>
                  )}
                </div>
              </div>

              {/* Reason for Visit */}
              <div className="appointment-form-group">
                <label htmlFor="appointment-reason">
                  Reason for Visit <span className="appointment-required-star" aria-hidden="true">*</span>
                </label>
                <input
                  id="appointment-reason"
                  name="reason"
                  type="text"
                  maxLength={255}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (fieldErrors.reason) {
                      setFieldErrors((prev) => ({ ...prev, reason: undefined }));
                    }
                  }}
                  placeholder="e.g. Routine cleaning, tooth pain, checkup..."
                  className={`appointment-form-input ${fieldErrors.reason ? 'input-error' : ''}`}
                  required
                  aria-required="true"
                  data-testid="input-appointment-reason"
                />
                {fieldErrors.reason && (
                  <span className="appointment-field-error" role="alert" data-testid="error-appointment-reason">
                    {fieldErrors.reason}
                  </span>
                )}
              </div>

              {/* Notes */}
              <div className="appointment-form-group">
                <label htmlFor="appointment-notes">
                  Additional Notes <span className="appointment-input-hint">(Optional)</span>
                </label>
                <textarea
                  id="appointment-notes"
                  name="notes"
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (fieldErrors.notes) {
                      setFieldErrors((prev) => ({ ...prev, notes: undefined }));
                    }
                  }}
                  placeholder="Any symptoms, preferences, or notes for our dental team..."
                  rows={3}
                  className={`appointment-form-textarea ${fieldErrors.notes ? 'input-error' : ''}`}
                  data-testid="input-appointment-notes"
                />
                {fieldErrors.notes && (
                  <span className="appointment-field-error" role="alert" data-testid="error-appointment-notes">
                    {fieldErrors.notes}
                  </span>
                )}
              </div>

              {/* Submit Button with Duplicate Submit Prevention */}
              <button
                type="submit"
                className="appointment-submit-btn"
                disabled={isSubmitting}
                data-testid="submit-appointment-request-btn"
              >
                {isSubmitting ? (
                  <>
                    <span className="patient-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden="true" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>Submit Appointment Request</span>
                )}
              </button>
            </form>
          </article>

          {/* Appointments List Card */}
          <article className="appointment-list-card" data-testid="appointment-list-card">
            <div className="appointment-list-header">
              <h2>My Appointment Requests</h2>
              {!isLoading && (
                <span className="appointment-count-badge" data-testid="appointments-count-badge">
                  {appointments.length} {appointments.length === 1 ? 'Request' : 'Requests'}
                </span>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="patient-loading-shell" role="status" aria-live="polite" data-testid="appointments-loading">
                <div className="patient-spinner" aria-hidden="true" />
                <p>Loading your appointment records...</p>
              </div>
            )}

            {/* Load Error State */}
            {!isLoading && loadError && (
              <div className="patient-error-shell" role="region" aria-label="Appointment load error">
                <h2>Unable to load appointments</h2>
                <p>{loadError}</p>
                <button type="button" className="patient-hero-btn patient-hero-btn-primary" onClick={fetchAppointments}>
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !loadError && appointments.length === 0 && (
              <div className="appointments-empty-box" data-testid="appointments-empty-state">
                <div className="appointments-empty-icon" aria-hidden="true">
                  <CalendarIcon />
                </div>
                <h3 className="appointments-empty-title">You do not have any appointment requests yet.</h3>
                <p className="appointments-empty-desc">
                  Submit a request using the form to schedule a dental checkup, cleaning, or consultation.
                </p>
              </div>
            )}

            {/* List of Patient-Owned Appointments */}
            {!isLoading && !loadError && appointments.length > 0 && (
              <div className="appointment-cards-stack" data-testid="appointments-list">
                {appointments.map((item) => {
                  const isPending = item.status === 'PENDING';
                  const isConfirmed = item.status === 'CONFIRMED';
                  const isCancelled = item.status === 'CANCELLED';

                  let chipClass = 'status-chip-pending';
                  let displayStatus = item.statusDescription || 'Pending confirmation';
                  if (isConfirmed) {
                    chipClass = 'status-chip-confirmed';
                    displayStatus = 'Confirmed';
                  } else if (isCancelled) {
                    chipClass = 'status-chip-cancelled';
                    displayStatus = 'Cancelled';
                  }

                  return (
                    <div
                      key={item.id}
                      className="appointment-record-item"
                      data-testid={`appointment-record-${item.id}`}
                    >
                      <div className="appointment-item-top">
                        <div className="appointment-date-badge">
                          <span className="appointment-date-icon" aria-hidden="true"><CalendarIcon /></span>
                          <span>{formatDisplayDate(item.appointmentDate)}</span>
                          {item.preferredTime && (
                            <span className="appointment-time-tag">
                              {item.preferredTime}
                            </span>
                          )}
                        </div>

                        <span className={`appointment-status-chip ${chipClass}`} data-testid={`status-badge-${item.id}`}>
                          {displayStatus}
                        </span>
                      </div>

                      <div className="appointment-reason-row">
                        <p className="appointment-reason-title">{item.reason}</p>
                        {item.notes && (
                          <p className="appointment-item-notes">{item.notes}</p>
                        )}
                      </div>

                      <div className="appointment-item-meta">
                        <span>Request ID: #{item.id}</span>
                        {item.dentistName ? (
                          <span className="appointment-assigned-dentist" data-testid={`dentist-name-${item.id}`}>
                            <UserIcon /> {item.dentistName}
                          </span>
                        ) : (
                          <span className="appointment-unassigned">Dentist assigned upon confirmation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

        </div>

      </div>
    </main>
  );
}
