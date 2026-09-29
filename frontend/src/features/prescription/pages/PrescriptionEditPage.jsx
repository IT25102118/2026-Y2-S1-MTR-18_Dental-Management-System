import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPrescriptionById, updatePrescription } from '../api/prescriptionApi';
import PrescriptionItemEditor from '../components/PrescriptionItemEditor';
import PrescriptionStatusBadge from '../components/PrescriptionStatusBadge';
import PrescriptionNav from '../components/PrescriptionNav';
import '../prescription.css';

/**
 * Page for editing an existing DRAFT prescription.
 * Rejects editing if prescription is FINALIZED or CANCELLED.
 */
export default function PrescriptionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [formData, setFormData] = useState({
    notes: '',
    items: []
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const fetchPrescription = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getPrescriptionById(id);
      setPrescription(data);
      setFormData({
        notes: data.notes || '',
        items: data.items && data.items.length > 0
          ? data.items.map((it) => ({
              medicineName: it.medicineName || '',
              strength: it.strength || '',
              dosage: it.dosage || '',
              frequency: it.frequency || '',
              duration: it.duration || '',
              quantity: it.quantity ?? 1,
              instructions: it.instructions || ''
            }))
          : [
              {
                medicineName: '',
                strength: '',
                dosage: '',
                frequency: '',
                duration: '',
                quantity: 1,
                instructions: ''
              }
            ]
      });
    } catch (err) {
      setLoadError(err.message || `Failed to load prescription #${id}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPrescription();
  }, [fetchPrescription]);

  const validate = () => {
    const errs = {};

    if (formData.notes && formData.notes.length > 2000) {
      errs.notes = 'Notes cannot exceed 2000 characters.';
    }

    if (!formData.items || formData.items.length === 0) {
      errs.items = 'At least one medicine item is required.';
    } else {
      formData.items.forEach((item, index) => {
        const itemErr = {};
        if (!item.medicineName || item.medicineName.trim() === '') {
          itemErr.medicineName = 'Medicine name is required.';
        }
        if (!item.dosage || item.dosage.trim() === '') {
          itemErr.dosage = 'Dosage is required.';
        }
        if (!item.frequency || item.frequency.trim() === '') {
          itemErr.frequency = 'Frequency is required.';
        }
        if (!item.duration || item.duration.trim() === '') {
          itemErr.duration = 'Duration is required.';
        }
        if (item.quantity === undefined || item.quantity === null || String(item.quantity).trim() === '') {
          itemErr.quantity = 'Quantity is required.';
        } else if (isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
          itemErr.quantity = 'Quantity must be greater than zero.';
        }

        if (Object.keys(itemErr).length > 0) {
          errs[`item_${index}`] = itemErr;
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNotesChange = (e) => {
    setFormData((prev) => ({ ...prev, notes: e.target.value }));
    if (errors.notes) {
      setErrors((prev) => ({ ...prev, notes: null }));
    }
  };

  const handleItemsChange = (newItems) => {
    setFormData((prev) => ({ ...prev, items: newItems }));
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await updatePrescription(id, {
        notes: formData.notes?.trim() || '',
        items: formData.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity)
        }))
      });
      navigate(`/prescriptions/${id}`, {
        state: { message: `Prescription #${id} updated successfully!` }
      });
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
      }
      setApiError(err.message || 'Failed to update prescription draft.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="prescription-container">
        <PrescriptionNav />
        <div className="loading-state" role="status">
          Loading prescription draft #{id}...
        </div>
      </div>
    );
  }

  if (loadError || !prescription) {
    return (
      <div className="prescription-container">
        <PrescriptionNav />
        <div className="error-alert" role="alert">
          <h2>Error Loading Prescription</h2>
          <p>{loadError || `Prescription #${id} not found.`}</p>
          <Link to="/prescriptions" className="btn btn-secondary btn-sm">
            ← Return to Prescriptions List
          </Link>
        </div>
      </div>
    );
  }

  if (prescription.status !== 'DRAFT') {
    return (
      <div className="prescription-container">
        <PrescriptionNav />
        <div className="error-alert" role="alert">
          <h2>Cannot Edit Non-Draft Prescription</h2>
          <p>
            Prescription #{id} is currently <strong>{prescription.status}</strong>.
            Finalized or cancelled clinical records are legally locked and cannot be modified.
          </p>
          <div>
            <Link to={`/prescriptions/${id}`} className="btn btn-primary btn-sm">
              View Prescription Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="prescription-container">
      <PrescriptionNav />

      <div className="prescription-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1>Edit Prescription Draft #{prescription.id}</h1>
            <PrescriptionStatusBadge status={prescription.status} />
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Update clinical notes or modify prescribed medicines before finalization.
          </p>
        </div>
        <Link to={`/prescriptions/${prescription.id}`} className="btn btn-secondary">
          Cancel &amp; Return
        </Link>
      </div>

      {apiError && (
        <div className="error-alert" role="alert">
          <strong>Error updating prescription:</strong>
          <p style={{ margin: 0 }}>{apiError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Read-only Patient / Dentist Card */}
        <div className="prescription-card">
          <h2 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
            Patient &amp; Prescriber Information (Locked)
          </h2>
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
          </div>
        </div>

        {/* Notes Card */}
        <div className="prescription-card">
          <h2 style={{ fontSize: '1.1rem', marginTop: 0, marginBottom: '1rem', color: '#0f172a' }}>
            Clinical Notes / Instructions
          </h2>
          <div className="form-group">
            <label htmlFor="notes">Clinical Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Clinical notes, diagnosis, instructions..."
              value={formData.notes}
              onChange={handleNotesChange}
              disabled={submitting}
              className={errors.notes ? 'has-error' : ''}
            />
            {errors.notes && <span className="field-error">{errors.notes}</span>}
            <span className="form-help">Max 2,000 characters.</span>
          </div>
        </div>

        {/* Medicines Card */}
        <div className="prescription-card">
          <PrescriptionItemEditor
            items={formData.items}
            onChange={handleItemsChange}
            errors={errors}
            disabled={submitting}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <Link to={`/prescriptions/${prescription.id}`} className="btn btn-secondary" disabled={submitting}>
            Discard Changes
          </Link>
          <button type="submit" className="btn btn-primary" id="btn-update-prescription" disabled={submitting}>
            {submitting ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
