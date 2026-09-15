import React, { useState, useEffect } from 'react';

/**
 * TreatmentPlanForm handles input and validation for proposing
 * or updating a dental treatment plan.
 */
export function TreatmentPlanForm({
  initialValues = {},
  onSubmit,
  submitting = false,
  submitLabel = 'Save Treatment Plan',
  serverError = '',
  onCancel
}) {
  const [formData, setFormData] = useState({
    patientId: initialValues?.patientId !== undefined && initialValues?.patientId !== null ? String(initialValues.patientId) : '',
    dentistId: initialValues?.dentistId !== undefined && initialValues?.dentistId !== null ? String(initialValues.dentistId) : '',
    examinationId: initialValues?.examinationId !== undefined && initialValues?.examinationId !== null ? String(initialValues.examinationId) : '',
    createdByUserId: initialValues?.createdByUserId !== undefined && initialValues?.createdByUserId !== null ? String(initialValues.createdByUserId) : '',
    planName: initialValues?.planName || initialValues?.title || '',
    totalEstimatedCost: initialValues?.totalEstimatedCost !== undefined && initialValues?.totalEstimatedCost !== null
      ? String(initialValues.totalEstimatedCost)
      : (initialValues?.estimatedCost !== undefined && initialValues?.estimatedCost !== null ? String(initialValues.estimatedCost) : '0.00'),
    clinicalNotes: initialValues?.clinicalNotes || initialValues?.notes || ''
  });

  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData({
        patientId: initialValues.patientId !== undefined && initialValues.patientId !== null ? String(initialValues.patientId) : '',
        dentistId: initialValues.dentistId !== undefined && initialValues.dentistId !== null ? String(initialValues.dentistId) : '',
        examinationId: initialValues.examinationId !== undefined && initialValues.examinationId !== null ? String(initialValues.examinationId) : '',
        createdByUserId: initialValues.createdByUserId !== undefined && initialValues.createdByUserId !== null ? String(initialValues.createdByUserId) : '',
        planName: initialValues.planName || initialValues.title || '',
        totalEstimatedCost: initialValues.totalEstimatedCost !== undefined && initialValues.totalEstimatedCost !== null
          ? String(initialValues.totalEstimatedCost)
          : (initialValues.estimatedCost !== undefined && initialValues.estimatedCost !== null ? String(initialValues.estimatedCost) : '0.00'),
        clinicalNotes: initialValues.clinicalNotes || initialValues.notes || ''
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

    if (formData.examinationId && formData.examinationId.trim()) {
      const num = Number(formData.examinationId);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        errors.examinationId = 'Examination ID must be a positive integer';
      }
    }

    if (!formData.createdByUserId.trim()) {
      errors.createdByUserId = 'Created-by user ID is required';
    } else {
      const num = Number(formData.createdByUserId);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        errors.createdByUserId = 'Created-by user ID must be a positive integer';
      }
    }

    if (!formData.planName.trim()) {
      errors.planName = 'Plan name is required';
    } else if (formData.planName.trim().length > 150) {
      errors.planName = 'Plan name cannot exceed 150 characters';
    }

    if (formData.totalEstimatedCost.trim() !== '') {
      const cost = Number(formData.totalEstimatedCost);
      if (isNaN(cost) || cost < 0) {
        errors.totalEstimatedCost = 'Estimated cost must be greater than or equal to zero';
      }
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
      const parsedCost = formData.totalEstimatedCost.trim() !== '' ? Number(formData.totalEstimatedCost) : 0;
      onSubmit({
        patientId: Number(formData.patientId),
        dentistId: Number(formData.dentistId),
        examinationId: formData.examinationId.trim() ? Number(formData.examinationId) : null,
        createdByUserId: Number(formData.createdByUserId),
        planName: formData.planName.trim(),
        title: formData.planName.trim(),
        totalEstimatedCost: parsedCost,
        estimatedCost: parsedCost,
        clinicalNotes: formData.clinicalNotes.trim() || null,
        notes: formData.clinicalNotes.trim() || null
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
            <label htmlFor="planPatientId">
              Patient ID <span className="required-star">*</span>
            </label>
            <input
              id="planPatientId"
              name="patientId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.patientId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.patientId)}
              aria-describedby={clientErrors.patientId ? 'planPatientId-error' : undefined}
              required
            />
            {clientErrors.patientId && (
              <span id="planPatientId-error" className="field-error" role="alert">
                {clientErrors.patientId}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="planDentistId">
              Dentist ID <span className="required-star">*</span>
            </label>
            <input
              id="planDentistId"
              name="dentistId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.dentistId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.dentistId)}
              aria-describedby={clientErrors.dentistId ? 'planDentistId-error' : undefined}
              required
            />
            {clientErrors.dentistId && (
              <span id="planDentistId-error" className="field-error" role="alert">
                {clientErrors.dentistId}
              </span>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="planCreatedByUserId">
              Created By User ID <span className="required-star">*</span>
            </label>
            <input
              id="planCreatedByUserId"
              name="createdByUserId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.createdByUserId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.createdByUserId)}
              aria-describedby={clientErrors.createdByUserId ? 'planCreatedByUserId-error' : undefined}
              required
            />
            {clientErrors.createdByUserId && (
              <span id="planCreatedByUserId-error" className="field-error" role="alert">
                {clientErrors.createdByUserId}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="planExaminationId">Examination ID (optional)</label>
            <input
              id="planExaminationId"
              name="examinationId"
              type="number"
              min="1"
              step="1"
              className="form-input"
              value={formData.examinationId}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.examinationId)}
              aria-describedby={clientErrors.examinationId ? 'planExaminationId-error' : undefined}
            />
            {clientErrors.examinationId && (
              <span id="planExaminationId-error" className="field-error" role="alert">
                {clientErrors.examinationId}
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="planName">
            Plan Title / Name <span className="required-star">*</span>
          </label>
          <input
            id="planName"
            name="planName"
            type="text"
            maxLength={150}
            className="form-input"
            placeholder="e.g. Comprehensive Maxillary Restorative Plan"
            value={formData.planName}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.planName)}
            aria-describedby={clientErrors.planName ? 'planName-error' : undefined}
            required
          />
          {clientErrors.planName && (
            <span id="planName-error" className="field-error" role="alert">
              {clientErrors.planName}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="totalEstimatedCost">Total Estimated Cost ($)</label>
          <input
            id="totalEstimatedCost"
            name="totalEstimatedCost"
            type="number"
            min="0"
            step="0.01"
            className="form-input"
            value={formData.totalEstimatedCost}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.totalEstimatedCost)}
            aria-describedby={clientErrors.totalEstimatedCost ? 'totalEstimatedCost-error' : undefined}
          />
          {clientErrors.totalEstimatedCost && (
            <span id="totalEstimatedCost-error" className="field-error" role="alert">
              {clientErrors.totalEstimatedCost}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="planClinicalNotes">Clinical Notes / Rationale</label>
          <textarea
            id="planClinicalNotes"
            name="clinicalNotes"
            rows="3"
            className="form-textarea"
            placeholder="Clinical objectives, sequencing rationale, or patient considerations"
            value={formData.clinicalNotes}
            onChange={handleChange}
            disabled={submitting}
          />
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

export default TreatmentPlanForm;
