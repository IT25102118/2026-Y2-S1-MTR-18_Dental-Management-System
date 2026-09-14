import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getTreatmentPlanById,
  approveTreatmentPlan,
  startTreatmentPlan,
  completeTreatmentPlan,
  cancelTreatmentPlan,
  setFollowUpDate
} from '../api/treatmentPlanApi';
import {
  listProceduresByPlan,
  addTreatmentProcedure,
  updateTreatmentProcedure,
  completeTreatmentProcedure
} from '../api/treatmentProcedureApi';
import { useAuth } from '../../auth/context/AuthContext';
import TreatmentPlanStatusBadge from '../components/TreatmentPlanStatusBadge';
import ProceduresTable from '../components/ProceduresTable';
import ProcedureForm from '../components/ProcedureForm';
import '../clinical.css';

/**
 * Safely format currency amounts.
 */
function formatCost(cost) {
  if (cost === undefined || cost === null || cost === '') return '—';
  const num = Number(cost);
  if (isNaN(num)) return String(cost);
  return `$${num.toFixed(2)}`;
}

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
 * TreatmentPlanDetailPage displays treatment plan specifications, associated procedures,
 * and dentist-gated lifecycle controls (approve, start, complete, cancel, follow-up).
 */
export default function TreatmentPlanDetailPage() {
  const { id } = useParams();

  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user || null;
  } catch {
    authUser = null;
  }

  const [plan, setPlan] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [successMessage, setSuccessMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);

  // Procedure form state
  const [procedureModalMode, setProcedureModalMode] = useState(null); // 'add' | 'edit' | 'complete' | null
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [procedureSubmitting, setProcedureSubmitting] = useState(false);
  const [procedureError, setProcedureError] = useState('');

  // Cancel dialog state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Follow-up dialog state
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpDate, setFollowUpDateInput] = useState('');
  const [followUpNotes, setFollowUpNotesInput] = useState('');
  const [followUpError, setFollowUpError] = useState('');

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    try {
      const [planData, proceduresData] = await Promise.all([
        getTreatmentPlanById(id),
        listProceduresByPlan(id)
      ]);
      setPlan(planData);
      setProcedures(Array.isArray(proceduresData) ? proceduresData : []);
    } catch (err) {
      if (err?.status === 404) {
        setNotFound(true);
      } else {
        setLoadError(err?.message || 'Failed to load treatment plan details.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const refreshProcedures = async () => {
    try {
      const procs = await listProceduresByPlan(id);
      setProcedures(Array.isArray(procs) ? procs : []);
    } catch (err) {
      setActionError(err.message || 'Failed to refresh procedures.');
    }
  };

  const isDentist = authUser?.role === 'DENTIST';

  // Lifecycle action handlers (Dentist-only)
  const handleApprove = async () => {
    if (!authUser?.id) return;
    setLifecycleSubmitting(true);
    setActionError(null);
    try {
      const updated = await approveTreatmentPlan(id, { dentistId: authUser.id });
      setPlan(updated);
      setSuccessMessage('Treatment plan approved successfully.');
    } catch (err) {
      setActionError(err.message || 'Failed to approve treatment plan.');
    } finally {
      setLifecycleSubmitting(false);
    }
  };

  const handleStart = async () => {
    if (!authUser?.id) return;
    setLifecycleSubmitting(true);
    setActionError(null);
    try {
      const updated = await startTreatmentPlan(id, authUser.id);
      setPlan(updated);
      setSuccessMessage('Treatment plan marked as In Progress.');
    } catch (err) {
      setActionError(err.message || 'Failed to start treatment plan.');
    } finally {
      setLifecycleSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!authUser?.id) return;
    setLifecycleSubmitting(true);
    setActionError(null);
    try {
      const updated = await completeTreatmentPlan(id, authUser.id);
      setPlan(updated);
      setSuccessMessage('Treatment plan completed successfully.');
    } catch (err) {
      setActionError(err.message || 'Failed to complete treatment plan.');
    } finally {
      setLifecycleSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellationReason.trim()) {
      setCancelError('Cancellation reason is required');
      return;
    }
    if (!authUser?.id) return;

    setLifecycleSubmitting(true);
    setCancelError('');
    try {
      const updated = await cancelTreatmentPlan(id, {
        dentistId: authUser.id,
        cancellationReason: cancellationReason.trim()
      });
      setPlan(updated);
      setSuccessMessage('Treatment plan cancelled.');
      setShowCancelForm(false);
      setCancellationReason('');
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel treatment plan.');
    } finally {
      setLifecycleSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    if (!followUpDate.trim()) {
      setFollowUpError('Follow-up date is required');
      return;
    }
    if (!authUser?.id) return;

    setLifecycleSubmitting(true);
    setFollowUpError('');
    try {
      await setFollowUpDate(id, {
        followUpDate: followUpDate.trim(),
        dentistId: authUser.id,
        clinicalNotes: followUpNotes.trim() || null,
        notes: followUpNotes.trim() || null
      });
      setSuccessMessage('Follow-up scheduled successfully.');
      setShowFollowUpForm(false);
      setFollowUpDateInput('');
      setFollowUpNotesInput('');
      await fetchDetails();
    } catch (err) {
      setFollowUpError(err.message || 'Failed to schedule follow-up.');
    } finally {
      setLifecycleSubmitting(false);
    }
  };

  // Procedure action handlers
  const handleProcedureSubmit = async (payload) => {
    setProcedureSubmitting(true);
    setProcedureError('');
    setActionError(null);

    try {
      if (procedureModalMode === 'add') {
        await addTreatmentProcedure(id, payload);
        setSuccessMessage('Procedure added successfully.');
      } else if (procedureModalMode === 'edit') {
        await updateTreatmentProcedure(selectedProcedure.id, payload);
        setSuccessMessage('Procedure updated successfully.');
      } else if (procedureModalMode === 'complete') {
        await completeTreatmentProcedure(selectedProcedure.id, payload);
        setSuccessMessage('Procedure completed successfully.');
      }
      setProcedureModalMode(null);
      setSelectedProcedure(null);
      await Promise.all([fetchDetails(), refreshProcedures()]);
    } catch (err) {
      setProcedureError(err.message || 'Procedure operation failed.');
    } finally {
      setProcedureSubmitting(false);
    }
  };

  return (
    <div className="clinical-container" data-testid="treatment-plan-detail-placeholder">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to={plan ? `/clinical/treatment-plans?patientId=${plan.patientId}` : '/clinical/treatment-plans'}>
          ← Back to Treatment Plans
        </Link>
      </nav>

      <div className="clinical-header">
        <div>
          <h1>Treatment Plan #{id}</h1>
          {plan && (
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
              {plan.planName || plan.title} | Patient ID: {plan.patientId}
            </p>
          )}
        </div>
        {plan && (
          <div>
            <TreatmentPlanStatusBadge status={plan.status} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state" role="status">
          Loading treatment plan #{id}...
        </div>
      ) : notFound ? (
        <div className="empty-state" role="alert">
          <h2>Treatment Plan Not Found</h2>
          <p>The requested treatment plan #{id} does not exist or has been removed.</p>
          <Link to="/clinical/treatment-plans" className="btn btn-primary">
            Return to Treatment Plans
          </Link>
        </div>
      ) : loadError ? (
        <div className="error-alert" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchDetails}>
            Retry
          </button>
        </div>
      ) : !plan ? null : (
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

          {/* Plan Specifications */}
          <div className="detail-card">
            <h2>Plan Specifications</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Title</span>
                <span className="detail-value">{plan.planName || plan.title}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Patient ID</span>
                <span className="detail-value">{plan.patientId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dentist ID</span>
                <span className="detail-value">{plan.dentistId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  <TreatmentPlanStatusBadge status={plan.status} />
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Estimated Cost</span>
                <span className="detail-value">{formatCost(plan.totalEstimatedCost ?? plan.estimatedCost)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Actual Cost</span>
                <span className="detail-value">{formatCost(plan.totalActualCost ?? plan.actualCost)}</span>
              </div>
              {plan.examinationId && (
                <div className="detail-item">
                  <span className="detail-label">Associated Examination</span>
                  <span className="detail-value">
                    <Link to={`/clinical/examinations/${plan.examinationId}`}>
                      Examination #{plan.examinationId}
                    </Link>
                  </span>
                </div>
              )}
              {plan.approvedByDentistId && (
                <div className="detail-item">
                  <span className="detail-label">Approved By</span>
                  <span className="detail-value">
                    Dentist #{plan.approvedByDentistId} on {formatDateTime(plan.approvedAt)}
                  </span>
                </div>
              )}
              {plan.cancellationReason && (
                <div className="detail-item full-width error-alert">
                  <span className="detail-label" style={{ color: '#991b1b' }}>Cancellation Reason</span>
                  <span className="detail-value">{plan.cancellationReason}</span>
                </div>
              )}
              <div className="detail-item full-width">
                <span className="detail-label">Clinical Notes</span>
                <span className="detail-value">{plan.clinicalNotes || 'None recorded'}</span>
              </div>
            </div>
          </div>

          {/* Dentist-Only Lifecycle Actions Section */}
          {isDentist && (
            <div className="detail-card dentist-actions-card" aria-label="Dentist lifecycle controls section">
              <h2>Dentist Actions</h2>
              <div className="dentist-actions-toolbar">
                {plan.status === 'PROPOSED' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleApprove}
                    disabled={lifecycleSubmitting}
                  >
                    Approve Plan
                  </button>
                )}

                {(plan.status === 'PROPOSED' || plan.status === 'APPROVED') && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStart}
                    disabled={lifecycleSubmitting}
                  >
                    Start Plan
                  </button>
                )}

                {plan.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleComplete}
                    disabled={lifecycleSubmitting}
                  >
                    Complete Plan
                  </button>
                )}

                {plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCancelForm((prev) => !prev);
                      setShowFollowUpForm(false);
                      setCancelError('');
                    }}
                    disabled={lifecycleSubmitting}
                  >
                    {showCancelForm ? 'Dismiss Cancel' : 'Cancel Plan'}
                  </button>
                )}

                {plan.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowFollowUpForm((prev) => !prev);
                      setShowCancelForm(false);
                      setFollowUpError('');
                    }}
                    disabled={lifecycleSubmitting}
                  >
                    {showFollowUpForm ? 'Dismiss Follow-Up' : 'Set Follow-Up'}
                  </button>
                )}
              </div>

              {/* Cancel Plan Form */}
              {showCancelForm && (
                <div className="action-form-panel">
                  <h3>Cancel Treatment Plan</h3>
                  {cancelError && (
                    <div className="error-alert" role="alert">
                      <p>{cancelError}</p>
                    </div>
                  )}
                  <form onSubmit={handleCancelSubmit} noValidate>
                    <div className="form-group">
                      <label htmlFor="cancellationReason">
                        Cancellation Reason <span className="required-star">*</span>
                      </label>
                      <textarea
                        id="cancellationReason"
                        name="cancellationReason"
                        rows="2"
                        maxLength={255}
                        className="form-textarea"
                        placeholder="Provide medical or patient justification for cancellation"
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        disabled={lifecycleSubmitting}
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={lifecycleSubmitting || !cancellationReason.trim()}
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowCancelForm(false)}
                        disabled={lifecycleSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Set Follow-Up Form */}
              {showFollowUpForm && (
                <div className="action-form-panel">
                  <h3>Schedule Plan Follow-Up</h3>
                  {followUpError && (
                    <div className="error-alert" role="alert">
                      <p>{followUpError}</p>
                    </div>
                  )}
                  <form onSubmit={handleFollowUpSubmit} noValidate>
                    <div className="form-group">
                      <label htmlFor="planFollowUpDate">
                        Follow-Up Date <span className="required-star">*</span>
                      </label>
                      <input
                        id="planFollowUpDate"
                        name="followUpDate"
                        type="date"
                        className="form-input"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDateInput(e.target.value)}
                        disabled={lifecycleSubmitting}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="planFollowUpNotes">Follow-Up Notes</label>
                      <textarea
                        id="planFollowUpNotes"
                        name="followUpNotes"
                        rows="2"
                        className="form-textarea"
                        placeholder="Checkup objectives or evaluation criteria"
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotesInput(e.target.value)}
                        disabled={lifecycleSubmitting}
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={lifecycleSubmitting || !followUpDate.trim()}
                      >
                        Save Follow-Up
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowFollowUpForm(false)}
                        disabled={lifecycleSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Treatment Procedures Section */}
          <div className="detail-card">
            <div className="section-header">
              <h2>Treatment Procedures</h2>
              {plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setProcedureModalMode('add');
                    setSelectedProcedure(null);
                    setProcedureError('');
                  }}
                >
                  Add Procedure
                </button>
              )}
            </div>

            {procedureModalMode && (
              <div className="finding-form-panel">
                <h3>
                  {procedureModalMode === 'add' && 'Add Treatment Procedure'}
                  {procedureModalMode === 'edit' && `Edit Procedure #${selectedProcedure?.id}`}
                  {procedureModalMode === 'complete' && `Complete Procedure #${selectedProcedure?.id}`}
                </h3>
                <ProcedureForm
                  mode={procedureModalMode}
                  initialValues={
                    procedureModalMode === 'add'
                      ? { sequenceNumber: procedures.length + 1 }
                      : { ...selectedProcedure, dentistId: authUser?.id }
                  }
                  onSubmit={handleProcedureSubmit}
                  submitting={procedureSubmitting}
                  serverError={procedureError}
                  onCancel={() => {
                    setProcedureModalMode(null);
                    setSelectedProcedure(null);
                  }}
                />
              </div>
            )}

            <ProceduresTable
              procedures={procedures}
              onEdit={(procId) => {
                const found = procedures.find((p) => p.id === procId);
                if (found) {
                  setSelectedProcedure(found);
                  setProcedureModalMode('edit');
                  setProcedureError('');
                }
              }}
              onComplete={(procId) => {
                const found = procedures.find((p) => p.id === procId);
                if (found) {
                  setSelectedProcedure(found);
                  setProcedureModalMode('complete');
                  setProcedureError('');
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
