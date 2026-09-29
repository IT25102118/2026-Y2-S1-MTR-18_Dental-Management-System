import React, { useState, useEffect } from 'react';

/**
 * ToothFindingForm handles recording tooth findings or general oral conditions.
 *
 * @param {Object} initialValues Initial finding data for edit or pre-fill
 * @param {Function} onSubmit Callback invoked with normalized finding payload
 * @param {boolean} submitting Indicates if form submission is in progress
 * @param {string} submitLabel Button text for the submit action
 * @param {string} serverError Server error message to display
 * @param {Function} onCancel Optional callback for cancellation
 */
export function ToothFindingForm({
  initialValues = {},
  onSubmit,
  submitting = false,
  submitLabel = 'Save Finding',
  serverError = '',
  onCancel
}) {
  const [formData, setFormData] = useState({
    isGeneral: Boolean(initialValues?.isGeneral),
    toothNumber: initialValues?.toothNumber !== undefined && initialValues?.toothNumber !== null ? String(initialValues.toothNumber) : '',
    conditionName: initialValues?.conditionName || '',
    notes: initialValues?.notes || '',
    recordedByUserId: initialValues?.recordedByUserId !== undefined && initialValues?.recordedByUserId !== null ? String(initialValues.recordedByUserId) : ''
  });

  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData({
        isGeneral: Boolean(initialValues.isGeneral),
        toothNumber: initialValues.toothNumber !== undefined && initialValues.toothNumber !== null ? String(initialValues.toothNumber) : '',
        conditionName: initialValues.conditionName || '',
        notes: initialValues.notes || '',
        recordedByUserId: initialValues.recordedByUserId !== undefined && initialValues.recordedByUserId !== null ? String(initialValues.recordedByUserId) : ''
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => {
        const nextGeneral = checked;
        return {
          ...prev,
          isGeneral: nextGeneral,
          // Clear toothNumber when general is checked
          toothNumber: nextGeneral ? '' : prev.toothNumber
        };
      });
      if (clientErrors.toothNumber) {
        setClientErrors((prev) => ({ ...prev, toothNumber: undefined }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (clientErrors[name]) {
        setClientErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.isGeneral) {
      if (!formData.toothNumber.trim()) {
        errors.toothNumber = 'Tooth number is required when not a general condition';
      } else {
        const num = Number(formData.toothNumber);
        if (isNaN(num) || !Number.isInteger(num) || num < 11 || num > 48) {
          errors.toothNumber = 'Tooth number must be a valid FDI code (11–48)';
        }
      }
    }

    if (!formData.conditionName.trim()) {
      errors.conditionName = 'Condition name is required';
    } else if (formData.conditionName.trim().length > 150) {
      errors.conditionName = 'Condition name cannot exceed 150 characters';
    }

    if (formData.notes && formData.notes.trim().length > 500) {
      errors.notes = 'Notes cannot exceed 500 characters';
    }

    if (formData.recordedByUserId && formData.recordedByUserId.trim()) {
      const num = Number(formData.recordedByUserId);
      if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
        errors.recordedByUserId = 'Recorded-by user ID must be a positive integer';
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
      onSubmit({
        toothNumber: formData.isGeneral ? null : Number(formData.toothNumber),
        isGeneral: Boolean(formData.isGeneral),
        conditionName: formData.conditionName.trim(),
        notes: formData.notes.trim() || null,
        ...(formData.recordedByUserId.trim() ? { recordedByUserId: Number(formData.recordedByUserId) } : {})
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
        <div className="form-group form-checkbox-group">
          <label htmlFor="isGeneral" className="checkbox-label">
            <input
              id="isGeneral"
              name="isGeneral"
              type="checkbox"
              checked={formData.isGeneral}
              onChange={handleChange}
              disabled={submitting}
            />
            <span>General oral condition (not specific to a single tooth)</span>
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="toothNumber">
              Tooth Number (FDI 11–48) {!formData.isGeneral && <span className="required-star">*</span>}
            </label>
            <input
              id="toothNumber"
              name="toothNumber"
              type="number"
              min="11"
              max="48"
              step="1"
              className="form-input"
              placeholder="e.g. 16, 21, 36"
              value={formData.toothNumber}
              onChange={handleChange}
              disabled={formData.isGeneral || submitting}
              aria-invalid={Boolean(clientErrors.toothNumber)}
              aria-describedby={clientErrors.toothNumber ? 'toothNumber-error' : undefined}
              required={!formData.isGeneral}
            />
            {clientErrors.toothNumber && (
              <span id="toothNumber-error" className="field-error" role="alert">
                {clientErrors.toothNumber}
              </span>
            )}
            {formData.isGeneral && (
              <span className="form-help">Disabled for general oral conditions.</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="conditionName">
              Condition Name <span className="required-star">*</span>
            </label>
            <input
              id="conditionName"
              name="conditionName"
              type="text"
              maxLength={150}
              className="form-input"
              placeholder="e.g. Dental Caries, Pulpitis, Gingivitis"
              value={formData.conditionName}
              onChange={handleChange}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.conditionName)}
              aria-describedby={clientErrors.conditionName ? 'conditionName-error' : undefined}
              required
            />
            {clientErrors.conditionName && (
              <span id="conditionName-error" className="field-error" role="alert">
                {clientErrors.conditionName}
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Clinical Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            maxLength={500}
            className="form-textarea"
            placeholder="Detailed description, severity, or localized pathology"
            value={formData.notes}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.notes)}
            aria-describedby={clientErrors.notes ? 'notes-error' : undefined}
          />
          {clientErrors.notes && (
            <span id="notes-error" className="field-error" role="alert">
              {clientErrors.notes}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="findingRecordedByUserId">Recorded By User ID</label>
          <input
            id="findingRecordedByUserId"
            name="recordedByUserId"
            type="number"
            min="1"
            step="1"
            className="form-input"
            value={formData.recordedByUserId}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(clientErrors.recordedByUserId)}
            aria-describedby={clientErrors.recordedByUserId ? 'findingRecordedByUserId-error' : undefined}
          />
          {clientErrors.recordedByUserId && (
            <span id="findingRecordedByUserId-error" className="field-error" role="alert">
              {clientErrors.recordedByUserId}
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

export default ToothFindingForm;
