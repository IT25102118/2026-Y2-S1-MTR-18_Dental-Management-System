import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPatientById, deactivatePatient, reactivatePatient } from '../api/patientApi';
import PatientStatusBadge from '../components/PatientStatusBadge';
import '../patient.css';

export default function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Deactivate modal state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientById(id);
      setPatient(data);
    } catch (err) {
      setError(err.message || 'Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  const handleDeactivate = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await deactivatePatient(id, deactivationReason);
      setActionSuccess('Patient record deactivated successfully.');
      setShowDeactivateModal(false);
      setDeactivationReason('');
      await fetchPatient();
    } catch (err) {
      setError(err.message || 'Failed to deactivate patient.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await reactivatePatient(id);
      setActionSuccess('Patient record reactivated successfully.');
      await fetchPatient();
    } catch (err) {
      setError(err.message || 'Failed to reactivate patient.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="patient-container">
        <div className="loading-state" role="status">
          Loading patient profile...
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="patient-container">
        <nav className="patient-nav">
          <Link to="/patients">← Back to Patients</Link>
        </nav>
        <div className="error-alert" role="alert">
          <p>{error || 'Patient record not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-container">
      <nav className="patient-nav" aria-label="Breadcrumb">
        <Link to="/patients">← Back to Patients</Link>
      </nav>

      <div className="patient-header">
        <div>
          <h1>{`${patient.firstName} ${patient.lastName}`}</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Patient Code: <strong>{patient.patientCode}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <PatientStatusBadge active={patient.active} />
          <Link
            to={`/patients/${patient.id}/edit`}
            className="btn btn-secondary"
            data-testid="edit-patient-details-button"
          >
            Edit Profile
          </Link>
          {patient.active ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowDeactivateModal(true)}
              disabled={actionLoading}
              data-testid="deactivate-patient-details-button"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-success"
              onClick={handleReactivate}
              disabled={actionLoading}
              data-testid="reactivate-patient-details-button"
            >
              {actionLoading ? 'Reactivating...' : 'Reactivate'}
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="success-alert" role="status">
          {actionSuccess}
        </div>
      )}

      {/* Deactivation banner if inactive */}
      {!patient.active && (
        <div className="error-alert" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b' }}>Patient Record is Inactive</h4>
          {patient.deactivationReason && (
            <p style={{ margin: '0 0 0.25rem 0' }}>
              <strong>Reason:</strong> {patient.deactivationReason}
            </p>
          )}
          {patient.deactivatedAt && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d' }}>
              Deactivated on: {new Date(patient.deactivatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Demographic Details */}
      <div className="details-card">
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
          Demographics & Identification
        </h2>
        <div className="details-grid">
          <div className="details-item">
            <label>Patient ID</label>
            <span>{patient.id}</span>
          </div>
          <div className="details-item">
            <label>Patient Code</label>
            <span>{patient.patientCode}</span>
          </div>
          <div className="details-item">
            <label>Date of Birth</label>
            <span>{patient.dateOfBirth}</span>
          </div>
          <div className="details-item">
            <label>Gender</label>
            <span>{patient.gender}</span>
          </div>
          <div className="details-item">
            <label>Record Status</label>
            <span>{patient.active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="details-card">
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
          Contact Information
        </h2>
        <div className="details-grid">
          <div className="details-item">
            <label>Phone</label>
            <span>{patient.phone || '-'}</span>
          </div>
          <div className="details-item">
            <label>Email</label>
            <span>{patient.email || '-'}</span>
          </div>
          <div className="details-item">
            <label>City</label>
            <span>{patient.city || '-'}</span>
          </div>
          <div className="details-item" style={{ gridColumn: 'span 2' }}>
            <label>Address</label>
            <span>
              {[patient.addressLine1, patient.addressLine2].filter(Boolean).join(', ') || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="details-card">
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
          Emergency Contact
        </h2>
        <div className="details-grid">
          <div className="details-item">
            <label>Contact Name</label>
            <span>{patient.emergencyContactName || '-'}</span>
          </div>
          <div className="details-item">
            <label>Contact Phone</label>
            <span>{patient.emergencyContactPhone || '-'}</span>
          </div>
          <div className="details-item">
            <label>Relationship</label>
            <span>{patient.emergencyContactRelationship || '-'}</span>
          </div>
        </div>
      </div>

      {/* Clinical Information */}
      <div className="details-card">
        <h2 style={{ fontSize: '1.2rem', marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
          Clinical & Medical History
        </h2>
        <div className="details-grid">
          <div className="details-item" style={{ gridColumn: '1 / -1' }}>
            <label>Allergies</label>
            <p>{patient.allergies || 'None documented'}</p>
          </div>
          <div className="details-item" style={{ gridColumn: '1 / -1' }}>
            <label>Medical Conditions</label>
            <p>{patient.medicalConditions || 'None documented'}</p>
          </div>
          <div className="details-item" style={{ gridColumn: '1 / -1' }}>
            <label>Current Medications</label>
            <p>{patient.currentMedications || 'None documented'}</p>
          </div>
          <div className="details-item" style={{ gridColumn: '1 / -1' }}>
            <label>Dental History</label>
            <p>{patient.dentalHistory || 'None documented'}</p>
          </div>
          <div className="details-item" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <p>{patient.notes || 'None documented'}</p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="details-card" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
        <div className="details-grid">
          <div className="details-item">
            <label>Created At</label>
            <span style={{ fontSize: '0.85rem' }}>
              {patient.createdAt ? new Date(patient.createdAt).toLocaleString() : '-'}
            </span>
          </div>
          <div className="details-item">
            <label>Last Updated</label>
            <span style={{ fontSize: '0.85rem' }}>
              {patient.updatedAt ? new Date(patient.updatedAt).toLocaleString() : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Deactivation Modal */}
      {showDeactivateModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-deactivate-title">
          <div className="modal-content">
            <h3 id="detail-deactivate-title">Confirm Patient Deactivation</h3>
            <p>
              Are you sure you want to deactivate patient <strong>{patient.firstName} {patient.lastName}</strong>?
            </p>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="detail-modal-deactivation-reason">Reason for deactivation (optional):</label>
              <input
                id="detail-modal-deactivation-reason"
                type="text"
                className="form-input"
                maxLength={255}
                placeholder="e.g., Relocated, Transferred, Patient requested"
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                disabled={actionLoading}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeactivateModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeactivate}
                disabled={actionLoading}
                data-testid="confirm-detail-deactivate-button"
              >
                {actionLoading ? 'Deactivating...' : 'Deactivate Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
