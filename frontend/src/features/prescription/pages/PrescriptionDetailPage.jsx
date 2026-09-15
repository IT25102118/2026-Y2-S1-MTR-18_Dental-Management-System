import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getPrescriptionById, finalizePrescription, cancelPrescription } from '../api/prescriptionApi';
import { useAuth } from '../../auth/context/AuthContext';
import PrescriptionStatusBadge from '../components/PrescriptionStatusBadge';
import PrescriptionPrintView from '../components/PrescriptionPrintView';
import PrescriptionNav from '../components/PrescriptionNav';
import '../prescription.css';

/**
 * Detail Page displaying the complete clinical prescription,
 * with actions for editing draft, finalization, cancellation, and printing.
 */
export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Finalization dentist ID confirmation state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizingDentistId, setFinalizingDentistId] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchPrescription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrescriptionById(id);
      setPrescription(data);
      if (user?.role === 'DENTIST') {
        setFinalizingDentistId(String(user.id));
      } else if (data?.dentistId) {
        setFinalizingDentistId(String(data.dentistId));
      }
    } catch (err) {
      setError(err.message || `Failed to load prescription #${id}`);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchPrescription();
  }, [fetchPrescription]);

  const handleOpenFinalize = () => {
    setActionError(null);
    if (user?.role === 'DENTIST') {
      setFinalizingDentistId(String(user.id));
    } else if (prescription?.dentistId) {
      setFinalizingDentistId(String(prescription.dentistId));
    }
    setShowFinalizeModal(true);
  };

  const handleConfirmFinalize = async (e) => {
    e.preventDefault();
    if (!finalizingDentistId || isNaN(Number(finalizingDentistId)) || Number(finalizingDentistId) <= 0) {
      setActionError('A valid Dentist ID is required to finalize.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await finalizePrescription(id, finalizingDentistId);
      setPrescription(updated);
      setSuccessMessage('Prescription has been finalized. It is now a permanent clinical order.');
      setShowFinalizeModal(false);
    } catch (err) {
      setActionError(err.message || 'Failed to finalize prescription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await cancelPrescription(id);
      setPrescription(updated);
      setSuccessMessage('Prescription was cancelled. Historical record has been preserved.');
      setShowCancelModal(false);
    } catch (err) {
      setActionError(err.message || 'Failed to cancel prescription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="prescription-container">
        <PrescriptionNav />
        <div className="loading-state" role="status">
          Loading prescription #{id}...
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="prescription-container">
        <PrescriptionNav />
        <div className="error-alert" role="alert">
          <h2>Prescription Not Found</h2>
          <p>{error || `Prescription #${id} does not exist.`}</p>
          <div>
            <Link to="/prescriptions" className="btn btn-secondary btn-sm">
              ← Return to Prescriptions List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDraft = prescription.status === 'DRAFT';
  const isFinalized = prescription.status === 'FINALIZED';
  const isCancelled = prescription.status === 'CANCELLED';
  const isDentist = user?.role === 'DENTIST';

  return (
    <div className="prescription-container">
      <div className="no-print">
        <PrescriptionNav />
      </div>

      <PrescriptionPrintView prescription={prescription} />

      <div className="prescription-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1>Prescription #{prescription.id}</h1>
            <PrescriptionStatusBadge status={prescription.status} />
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Created on {new Date(prescription.createdAt).toLocaleDateString()} at {new Date(prescription.createdAt).toLocaleTimeString()}
          </p>
        </div>

        <div className="table-actions no-print">
          {isDentist && isDraft && (
            <>
              <Link to={`/prescriptions/${prescription.id}/edit`} className="btn btn-secondary">
                Edit Draft
              </Link>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleOpenFinalize}
                disabled={actionLoading || !prescription.items || prescription.items.length === 0}
                title={!prescription.items || prescription.items.length === 0 ? 'Add at least one medicine to finalize' : ''}
              >
                Finalize Prescription
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => { setActionError(null); setShowCancelModal(true); }}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </>
          )}

          {isFinalized && (
            <>
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                🖨️ Print / Save PDF
              </button>
              {isDentist && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => { setActionError(null); setShowCancelModal(true); }}
                  disabled={actionLoading}
                >
                  Cancel Prescription
                </button>
              )}
            </>
          )}

          {isCancelled && (
            <button type="button" className="btn btn-secondary" onClick={handlePrint}>
              🖨️ Print Record
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="success-alert no-print" role="status">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="error-alert no-print" role="alert">
          {actionError}
        </div>
      )}

      {isCancelled && (
        <div className="info-alert no-print" role="status">
          <strong>Notice:</strong> This prescription is <strong>CANCELLED</strong>. Clinical history remains safely preserved in accordance with healthcare audit requirements.
        </div>
      )}

      {isFinalized && (
        <div className="info-alert no-print" role="status">
          <strong>Notice:</strong> This prescription is <strong>FINALIZED</strong>. As a permanent clinical order, it cannot be edited.
        </div>
      )}

      {/* Patient & Dentist Summary Card */}
      <div className="prescription-card">
        <div className="prescription-card-header">
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Patient & Provider Information</h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Last Updated: {new Date(prescription.updatedAt).toLocaleString()}
          </span>
        </div>

        <div className="grid-2">
          <div className="meta-field">
            <label>Patient</label>
            <span>{prescription.patientName || `Patient #${prescription.patientId}`}</span>
            <small style={{ color: '#64748b' }}>User ID: {prescription.patientId}</small>
          </div>

          <div className="meta-field">
            <label>Prescribing Dentist</label>
            <span>{prescription.dentistName || `Dentist #${prescription.dentistId}`}</span>
            <small style={{ color: '#64748b' }}>User ID: {prescription.dentistId}</small>
          </div>

          <div className="meta-field">
            <label>Finalization Status</label>
            <span>
              {isCancelled ? (
                <em style={{ color: '#b91c1c' }}>Cancelled</em>
              ) : prescription.finalizedAt ? (
                <>Finalized on {new Date(prescription.finalizedAt).toLocaleString()}</>
              ) : (
                <em style={{ color: '#b45309' }}>Pending Finalization (Draft)</em>
              )}
            </span>
          </div>

          {prescription.replacedByPrescriptionId && (
            <div className="meta-field">
              <label>Replaced By</label>
              <span>
                <Link to={`/prescriptions/${prescription.replacedByPrescriptionId}`}>
                  Prescription #{prescription.replacedByPrescriptionId}
                </Link>
              </span>
            </div>
          )}
        </div>

        {prescription.notes && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Clinical Notes / Diagnosis
            </label>
            <p style={{ margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap', color: '#334155' }}>
              {prescription.notes}
            </p>
          </div>
        )}
      </div>

      {/* Medicine Items Table */}
      <div className="prescription-card">
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
          Prescribed Medications ({prescription.items ? prescription.items.length : 0})
        </h2>

        {!prescription.items || prescription.items.length === 0 ? (
          <div className="empty-state">
            <p>No medicines added to this prescription draft yet.</p>
            {isDraft && (
              <Link to={`/prescriptions/${prescription.id}/edit`} className="btn btn-secondary btn-sm">
                + Add Medicines
              </Link>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="prescription-table" aria-label="Prescribed medications table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Medicine Name</th>
                  <th scope="col">Strength</th>
                  <th scope="col">Dosage</th>
                  <th scope="col">Frequency</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Special Instructions</th>
                </tr>
              </thead>
              <tbody>
                {prescription.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ color: '#64748b', fontWeight: 600 }}>{index + 1}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{item.medicineName}</strong>
                    </td>
                    <td>{item.strength || '—'}</td>
                    <td>{item.dosage}</td>
                    <td>{item.frequency}</td>
                    <td>{item.duration}</td>
                    <td>
                      <strong>{item.quantity}</strong>
                    </td>
                    <td>{item.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print-only footer for doctor signature */}
      <div className="print-only-header" style={{ marginTop: '3rem', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
              DentCare Practice Clinic &bull; System Verified Electronic Record
            </p>
          </div>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ borderBottom: '1px solid #000000', marginBottom: '0.5rem', height: '40px' }}></div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
              {prescription.dentistName || 'Dentist Signature'}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>Registered Dental Practitioner</p>
          </div>
        </div>
      </div>

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finalize-dialog-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h2 id="finalize-dialog-title" style={{ marginTop: 0, color: '#0f172a', fontSize: '1.25rem' }}>
              Finalize Prescription #{prescription.id}?
            </h2>
            <p style={{ color: '#475569', fontSize: '0.875rem' }}>
              Finalizing locks the prescription permanently into the clinical record. Once finalized, items and notes cannot be edited.
            </p>

            {actionError && (
              <div className="error-alert" style={{ marginBottom: '1rem' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleConfirmFinalize}>
              <div className="form-group">
                <label htmlFor="finalizingDentistId">
                  Confirm Dentist ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="finalizingDentistId"
                  type="number"
                  min="1"
                  value={finalizingDentistId}
                  onChange={(e) => setFinalizingDentistId(e.target.value)}
                  placeholder="Enter authorized Dentist User ID"
                  required
                />
                <span className="form-help">
                  Only a user with the DENTIST role may finalize prescriptions.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowFinalizeModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  id="btn-confirm-finalize"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Finalizing...' : 'Yes, Finalize Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h2 id="cancel-dialog-title" style={{ marginTop: 0, color: '#991b1b', fontSize: '1.25rem' }}>
              Cancel Prescription #{prescription.id}?
            </h2>
            <p style={{ color: '#475569', fontSize: '0.875rem' }}>
              This will mark the prescription as <strong>CANCELLED</strong>. The clinical record and prescription history will be permanently retained for audit purposes.
            </p>

            {actionError && (
              <div className="error-alert" style={{ marginBottom: '1rem' }}>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
              >
                No, Keep Active
              </button>
              <button
                type="button"
                className="btn btn-danger"
                id="btn-confirm-cancel"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
