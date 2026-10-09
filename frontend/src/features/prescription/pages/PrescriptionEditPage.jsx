import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getPrescriptionById,
  updatePrescription
} from '../api/prescriptionApi';
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
        items:
            data.items && data.items.length > 0
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
      setLoadError(
          err.message || `Failed to load prescription #${id}`
      );
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

  const handleNotesChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      notes: e.target.value
    }));

    if (errors.notes) {
      setErrors((prev) => ({
        ...prev,
        notes: null
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
      await updatePrescription(id, {
        notes: formData.notes?.trim() || '',
        items: formData.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity)
        }))
      });

      navigate(`/prescriptions/${id}`, {
        state: {
          message: `Prescription #${id} updated successfully!`
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
          'Failed to update prescription draft.'
      );
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

            <p>
              {loadError ||
                  `Prescription #${id} not found.`}
            </p>

            <Link
                to="/prescriptions"
                className="btn btn-secondary btn-sm"
            >
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
              Prescription #{id} is currently{' '}
              <strong>{prescription.status}</strong>.
              Finalized or cancelled clinical records are
              legally locked and cannot be modified.
            </p>

            <div>
              <Link
                  to={`/prescriptions/${id}`}
                  className="btn btn-primary btn-sm"
              >
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

        {/* Page Header */}
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
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  marginBottom: '0.8rem'
                }}
            >
              EDIT DRAFT
            </div>

            <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}
            >
              <h1 style={{ margin: 0 }}>
                Edit Prescription Draft #
                {prescription.id}
              </h1>

              <PrescriptionStatusBadge
                  status={prescription.status}
              />
            </div>

            <p
                style={{
                  margin: '0.4rem 0 0',
                  color: '#64748b',
                  fontSize: '0.9rem'
                }}
            >
              Update clinical notes or modify prescribed
              medicines before finalization.
            </p>
          </div>

          <Link
              to={`/prescriptions/${prescription.id}`}
              className="btn btn-secondary"
          >
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
          {/* 01 Patient and Dentist */}
          <div
              className="prescription-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '1px solid #dbeafe',
                boxShadow:
                    '0 8px 28px rgba(37, 99, 235, 0.06)'
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
                    marginBottom: '1.25rem',
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
                        margin: 0,
                        fontSize: '1.18rem',
                        color: '#0f172a'
                      }}
                  >
                    Patient &amp; Prescriber Information
                    (Locked)
                  </h2>

                  <p
                      style={{
                        margin: '0.2rem 0 0',
                        color: '#64748b',
                        fontSize: '0.8rem'
                      }}
                  >
                    Patient and dentist cannot be changed
                    after the prescription is created.
                  </p>
                </div>
              </div>

              <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem'
                  }}
              >
                <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                >
                  <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '0.4rem'
                      }}
                  >
                    Patient
                  </div>

                  <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                  >
                    {prescription.patientName ||
                        `Patient #${prescription.patientId}`}
                  </div>

                  <div
                      style={{
                        marginTop: '0.25rem',
                        color: '#64748b',
                        fontSize: '0.78rem'
                      }}
                  >
                    User ID: {prescription.patientId}
                  </div>
                </div>

                <div
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                >
                  <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '0.4rem'
                      }}
                  >
                    Prescribing Dentist
                  </div>

                  <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                  >
                    {prescription.dentistName ||
                        `Dentist #${prescription.dentistId}`}
                  </div>

                  <div
                      style={{
                        marginTop: '0.25rem',
                        color: '#64748b',
                        fontSize: '0.78rem'
                      }}
                  >
                    User ID: {prescription.dentistId}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 02 Clinical Notes */}
          <div
              className="prescription-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '1px solid #e9d5ff',
                boxShadow:
                    '0 8px 28px rgba(126, 34, 206, 0.05)'
              }}
          >
            <div
                style={{
                  height: '4px',
                  background:
                      'linear-gradient(90deg, #7c3aed, #a855f7)'
                }}
            />

            <div style={{ padding: '1.5rem' }}>
              <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    paddingBottom: '1rem',
                    marginBottom: '1.2rem',
                    borderBottom: '1px solid #e2e8f0'
                  }}
              >
                <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: '#f3e8ff',
                      color: '#7e22ce',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}
                >
                  02
                </div>

                <div>
                  <h2
                      style={{
                        margin: 0,
                        fontSize: '1.18rem',
                        color: '#0f172a'
                      }}
                  >
                    Clinical Notes / Instructions
                  </h2>

                  <p
                      style={{
                        margin: '0.2rem 0 0',
                        color: '#64748b',
                        fontSize: '0.8rem'
                      }}
                  >
                    Update diagnosis, treatment notes or
                    clinical instructions.
                  </p>
                </div>
              </div>

              <div
                  className="form-group"
                  style={{ marginBottom: 0 }}
              >
                <label htmlFor="notes">
                  Clinical Notes
                </label>

                <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    placeholder="Clinical notes, diagnosis, instructions..."
                    value={formData.notes}
                    onChange={handleNotesChange}
                    disabled={submitting}
                    className={
                      errors.notes ? 'has-error' : ''
                    }
                    style={{
                      minHeight: '110px',
                      resize: 'vertical'
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
                  Maximum 2,000 characters.
                </span>

                  <span className="form-help">
                  {formData.notes.length} / 2000
                </span>
                </div>
              </div>
            </div>
          </div>

          {/* 03 Medication */}
          <div
              className="prescription-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '1px solid #ccfbf1',
                boxShadow:
                    '0 8px 28px rgba(13, 148, 136, 0.06)'
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
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}
                >
                  03
                </div>

                <div>
                  <h2
                      style={{
                        margin: 0,
                        fontSize: '1.18rem',
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
                    Update medicine, dosage, frequency,
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

          {/* Bottom Save Area */}
          <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow:
                    '0 6px 20px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
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
                Save draft changes
              </strong>

              <span
                  style={{
                    display: 'block',
                    color: '#64748b',
                    fontSize: '0.76rem',
                    marginTop: '0.2rem'
                  }}
              >
              This prescription remains editable until
              it is finalized.
            </span>
            </div>

            <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem'
                }}
            >
              <Link
                  to={`/prescriptions/${prescription.id}`}
                  className="btn btn-secondary"
              >
                Discard Changes
              </Link>

              <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-update-prescription"
                  disabled={submitting}
                  style={{
                    minWidth: '145px',
                    boxShadow:
                        '0 5px 14px rgba(37, 99, 235, 0.2)'
                  }}
              >
                {submitting
                    ? 'Saving Changes...'
                    : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
  );
}