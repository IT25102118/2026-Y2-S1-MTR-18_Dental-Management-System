import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatientDashboard } from '../../patient/api/patientPortalApi';
import '../patient-dashboard.css';

/* Accessible SVGs */
function ToothIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 6 3 10 .8 2.2 2 4 3 4s2.2-1.8 3-4c1.5-4 3-6.5 3-10 0-3.5-2.5-6-6-6z" />
      <path d="M9 10c1-1 2-1.5 3-1.5s2 .5 3 1.5" />
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

function PrescriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

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

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6" />
      <path d="M16 12H8" />
      <path d="M10 16H8" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
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

export default function PatientDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const fetchDashboard = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await getPatientDashboard();
      setSummaryData(data);
    } catch (err) {
      setLoadError(err.message || 'Unable to load your patient dashboard summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setLogoutError('We could not sign you out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  const patient = summaryData?.patient || {};
  const clinicalStatus = summaryData?.clinicalStatus || {};
  const prescriptionsSummary = summaryData?.prescriptionsSummary || { totalCount: 0, recentPrescriptions: [] };

  const firstName = patient.firstName || user?.firstName || 'Patient';
  const lastName = patient.lastName || user?.lastName || '';
  const email = patient.email || user?.email || '';
  const phone = patient.phone || user?.phone || 'None provided';
  const patientCode = patient.patientCode || clinicalStatus.patientCode || null;
  const isProfileLinked = Boolean(patient.hasClinicalProfile || clinicalStatus.profileLinked);

  return (
    <main className="patient-portal-page" data-testid="patient-dashboard">
      <div className="patient-portal-container">

        {/* Access Denied Notice if redirected from Staff Route */}
        {location.state?.accessDenied && (
          <div className="patient-access-notice" role="alert" data-testid="patient-access-denied-notice">
            <span className="patient-access-notice-icon"><AlertCircleIcon /></span>
            <span>That page is reserved for authorized clinic staff. You have been returned to your patient dashboard.</span>
          </div>
        )}

        {logoutError && (
          <div className="patient-access-notice" role="status">
            <span className="patient-access-notice-icon"><AlertCircleIcon /></span>
            <span>{logoutError}</span>
          </div>
        )}

        {/* Hero Section */}
        <section className="patient-portal-hero" aria-labelledby="patient-greeting-title">
          <div className="patient-hero-left">
            <span className="patient-portal-kicker">
              <span className="patient-portal-kicker-dot" />
              DentCare Patient Portal
            </span>
            <h1 id="patient-greeting-title">Welcome, {firstName}.</h1>
            <p className="patient-portal-desc">
              Your personal DentCare portal for verified treatment records, prescriptions, and secure profile management.
            </p>
            <div className="patient-hero-meta-row">
              <span className="patient-badge-portal" data-testid="patient-role-pill">
                <span className="patient-badge-portal-dot" />
                Verified Patient Account
              </span>
              <span className="patient-code-pill" data-testid="patient-code-pill">
                {patientCode ? `Patient ID: ${patientCode}` : 'Clinical Intake: Pending'}
              </span>
            </div>
          </div>

          <div className="patient-hero-actions">
            <Link to="/account" className="patient-hero-btn patient-hero-btn-primary" data-testid="portal-profile-cta">
              <UserIcon />
              <span>My Account</span>
            </Link>
            <button
              type="button"
              className="patient-hero-btn patient-hero-btn-secondary"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="patient-logout-btn"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="patient-loading-shell" role="status" aria-live="polite" data-testid="portal-loading">
            <div className="patient-spinner" aria-hidden="true" />
            <p>Loading your patient records...</p>
          </div>
        )}

        {/* Load Error State */}
        {!isLoading && loadError && (
          <div className="patient-error-shell" role="region" aria-label="Dashboard error" data-testid="portal-error-card">
            <h2>Unable to load dashboard records</h2>
            <p>{loadError}</p>
            <button type="button" className="patient-hero-btn patient-hero-btn-primary" onClick={fetchDashboard}>
              Try Again
            </button>
          </div>
        )}

        {/* Portal Cards Grid */}
        {!isLoading && !loadError && (
          <section className="patient-portal-grid" aria-label="Patient Portal Services">

            {/* Card 1: My Profile */}
            <article className="patient-portal-card" data-testid="patient-card-profile">
              <div className="patient-card-header">
                <div className="patient-card-icon-wrap" aria-hidden="true">
                  <UserIcon />
                </div>
                <span className="patient-card-status-chip status-chip-available">Active</span>
              </div>
              <div className="patient-card-title-wrap">
                <span className="patient-card-kicker">Account Security</span>
                <h2>Personal Care Profile</h2>
              </div>
              <div className="patient-card-body">
                <p className="patient-card-desc">
                  Your registered patient contact details and credentials held securely on file.
                </p>
                <div className="patient-detail-list">
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Name</span>
                    <span className="patient-detail-value" data-testid="patient-display-name">{firstName} {lastName}</span>
                  </div>
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Email</span>
                    <span className="patient-detail-value" data-testid="patient-display-email">{email}</span>
                  </div>
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Phone</span>
                    <span className="patient-detail-value" data-testid="patient-display-phone">{phone}</span>
                  </div>
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Role</span>
                    <span className="patient-detail-value">PATIENT</span>
                  </div>
                </div>
              </div>
              <div className="patient-card-footer">
                <Link to="/account" className="patient-card-link">
                  Manage Account & Security <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            {/* Card 2: Clinical File Status */}
            <article className="patient-portal-card" data-testid="patient-card-clinical">
              <div className="patient-card-header">
                <div className="patient-card-icon-wrap" aria-hidden="true">
                  <ToothIcon />
                </div>
                <span className={`patient-card-status-chip ${isProfileLinked ? 'status-chip-available' : 'status-chip-pending'}`}>
                  {isProfileLinked ? 'Record Active' : 'Intake Pending'}
                </span>
              </div>
              <div className="patient-card-title-wrap">
                <span className="patient-card-kicker">Clinical Care Record</span>
                <h2>Practice Health Record</h2>
              </div>
              <div className="patient-card-body">
                <p className="patient-card-desc">
                  {clinicalStatus.message || 'Your health records are managed by licensed DentCare clinicians.'}
                </p>
                <div className="patient-detail-list">
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">File Reference</span>
                    <span className="patient-detail-value">{patientCode || 'Assigned during clinic intake'}</span>
                  </div>
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Intake Status</span>
                    <span className="patient-detail-value">{clinicalStatus.intakeStatus || 'PENDING_CLINICAL_INTAKE'}</span>
                  </div>
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Primary Clinic</span>
                    <span className="patient-detail-value">DentCare Dental Center</span>
                  </div>
                </div>
              </div>
              <div className="patient-card-footer">
                <span className="patient-card-desc">
                  Clinical records are accessible exclusively during and following licensed consultations.
                </span>
              </div>
            </article>

            {/* Card 3: My Prescriptions */}
            <article className="patient-portal-card" data-testid="patient-card-prescriptions">
              <div className="patient-card-header">
                <div className="patient-card-icon-wrap" aria-hidden="true">
                  <PrescriptionIcon />
                </div>
                <span className="patient-card-status-chip status-chip-available">
                  {prescriptionsSummary.totalCount} On File
                </span>
              </div>
              <div className="patient-card-title-wrap">
                <span className="patient-card-kicker">Medication Management</span>
                <h2>My Prescriptions</h2>
              </div>
              <div className="patient-card-body">
                {prescriptionsSummary.totalCount === 0 ? (
                  <div className="patient-empty-state" data-testid="prescriptions-empty-state">
                    <span className="patient-empty-state-icon"><PrescriptionIcon /></span>
                    <p className="patient-empty-state-text">
                      No active prescriptions on file. Any dental medications prescribed during your visits will be listed here with dosage instructions.
                    </p>
                  </div>
                ) : (
                  <div className="patient-prescriptions-list" data-testid="prescriptions-list">
                    {prescriptionsSummary.recentPrescriptions?.map((item) => (
                      <div key={item.id} className="patient-prescription-item">
                        <div className="prescription-item-top">
                          <span>Prescription #{item.id}</span>
                          <span className="prescription-item-dentist">{item.dentistName}</span>
                        </div>
                        {item.items && item.items.length > 0 && (
                          <div className="prescription-medicines">
                            {item.items.map((med, idx) => (
                              <div key={idx}>
                                <strong>{med.medicineName}</strong> {med.dosage} — {med.frequency} ({med.duration})
                              </div>
                            ))}
                          </div>
                        )}
                        {item.notes && <p className="patient-card-desc">{item.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="patient-card-footer">
                <span className="patient-card-desc">
                  Prescriptions are verified directly from authorized dentist consultations.
                </span>
              </div>
            </article>

            {/* Card 4: Appointments (Available) */}
            <article className="patient-portal-card" data-testid="patient-card-appointments">
              <div className="patient-card-header">
                <div className="patient-card-icon-wrap" aria-hidden="true">
                  <CalendarIcon />
                </div>
                <span className="patient-card-status-chip status-chip-available">Available</span>
              </div>
              <div className="patient-card-title-wrap">
                <span className="patient-card-kicker">Visit Scheduling</span>
                <h2>Appointments & Visits</h2>
              </div>
              <div className="patient-card-body">
                <p className="patient-card-desc">
                  Request dental appointments online and review the status of your clinic visit requests.
                </p>
                <div className="patient-detail-list">
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Service</span>
                    <span className="patient-detail-value">Visit Requests</span>
                  </div>
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Initial Status</span>
                    <span className="patient-detail-value">Pending confirmation</span>
                  </div>
                  <div className="patient-detail-row">
                    <span className="patient-detail-label">Clinic</span>
                    <span className="patient-detail-value">DentCare Dental Center</span>
                  </div>
                </div>
              </div>
              <div className="patient-card-footer">
                <Link to="/patient/appointments" className="patient-card-link" data-testid="dashboard-appointments-link">
                  My Appointments <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            {/* Card 5: Invoices & Payments (Honest status - Coming Soon) */}
            <article className="patient-portal-card" data-testid="patient-card-billing">
              <div className="patient-card-header">
                <div className="patient-card-icon-wrap" aria-hidden="true">
                  <ReceiptIcon />
                </div>
                <span className="patient-card-status-chip status-chip-soon">Coming Soon</span>
              </div>
              <div className="patient-card-title-wrap">
                <span className="patient-card-kicker">Billing Records</span>
                <h2>Statements & Invoices</h2>
              </div>
              <div className="patient-card-body">
                <p className="patient-card-desc">
                  Patient billing statements are not yet available in the portal.
                </p>
                <div className="patient-feature-notice">
                  <p>Please contact clinic reception regarding treatment invoices, payment receipts, or billing and statement questions.</p>
                </div>
              </div>
              <div className="patient-card-footer">
                <span className="patient-card-desc">Direct digital payments will launch in an upcoming release.</span>
              </div>
            </article>

          </section>
        )}

        {/* Portal Footer Notice */}
        <footer className="patient-portal-footer" aria-label="Portal Security Assurance">
          <div className="patient-footer-security">
            <ShieldCheckIcon />
            <p>
              Your DentCare patient account is protected with encrypted sessions and role-isolated access.
            </p>
          </div>
          <div>
            Need assistance? Please speak with clinic reception.
          </div>
        </footer>

      </div>
    </main>
  );
}
