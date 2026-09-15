import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getExaminationById, confirmDiagnosis } from '../api/examinationApi';
import { listToothFindingsByExamination, addToothFinding, updateToothFinding } from '../api/toothFindingApi';
import { useAuth } from '../../auth/context/AuthContext';
import ExaminationStatusBadge from '../components/ExaminationStatusBadge';
import ToothFindingsTable from '../components/ToothFindingsTable';
import ToothFindingForm from '../components/ToothFindingForm';
import '../clinical.css';

/**
 * Format ISO datetime string readably.
 */
function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * ExaminationDetailPage displays clinical examination records, tooth findings,
 * and allows licensed dentists to confirm the diagnosis.
 */
export default function ExaminationDetailPage() {
  const { id } = useParams();

  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user || null;
  } catch {
    authUser = null;
  }

  const [examination, setExamination] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [successMessage, setSuccessMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Finding form state
  const [showAddFinding, setShowAddFinding] = useState(false);
  const [editingFinding, setEditingFinding] = useState(null);
  const [findingSubmitting, setFindingSubmitting] = useState(false);
  const [findingError, setFindingError] = useState('');

  // Diagnosis confirmation state
  const [confirmedDiagnosisInput, setConfirmedDiagnosisInput] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    try {
      const [examData, findingsData] = await Promise.all([
        getExaminationById(id),
        listToothFindingsByExamination(id)
      ]);
      setExamination(examData);
      setFindings(Array.isArray(findingsData) ? findingsData : []);
      if (examData?.confirmedDiagnosis) {
        setConfirmedDiagnosisInput(examData.confirmedDiagnosis);
      }
    } catch (err) {
      if (err?.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(err?.message || 'Failed to load examination details.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const refreshFindings = async () => {
    try {
      const findingsData = await listToothFindingsByExamination(id);
      setFindings(Array.isArray(findingsData) ? findingsData : []);
    } catch (err) {
      setActionError(err.message || 'Failed to refresh tooth findings.');
    }
  };

  const handleAddFindingSubmit = async (payload) => {
    setFindingSubmitting(true);
    setFindingError('');
    setActionError(null);
    try {
      await addToothFinding(id, payload);
      setSuccessMessage('Tooth finding recorded successfully.');
      setShowAddFinding(false);
      await refreshFindings();
    } catch (err) {
      setFindingError(err.message || 'Failed to record tooth finding.');
    } finally {
      setFindingSubmitting(false);
    }
  };

  const handleEditFindingSubmit = async (payload) => {
    if (!editingFinding) return;
    setFindingSubmitting(true);
    setFindingError('');
    setActionError(null);
    try {
      await updateToothFinding(editingFinding.id, payload);
      setSuccessMessage('Tooth finding updated successfully.');
      setEditingFinding(null);
      await refreshFindings();
    } catch (err) {
      setFindingError(err.message || 'Failed to update tooth finding.');
    } finally {
      setFindingSubmitting(false);
    }
  };

  const handleConfirmDiagnosis = async (e) => {
    e.preventDefault();
    if (!confirmedDiagnosisInput.trim()) {
      setConfirmError('Confirmed diagnosis is required');
      return;
    }
    if (!authUser?.id) {
      setConfirmError('User identity could not be verified.');
      return;
    }

    setConfirmSubmitting(true);
    setConfirmError('');
    setActionError(null);
    try {
      const updated = await confirmDiagnosis(id, {
        dentistId: authUser.id,
        confirmedDiagnosis: confirmedDiagnosisInput.trim()
      });
      setExamination(updated);
      setSuccessMessage('Clinical diagnosis confirmed successfully.');
    } catch (err) {
      setConfirmError(err.message || 'Failed to confirm diagnosis.');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const isDentist = authUser?.role === 'DENTIST';

  return (
    <div className="clinical-container" data-testid="examination-detail-placeholder">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to={examination ? `/clinical/examinations?patientId=${examination.patientId}` : '/clinical/examinations'}>
          ← Back to Examinations
        </Link>
      </nav>

      <div className="clinical-header">
        <div>
          <h1>Examination #{id}</h1>
          {examination && (
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
              Patient ID: {examination.patientId} | Date: {examination.examinationDate || '—'}
            </p>
          )}
        </div>
        {examination && (
          <div>
            <ExaminationStatusBadge status={examination.status} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state" role="status">
          Loading examination #{id}...
        </div>
      ) : notFound ? (
        <div className="empty-state" role="alert">
          <h2>Examination Not Found</h2>
          <p>The requested clinical examination #{id} does not exist or has been removed.</p>
          <Link to="/clinical/examinations" className="btn btn-primary">
            Return to Examinations
          </Link>
        </div>
      ) : loadError ? (
        <div className="error-alert" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchDetails}>
            Retry
          </button>
        </div>
      ) : !examination ? null : (
        <>
          {successMessage && (
            <div className="success-alert" role="status">
              <p>{successMessage}</p>
            </div>
          )}

          {actionError && (
            <div className="error-alert" role="alert">
              <p>{actionError}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActionError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

      {/* Examination Master Details */}
      <div className="detail-card">
        <h2>Clinical Assessment</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Patient ID</span>
            <span className="detail-value">{examination.patientId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Dentist ID</span>
            <span className="detail-value">{examination.dentistId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Examination Date</span>
            <span className="detail-value">{examination.examinationDate || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Recorded By User ID</span>
            <span className="detail-value">{examination.recordedByUserId}</span>
          </div>
          {examination.appointmentId && (
            <div className="detail-item">
              <span className="detail-label">Appointment ID</span>
              <span className="detail-value">{examination.appointmentId}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <ExaminationStatusBadge status={examination.status} />
            </span>
          </div>
          <div className="detail-item full-width">
            <span className="detail-label">Chief Complaint</span>
            <span className="detail-value">{examination.chiefComplaint}</span>
          </div>
          <div className="detail-item full-width">
            <span className="detail-label">Clinical Observations</span>
            <span className="detail-value">{examination.clinicalObservations || 'None recorded'}</span>
          </div>
          <div className="detail-item full-width">
            <span className="detail-label">Provisional Diagnosis</span>
            <span className="detail-value">{examination.provisionalDiagnosis || 'None recorded'}</span>
          </div>
          {examination.confirmedDiagnosis && (
            <div className="detail-item full-width confirmed-diagnosis-box">
              <span className="detail-label">Confirmed Diagnosis</span>
              <span className="detail-value highlight-diagnosis">{examination.confirmedDiagnosis}</span>
              {examination.confirmedByDentistId && (
                <span className="detail-subtext">
                  Confirmed by Dentist #{examination.confirmedByDentistId} on {formatDateTime(examination.diagnosisConfirmedAt)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dentist-Only Confirm Diagnosis Section */}
      {isDentist && (
        <div className="detail-card confirm-diagnosis-card" aria-label="Dentist diagnosis confirmation section">
          <h2>Confirm Diagnosis (Licensed Dentist Only)</h2>
          <p className="form-help">
            Authoritatively confirm the clinical diagnosis for this examination. This action updates
            the examination status and certifies the clinical evaluation.
          </p>

          {confirmError && (
            <div className="error-alert" role="alert">
              <p>{confirmError}</p>
            </div>
          )}

          <form onSubmit={handleConfirmDiagnosis} noValidate>
            <div className="form-group">
              <label htmlFor="confirmedDiagnosis">
                Confirmed Diagnosis <span className="required-star">*</span>
              </label>
              <textarea
                id="confirmedDiagnosis"
                name="confirmedDiagnosis"
                rows="3"
                maxLength={500}
                className="form-textarea"
                placeholder="Enter authoritative confirmed clinical diagnosis..."
                value={confirmedDiagnosisInput}
                onChange={(e) => setConfirmedDiagnosisInput(e.target.value)}
                disabled={confirmSubmitting}
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={confirmSubmitting || !confirmedDiagnosisInput.trim()}
              >
                {confirmSubmitting ? 'Confirming...' : 'Confirm Diagnosis'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tooth and Oral Findings Section */}
      <div className="detail-card">
        <div className="section-header">
          <h2>Tooth & Oral Findings</h2>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowAddFinding((prev) => !prev);
              setEditingFinding(null);
              setFindingError('');
            }}
          >
            {showAddFinding ? 'Cancel Finding' : 'Add Tooth Finding'}
          </button>
        </div>

        {showAddFinding && (
          <div className="finding-form-panel">
            <h3>Record Tooth / General Oral Finding</h3>
            <ToothFindingForm
              initialValues={{ recordedByUserId: authUser?.id || '' }}
              onSubmit={handleAddFindingSubmit}
              submitting={findingSubmitting}
              serverError={findingError}
              submitLabel="Save Finding"
              onCancel={() => setShowAddFinding(false)}
            />
          </div>
        )}

        {editingFinding && (
          <div className="finding-form-panel">
            <h3>Edit Finding #{editingFinding.id}</h3>
            <ToothFindingForm
              initialValues={editingFinding}
              onSubmit={handleEditFindingSubmit}
              submitting={findingSubmitting}
              serverError={findingError}
              submitLabel="Update Finding"
              onCancel={() => setEditingFinding(null)}
            />
          </div>
        )}

        <ToothFindingsTable
          findings={findings}
          onEdit={(findingId) => {
            const found = findings.find((f) => f.id === findingId);
            if (found) {
              setEditingFinding(found);
              setShowAddFinding(false);
              setFindingError('');
            }
          }}
        />
      </div>
      </>
    )}
  </div>
);
}
