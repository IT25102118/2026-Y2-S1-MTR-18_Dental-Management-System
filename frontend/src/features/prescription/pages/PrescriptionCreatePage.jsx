import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPrescription } from '../api/prescriptionApi';
import { useAuth } from '../../auth/context/AuthContext';
import PrescriptionItemEditor from '../components/PrescriptionItemEditor';
import PrescriptionNav from '../components/PrescriptionNav';
import '../prescription.css';

/**
 * Page for creating a new DRAFT prescription with full validation.
 */
export default function PrescriptionCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If the logged-in user is a DENTIST, prepopulate their ID
  const defaultDentistId = user?.role === 'DENTIST' ? String(user.id) : '';

  const [formData, setFormData] = useState({
    patientId: '',
    dentistId: defaultDentistId,
    notes: '',
    items: [
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

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  const validate = () => {
    const errs = {};

    // Patient ID validation
    if (!formData.patientId || String(formData.patientId).trim() === '') {
      errs.patientId = 'Patient ID is required.';
    } else if (
        isNaN(Number(formData.patientId)) ||
        Number(formData.patientId) <= 0
    ) {
      errs.patientId = 'Patient ID must be a valid positive number.';
    }

    // Dentist ID validation
    if (!formData.dentistId || String(formData.dentistId).trim() === '') {
      errs.dentistId = 'Dentist ID is required.';
    } else if (
        isNaN(Number(formData.dentistId)) ||
        Number(formData.dentistId) <= 0
    ) {
      errs.dentistId = 'Dentist ID must be a valid positive number.';
    }

    // Notes validation
    if (formData.notes && formData.notes.length > 2000) {
      errs.notes = 'Notes cannot exceed 2000 characters.';
    }

    // Items validation
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

        if (
            item.quantity === undefined ||
            item.quantity === null ||
            String(item.quantity).trim() === ''
        ) {
          itemErr.quantity = 'Quantity is required.';
        } else if (
            isNaN(Number(item.quantity)) ||
            Number(item.quantity) <= 0
        ) {
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleItemsChange = (newItems) => {
    setFormData((prev) => ({
      ...prev,
      items: newItems
    }));

    // Clear general items error
    if (errors.items) {
      setErrors((prev) => ({
        ...prev,
        items: null
      }));
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
      const created = await createPrescription({
        patientId: Number(formData.patientId),
        dentistId: Number(formData.dentistId),
        notes: formData.notes?.trim() || '',
        items: formData.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity)
        }))
      });

      navigate(`/prescriptions/${created.id}`, {
        state: {
          message: 'Prescription draft created successfully!'
        }
      });
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setErrors((prev) => ({
          ...prev,
          ...err.fieldErrors
        }));
      }

      setApiError(
          err.message ||
          'Failed to create prescription. Please verify the patient and dentist IDs.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <div className="prescription-container">
        <PrescriptionNav />

        <div className="prescription-header">
          <div>
            <h1>Create New Prescription</h1>

            <p
                style={{
                  margin: '0.25rem 0 0 0',
                  color: '#64748b',
                  fontSize: '0.9rem'
                }}
            >
              Author a new prescription order. Saves initially as a DRAFT.
            </p>
          </div>

          <Link to="/prescriptions" className="btn btn-secondary">
            Cancel
          </Link>
        </div>

        {apiError && (
            <div className="error-alert" role="alert">
              <strong>Error creating prescription:</strong>
              <p style={{ margin: 0 }}>{apiError}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="prescription-card">
            <h2
                style={{
                  fontSize: '1.25rem',
                  marginTop: 0,
                  marginBottom: '1.25rem',
                  color: '#0f172a'
                }}
            >
              Clinical Details
            </h2>

            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="patientId">
                  Patient ID <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <input
                    id="patientId"
                    name="patientId"
                    type="number"
                    min="1"
                    placeholder="Enter patient user ID (e.g. 1)"
                    value={formData.patientId}
                    onChange={handleChange}
                    disabled={submitting}
                    className={errors.patientId ? 'has-error' : ''}
                    required
                />

                {errors.patientId && (
                    <span className="field-error">
                  {errors.patientId}
                </span>
                )}

                <span className="form-help">
                Must reference a registered user with PATIENT role.
              </span>
              </div>

              <div className="form-group">
                <label htmlFor="dentistId">
                  Prescribing Dentist ID{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <input
                    id="dentistId"
                    name="dentistId"
                    type="number"
                    min="1"
                    placeholder="Enter dentist user ID (e.g. 2)"
                    value={formData.dentistId}
                    onChange={handleChange}
                    readOnly={user?.role === 'DENTIST'}
                    disabled={submitting}
                    className={errors.dentistId ? 'has-error' : ''}
                    required
                />

                {errors.dentistId && (
                    <span className="field-error">
                  {errors.dentistId}
                </span>
                )}

                {user?.role === 'DENTIST' ? (
                    <span
                        className="form-help"
                        style={{ color: '#16a34a' }}
                    >
                  Logged-in dentist: {user.firstName} {user.lastName} —
                  ID {user.id}. This field is read-only.
                </span>
                ) : (
                    <span className="form-help">
                  Must reference a registered user with DENTIST role.
                </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">
                Clinical Notes / Diagnosis Summary (Optional)
              </label>

              <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="e.g. Post-extraction pain management, acute apical abscess, prophylaxis..."
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={submitting}
                  className={errors.notes ? 'has-error' : ''}
              />

              {errors.notes && (
                  <span className="field-error">
                {errors.notes}
              </span>
              )}

              <span className="form-help">
              Max 2,000 characters.
            </span>
            </div>
          </div>

          <div className="prescription-card">
            <PrescriptionItemEditor
                items={formData.items}
                onChange={handleItemsChange}
                errors={errors}
                disabled={submitting}
            />
          </div>

          <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                marginTop: '1.5rem'
              }}
          >
            <Link
                to="/prescriptions"
                className="btn btn-secondary"
            >
              Cancel
            </Link>

            <button
                type="submit"
                className="btn btn-primary"
                id="btn-save-draft"
                disabled={submitting}
            >
              {submitting ? 'Saving Draft...' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
  );
}