import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatientPrescriptions } from '../../patient/api/patientPortalApi';
import '../patient-dashboard.css';
import '../patient-prescriptions.css';

/* Accessible SVGs */
function PrescriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z" />
      <path d="M8.5 8.5l7 7" />
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronDownIcon({ isExpanded }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 180ms ease'
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function PatientPrescriptionsPage() {
  const { user } = useAuth();

  const [prescriptions, setPrescriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Expanded Detail State (tracks expanded prescription IDs)
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await getPatientPrescriptions();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message || 'Unable to load your prescriptions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Client-side bounded filtering
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // Search query (case-insensitive over medicine names, dentist name, notes, status)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesDentist = item.dentistName?.toLowerCase().includes(query);
        const matchesStatus = item.status?.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query);
        const matchesMedicine = item.items?.some((med) =>
          med.medicineName?.toLowerCase().includes(query) ||
          med.dosage?.toLowerCase().includes(query) ||
          med.instructions?.toLowerCase().includes(query)
        );

        if (!matchesDentist && !matchesStatus && !matchesNotes && !matchesMedicine) {
          return false;
        }
      }

      return true;
    });
  }, [prescriptions, statusFilter, searchQuery]);

  return (
    <main className="patient-prescriptions-page" data-testid="patient-prescriptions-page">
      <div className="patient-prescriptions-container">

        {/* Hero Header */}
        <section className="patient-portal-hero" aria-labelledby="prescriptions-hero-title">
          <div className="patient-hero-left">
            <span className="patient-portal-kicker">
              <span className="patient-portal-kicker-dot" />
              DentCare Patient Portal
            </span>
            <h1 id="prescriptions-hero-title">My Prescriptions</h1>
            <p className="patient-portal-desc">
              Review medications and verified prescriptions issued to you by DentCare clinicians.
            </p>
            <div className="patient-hero-meta-row">
              <span className="patient-badge-portal">
                <span className="patient-badge-portal-dot" />
                Verified Patient Prescriptions
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

        {/* Loading State */}
        {isLoading && (
          <div className="patient-loading-shell" role="status" aria-live="polite" data-testid="prescriptions-loading">
            <div className="patient-spinner" aria-hidden="true" />
            <p>Loading your prescription records...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && loadError && (
          <div className="patient-error-shell" role="region" aria-label="Prescription load error" data-testid="prescriptions-error-card">
            <h2>Unable to load prescriptions</h2>
            <p>{loadError}</p>
            <button
              type="button"
              className="patient-hero-btn patient-hero-btn-primary"
              onClick={fetchPrescriptions}
              data-testid="retry-prescriptions-btn"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !loadError && prescriptions.length === 0 && (
          <div className="prescriptions-empty-box" data-testid="prescriptions-empty-state">
            <div className="prescriptions-empty-icon" aria-hidden="true">
              <PrescriptionIcon />
            </div>
            <h3 className="prescriptions-empty-title">No prescriptions on file</h3>
            <p className="prescriptions-empty-desc">
              You do not have any prescriptions available in the patient portal yet.
            </p>
          </div>
        )}

        {/* Toolbar & Prescriptions List */}
        {!isLoading && !loadError && prescriptions.length > 0 && (
          <>
            {/* Search & Filter Toolbar */}
            <div className="prescriptions-toolbar-card" data-testid="prescriptions-toolbar">
              <div className="prescriptions-toolbar-left">
                <div className="prescriptions-search-wrapper">
                  <span className="prescriptions-search-icon" aria-hidden="true">
                    <SearchIcon />
                  </span>
                  <input
                    type="search"
                    className="prescriptions-search-input"
                    placeholder="Search by medicine, dentist, or status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search prescriptions"
                    data-testid="prescriptions-search-input"
                  />
                </div>

                <select
                  className="prescriptions-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter prescriptions by status"
                  data-testid="prescriptions-status-filter"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="FINALIZED">Finalized</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              <span className="prescriptions-count-badge" data-testid="prescriptions-count-badge">
                {filteredPrescriptions.length} {filteredPrescriptions.length === 1 ? 'Prescription' : 'Prescriptions'}
              </span>
            </div>

            {/* Filtered Empty State */}
            {filteredPrescriptions.length === 0 ? (
              <div className="prescriptions-empty-box" data-testid="prescriptions-search-empty">
                <h3 className="prescriptions-empty-title">No matching prescriptions</h3>
                <p className="prescriptions-empty-desc">
                  No prescriptions matched your search or status filter. Try clearing your filters.
                </p>
                <button
                  type="button"
                  className="patient-hero-btn patient-hero-btn-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="prescriptions-stack" data-testid="prescriptions-list">
                {filteredPrescriptions.map((item) => {
                  const isFinalized = item.status === 'FINALIZED';
                  const isDraft = item.status === 'DRAFT';
                  const isExpanded = expandedIds.has(item.id);

                  let chipClass = 'status-chip-neutral';
                  let statusLabel = item.status || 'Unknown';
                  if (isFinalized) {
                    chipClass = 'status-chip-finalized';
                    statusLabel = 'Finalized';
                  } else if (isDraft) {
                    chipClass = 'status-chip-draft';
                    statusLabel = 'Draft';
                  }

                  const formattedIssuedDate = formatDate(item.createdAt);
                  const formattedFinalizedDate = formatDate(item.finalizedAt);

                  return (
                    <article
                      key={item.id}
                      className="prescription-record-card"
                      data-testid={`prescription-card-${item.id}`}
                    >
                      {/* Header */}
                      <div className="prescription-card-header">
                        <div className="prescription-title-group">
                          <span className="prescription-id-tag">Prescription #{item.id}</span>
                          {formattedIssuedDate && (
                            <span className="prescription-date-tag">
                              Issued: {formattedIssuedDate}
                            </span>
                          )}
                        </div>

                        <span
                          className={`prescription-status-chip ${chipClass}`}
                          data-testid={`status-badge-${item.id}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Clinician & Dates Meta */}
                      <div className="prescription-card-meta">
                        {item.dentistName && (
                          <span className="prescription-dentist-tag" data-testid={`dentist-name-${item.id}`}>
                            <UserIcon />
                            <span>Prescribed by {item.dentistName}</span>
                          </span>
                        )}

                        {formattedFinalizedDate && (
                          <span className="prescription-finalized-tag">
                            <CalendarIcon />
                            <span>Finalized: {formattedFinalizedDate}</span>
                          </span>
                        )}
                      </div>

                      {/* General Notes (if present) */}
                      {item.notes && (
                        <div className="prescription-notes-box" data-testid={`prescription-notes-${item.id}`}>
                          <span className="prescription-notes-label">Clinician Notes</span>
                          <p className="prescription-notes-text">{item.notes}</p>
                        </div>
                      )}

                      {/* Prescribed Medications */}
                      <div className="prescription-medications-section">
                        <h2 className="prescription-section-title">
                          <PrescriptionIcon />
                          <span>Prescribed Medications ({item.items?.length || 0})</span>
                        </h2>

                        <div className="prescription-medications-list" data-testid={`medications-list-${item.id}`}>
                          {item.items && item.items.length > 0 ? (
                            item.items.map((med, idx) => (
                              <div
                                key={med.id || idx}
                                className="medication-item-row"
                                data-testid={`medication-item-${med.id || idx}`}
                              >
                                <div className="medication-top-line">
                                  <span className="medication-name" data-testid={`medicine-name-${med.id || idx}`}>
                                    {med.medicineName}
                                  </span>
                                  <div className="medication-specs-pills">
                                    {med.dosage && (
                                      <span className="medication-pill" data-testid={`medication-dosage-${med.id || idx}`}>
                                        {med.dosage}
                                      </span>
                                    )}
                                    {med.frequency && (
                                      <span className="medication-pill" data-testid={`medication-frequency-${med.id || idx}`}>
                                        {med.frequency}
                                      </span>
                                    )}
                                    {med.duration && (
                                      <span className="medication-pill" data-testid={`medication-duration-${med.id || idx}`}>
                                        {med.duration}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {med.instructions && (
                                  <p
                                    className="medication-instructions"
                                    data-testid={`medication-instructions-${med.id || idx}`}
                                  >
                                    <strong>Instructions:</strong> {med.instructions}
                                  </p>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="prescription-notes-text">No medication line-items recorded.</p>
                          )}
                        </div>
                      </div>

                      {/* Expandable Detail Section */}
                      {isExpanded && (
                        <div
                          id={`prescription-details-${item.id}`}
                          className="prescription-details-panel"
                          data-testid={`prescription-details-${item.id}`}
                        >
                          <div className="prescription-detail-grid">
                            <div className="prescription-detail-cell">
                              <span className="prescription-detail-cell-label">Prescription ID</span>
                              <span className="prescription-detail-cell-value">#{item.id}</span>
                            </div>
                            <div className="prescription-detail-cell">
                              <span className="prescription-detail-cell-label">Status</span>
                              <span className="prescription-detail-cell-value">{statusLabel}</span>
                            </div>
                            <div className="prescription-detail-cell">
                              <span className="prescription-detail-cell-label">Prescriber</span>
                              <span className="prescription-detail-cell-value">{item.dentistName || 'DentCare Clinical Team'}</span>
                            </div>
                            <div className="prescription-detail-cell">
                              <span className="prescription-detail-cell-label">Issue Date</span>
                              <span className="prescription-detail-cell-value">{formattedIssuedDate || 'Recorded on file'}</span>
                            </div>
                            {formattedFinalizedDate && (
                              <div className="prescription-detail-cell">
                                <span className="prescription-detail-cell-label">Finalized Date</span>
                                <span className="prescription-detail-cell-value">{formattedFinalizedDate}</span>
                              </div>
                            )}
                            <div className="prescription-detail-cell">
                              <span className="prescription-detail-cell-label">Total Medications</span>
                              <span className="prescription-detail-cell-value">{item.items?.length || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Toggle Details Action */}
                      <button
                        type="button"
                        className="prescription-toggle-btn"
                        onClick={() => toggleExpand(item.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`prescription-details-${item.id}`}
                        data-testid={`toggle-details-btn-${item.id}`}
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Full Details'}</span>
                        <ChevronDownIcon isExpanded={isExpanded} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
