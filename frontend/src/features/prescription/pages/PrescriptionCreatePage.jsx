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
  const defaultDentistId =
      user?.role === 'DENTIST' ? String(user.id) : '';

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
    if (
        !formData.patientId ||
        String(formData.patientId).trim() === ''
    ) {
      errs.patientId = 'Patient ID is required.';
    } else if (
        isNaN(Number(formData.patientId)) ||
        Number(formData.patientId) <= 0
    ) {
      errs.patientId =
          'Patient ID must be a valid positive number.';
    }

    // Dentist ID validation
    if (
        !formData.dentistId ||
        String(formData.dentistId).trim() === ''
    ) {
      errs.dentistId = 'Dentist ID is required.';
    } else if (
        isNaN(Number(formData.dentistId)) ||
        Number(formData.dentistId) <= 0
    ) {
      errs.dentistId =
          'Dentist ID must be a valid positive number.';
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

        if (
            !item.medicineName ||
            item.medicineName.trim() === ''
        ) {
          itemErr.medicineName =
              'Medicine name is required.';
        }

        if (!item.dosage || item.dosage.trim() === '') {
          itemErr.dosage = 'Dosage is required.';
        }

        if (
            !item.frequency ||
            item.frequency.trim() === ''
        ) {
          itemErr.frequency = 'Frequency is required.';
        }

        if (
            !item.duration ||
            item.duration.trim() === ''
        ) {
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
          itemErr.quantity =
              'Quantity must be greater than zero.';
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
          message:
              'Prescription draft created successfully!'
        }
      });
    } catch (err) {
      if (
          err.fieldErrors &&
          Object.keys(err.fieldErrors).length > 0
      ) {
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

        {/* Page heading */}
        <div
            className="prescription-header"
            style={{
              marginBottom: '1.75rem'
            }}
        >
          <div>
            <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.7rem',
                  background: '#eff6ff',
                  color: '#2563eb',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  marginBottom: '0.8rem'
                }}
            >
              NEW PRESCRIPTION
            </div>

            <h1 style={{ marginBottom: '0.35rem' }}>
              Create New Prescription
            </h1>

            <p
                style={{
                  margin: 0,
                  color: '#64748b',
                  fontSize: '0.92rem'
                }}
            >
              Create a safe medication order for your
              patient. New prescriptions are saved as a
              draft first.
            </p>
          </div>

          <Link
              to="/prescriptions"
              className="btn btn-secondary"
          >
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
          {/* Clinical details */}
          <div
              className="prescription-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '1px solid #dbeafe',
                boxShadow:
                    '0 8px 28px rgba(37, 99, 235, 0.07)'
              }}
          >
            <div
                style={{
                  height: '4px',
                  background:
                      'linear-gradient(90deg, #2563eb, #38bdf8)'
                }}
            />

            <div style={{ padding: '1.5rem' }}>
              <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    paddingBottom: '1rem',
                    marginBottom: '1.35rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}
              >
                <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontWeight: 800
                    }}
                >
                  01
                </div>

                <div>
                  <h2
                      style={{
                        fontSize: '1.2rem',
                        margin: 0,
                        color: '#0f172a'
                      }}
                  >
                    Clinical Details
                  </h2>

                  <p
                      style={{
                        margin: '0.2rem 0 0',
                        color: '#64748b',
                        fontSize: '0.8rem'
                      }}
                  >
                    Select the patient and review the
                    prescribing dentist.
                  </p>
                </div>
              </div>

              <div className="grid-2">
                {/* Patient */}
                <div className="form-group">
                  <label htmlFor="patientId">
                    Patient ID{' '}
                    <span style={{ color: '#dc2626' }}>
                    *
                  </span>
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
                      className={
                        errors.patientId ? 'has-error' : ''
                      }
                      required
                  />

                  {errors.patientId && (
                      <span className="field-error">
                    {errors.patientId}
                  </span>
                  )}

                  <span className="form-help">
                  Must reference a registered user with
                  PATIENT role.
                </span>
                </div>

                {/* Dentist */}
                <div className="form-group">
                  <label htmlFor="dentistId">
                    Prescribing Dentist ID{' '}
                    <span style={{ color: '#dc2626' }}>
                    *
                  </span>
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
                      className={
                        errors.dentistId ? 'has-error' : ''
                      }
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
                          style={{
                            color: '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: 500
                          }}
                      >
                    ✓ Logged-in dentist: {user.firstName}{' '}
                        {user.lastName} — ID {user.id}. This
                    field is read-only.
                  </span>
                  ) : (
                      <span className="form-help">
                    Must reference a registered user with
                    DENTIST role.
                  </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div
                  className="form-group"
                  style={{
                    marginBottom: 0,
                    marginTop: '0.5rem'
                  }}
              >
                <label htmlFor="notes">
                  Clinical Notes / Diagnosis Summary
                  <span
                      style={{
                        color: '#94a3b8',
                        fontWeight: 400,
                        marginLeft: '0.4rem'
                      }}
                  >
                  Optional
                </span>
                </label>

                <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    placeholder="e.g. Post-extraction pain management, acute apical abscess, prophylaxis..."
                    value={formData.notes}
                    onChange={handleChange}
                    disabled={submitting}
                    className={
                      errors.notes ? 'has-error' : ''
                    }
                    style={{
                      resize: 'vertical',
                      minHeight: '105px'
                    }}
                />

                {errors.notes && (
                    <span className="field-error">
                  {errors.notes}
                </span>
                )}

                <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}
                >
                <span className="form-help">
                  Add diagnosis or treatment notes if
                  required.
                </span>

                  <span className="form-help">
                  {formData.notes.length} / 2000
                </span>
                </div>
              </div>
            </div>
          </div>

          {/* Medicine section */}
          <div
              className="prescription-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '1px solid #ccfbf1',
                boxShadow:
                    '0 8px 28px rgba(13, 148, 136, 0.07)'
              }}
          >
            <div
                style={{
                  height: '4px',
                  background:
                      'linear-gradient(90deg, #0d9488, #22c55e)'
                }}
            />

            <div style={{ padding: '1.5rem' }}>
              <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    marginBottom: '1rem'
                  }}
              >
                <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: '#ccfbf1',
                      color: '#0f766e',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontWeight: 800
                    }}
                >
                  02
                </div>

                <div>
                  <h2
                      style={{
                        fontSize: '1.2rem',
                        margin: 0,
                        color: '#0f172a'
                      }}
                  >
                    Medication Order
                  </h2>

                  <p
                      style={{
                        margin: '0.2rem 0 0',
                        color: '#64748b',
                        fontSize: '0.8rem'
                      }}
                  >
                    Enter medicine, dosage, frequency,
                    duration and quantity.
                  </p>
                </div>
              </div>

              <PrescriptionItemEditor
                  items={formData.items}
                  onChange={handleItemsChange}
                  errors={errors}
                  disabled={submitting}
              />
            </div>
          </div>

          {/* Bottom action area */}
          <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow:
                    '0 6px 20px rgba(15, 23, 42, 0.05)'
              }}
          >
            <div>
              <strong
                  style={{
                    display: 'block',
                    color: '#0f172a',
                    fontSize: '0.9rem'
                  }}
              >
                Ready to save?
              </strong>

              <span
                  style={{
                    color: '#64748b',
                    fontSize: '0.76rem'
                  }}
              >
              The prescription will be saved as a DRAFT
              and can be edited before finalization.
            </span>
            </div>

            <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
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
                  style={{
                    minWidth: '145px',
                    boxShadow:
                        '0 5px 14px rgba(37, 99, 235, 0.2)'
                  }}
              >
                {submitting
                    ? 'Saving Draft...'
                    : 'Save as Draft'}
              </button>
            </div>
          </div>
        </form>
      </div>
  );
}