import React, { useState, useEffect } from 'react';

/**
 * ExaminationForm provides inputs and client-side validation
 * for creating or editing a clinical examination.
 */
export function ExaminationForm({
  initialValues = {},
  onSubmit,
  submitting = false,
  submitLabel = 'Save Examination',
  serverError = '',
  onCancel
}) {
  const [formData, setFormData] = useState({
    patientId: initialValues?.patientId !== undefined && initialValues?.patientId !== null ? String(initialValues.patientId) : '',
    dentistId: initialValues?.dentistId !== undefined && initialValues?.dentistId !== null ? String(initialValues.dentistId) : '',
    appointmentId: initialValues?.appointmentId !== undefined && initialValues?.appointmentId !== null ? String(initialValues.appointmentId) : '',
    recordedByUserId: initialValues?.recordedByUserId !== undefined && initialValues?.recordedByUserId !== null ? String(initialValues.recordedByUserId) : '',
    examinationDate: initialValues?.examinationDate || '',
    chiefComplaint: initialValues?.chiefComplaint || '',
    clinicalObservations: initialValues?.clinicalObservations || '',
    provisionalDiagnosis: initialValues?.provisionalDiagnosis || '',
    clinicalNotes: initialValues?.clinicalNotes || initialValues?.followUpNotes || ''
  });

  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData({
        patientId: initialValues.patientId !== undefined && initialValues.patientId !== null ? String(initialValues.patientId) : '',
        dentistId: initialValues.dentistId !== undefined && initialValues.dentistId !== null ? String(initialValues.dentistId) : '',
        appointmentId: initialValues.appointmentId !== undefined && initialValues.appointmentId !== null ? String(initialValues.appointmentId) : '',
        recordedByUserId: initialValues.recordedByUserId !== undefined && initialValues.recordedByUserId !== null ? String(initialValues.recordedByUserId) : '',
        examinationDate: initialValues.examinationDate || '',
        chiefComplaint: initialValues.chiefComplaint || '',
        clinicalObservations: initialValues.clinicalObservations || '',
        provisionalDiagnosis: initialValues.provisionalDiagnosis || '',
        clinicalNotes: initialValues.clinicalNotes || initialValues.followUpNotes || ''
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.patientId.trim()) {
      errors.patientId = 'Patient ID is required';
    } else {
      const num = Number(formData.patientId);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        errors.patientId = 'Patient ID must be a positive integer';
      }
    }

    if (!formData.dentistId.trim()) {
      errors.dentistId = 'Dentist ID is required';
    } else {
      const num = Number(formData.dentistId);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        errors.dentistId = 'Dentist ID must be a positive integer';
      }
    }

    if (formData.appointmentId && formData.appointmentId.trim()) {
      const num = Number(formData.appointmentId);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        errors.appointmentId = 'Appointment ID must be a positive integer';
      }
    }

    if (!formData.recordedByUserId.trim()) {
      errors.recordedByUserId = 'Recorded-by user ID is required';
    } else {
      const num = Number(formData.recordedByUserId);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        errors.recordedByUserId = 'Recorded-by user ID must be a positive integer';
      }
    }

    if (!formData.examinationDate.trim()) {
      errors.examinationDate = 'Examination date is required';
    }

    if (!formData.chiefComplaint.trim()) {
      errors.chiefComplaint = 'Chief complaint is required';
    }

    if (formData.provisionalDiagnosis && formData.provisionalDiagnosis.trim().length > 500) {
      errors.provisionalDiagnosis = 'Provisional diagnosis cannot exceed 500 characters';
    }

    if (formData.clinicalNotes && formData.clinicalNotes.trim().length > 500) {
      errors.clinicalNotes = 'Clinical notes cannot exceed 500 characters';
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setClientErrors({});
    if (onSubmit) {
      onSubmit({
        patientId: Number(formData.patientId),
        dentistId: Number(formData.dentistId),
        appointmentId: formData.appointmentId.trim() ? Number(formData.appointmentId) : null,
        recordedByUserId: Number(formData.recordedByUserId),
        examinationDate: formData.examinationDate,
        chiefComplaint: formData.chiefComplaint.trim(),
        clinicalObservations: formData.clinicalObservations.trim() || null,
        provisionalDiagnosis: formData.provisionalDiagnosis.trim() || null,
        clinicalNotes: formData.clinicalNotes.trim() || null,
        followUpNotes: formData.clinicalNotes.trim() || null
      });
    }
  };

  return (
    <div className="form-card">
      {serverError && (
        <div className="error-alert" role="alert">
          <p>{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="patientId">
              Patient ID <span className="required-star">*</span>
            </label>
            <input
              id="patientId"
              name="patientId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.patientId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.patientId)}
              aria-describedby={clientErrors.patientId ? 'patientId-error' : undefined}
              required
            />
            {clientErrors.patientId && (
              <span id="patientId-error" className="field-error" role="alert">
                {clientErrors.patientId}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="dentistId">
              Dentist ID <span className="required-star">*</span>
            </label>
            <input
              id="dentistId"
              name="dentistId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.dentistId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.dentistId)}
              aria-describedby={clientErrors.dentistId ? 'dentistId-error' : undefined}
              required
            />
            {clientErrors.dentistId && (
              <span id="dentistId-error" className="field-error" role="alert">
                {clientErrors.dentistId}
              </span>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="recordedByUserId">
              Recorded By User ID <span className="required-star">*</span>
            </label>
            <input
              id="recordedByUserId"
              name="recordedByUserId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.recordedByUserId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.recordedByUserId)}
              aria-describedby={clientErrors.recordedByUserId ? 'recordedByUserId-error' : undefined}
              required
            />
            {clientErrors.recordedByUserId && (
              <span id="recordedByUserId-error" className="field-error" role="alert">
                {clientErrors.recordedByUserId}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="appointmentId">Appointment ID (optional)</label>
            <input
              id="appointmentId"
              name="appointmentId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.appointmentId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.appointmentId)}
              aria-describedby={clientErrors.appointmentId ? 'appointmentId-error' : undefined}
            />
            {clientErrors.appointmentId && (
              <span id="appointmentId-error" className="field-error" role="alert">
                {clientErrors.appointmentId}
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="examinationDate">
            Examination Date <span className="required-star">*</span>
          </label>
          <input
            id="examinationDate"
            name="examinationDate"
            type="date"
            className="form-input"
            value={formData.examinationDate}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.examinationDate)}
            aria-describedby={clientErrors.examinationDate ? 'examinationDate-error' : undefined}
            required
          />
          {clientErrors.examinationDate && (
            <span id="examinationDate-error" className="field-error" role="alert">
              {clientErrors.examinationDate}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="chiefComplaint">
            Chief Complaint <span className="required-star">*</span>
          </label>
          <textarea
            id="chiefComplaint"
            name="chiefComplaint"
            rows="3"
            className="form-textarea"
            placeholder="Patient's stated primary concern or reason for visit"
            value={formData.chiefComplaint}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.chiefComplaint)}
            aria-describedby={clientErrors.chiefComplaint ? 'chiefComplaint-error' : undefined}
            required
          />
          {clientErrors.chiefComplaint && (
            <span id="chiefComplaint-error" className="field-error" role="alert">
              {clientErrors.chiefComplaint}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="clinicalObservations">Clinical Observations</label>
          <textarea
            id="clinicalObservations"
            name="clinicalObservations"
            rows="3"
            className="form-textarea"
            placeholder="Objective findings, intraoral soft tissue and periodontal inspection notes"
            value={formData.clinicalObservations}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="provisionalDiagnosis">Provisional Diagnosis</label>
          <textarea
            id="provisionalDiagnosis"
            name="provisionalDiagnosis"
            rows="2"
            maxLength={500}
            className="form-textarea"
            placeholder="Preliminary clinical assessment prior to dentist confirmation"
            value={formData.provisionalDiagnosis}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.provisionalDiagnosis)}
            aria-describedby={clientErrors.provisionalDiagnosis ? 'provisionalDiagnosis-error' : undefined}
          />
          {clientErrors.provisionalDiagnosis && (
            <span id="provisionalDiagnosis-error" className="field-error" role="alert">
              {clientErrors.provisionalDiagnosis}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="clinicalNotes">Clinical Notes / Follow-up Notes</label>
          <textarea
            id="clinicalNotes"
            name="clinicalNotes"
            rows="2"
            maxLength={500}
            className="form-textarea"
            placeholder="Additional treatment considerations or follow-up recommendations"
            value={formData.clinicalNotes}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.clinicalNotes)}
            aria-describedby={clientErrors.clinicalNotes ? 'clinicalNotes-error' : undefined}
          />
          {clientErrors.clinicalNotes && (
            <span id="clinicalNotes-error" className="field-error" role="alert">
              {clientErrors.clinicalNotes}
            </span>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ExaminationForm;
