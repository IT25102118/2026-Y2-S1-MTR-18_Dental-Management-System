import React, { useState, useEffect } from 'react';

/**
 * ProcedureForm handles adding, modifying, or completing an individual
 * treatment procedure within a treatment plan.
 *
 * @param {Object} initialValues Initial procedure data
 * @param {Function} onSubmit Submission callback receiving normalized payload
 * @param {boolean} submitting Indicates if submit request is in-flight
 * @param {string} submitLabel Button label
 * @param {string} serverError Server error string to display
 * @param {string} mode Form mode: 'add' | 'edit' | 'complete'
 * @param {Function} onCancel Optional cancel callback
 */
export function ProcedureForm({
  initialValues = {},
  onSubmit,
  submitting = false,
  submitLabel,
  serverError = '',
  mode = 'add',
  onCancel
}) {
  const isCompleteMode = mode === 'complete';

  const defaultSubmitLabel = isCompleteMode
    ? 'Complete Procedure'
    : (mode === 'edit' ? 'Update Procedure' : 'Add Procedure');

  const [formData, setFormData] = useState({
    // Add / Edit fields
    procedureName: initialValues?.procedureName || '',
    procedureCode: initialValues?.procedureCode || '',
    toothNumber: initialValues?.toothNumber !== undefined && initialValues?.toothNumber !== null ? String(initialValues.toothNumber) : '',
    sequenceNumber: initialValues?.sequenceNumber !== undefined && initialValues?.sequenceNumber !== null ? String(initialValues.sequenceNumber) : '1',
    quantity: initialValues?.quantity !== undefined && initialValues?.quantity !== null ? String(initialValues.quantity) : '1',
    estimatedCost: initialValues?.estimatedCost !== undefined && initialValues?.estimatedCost !== null
      ? String(initialValues.estimatedCost)
      : (initialValues?.unitCost !== undefined && initialValues?.unitCost !== null ? String(initialValues.unitCost) : '0.00'),

    // Complete mode fields
    performedByDentistId: initialValues?.performedByDentistId !== undefined && initialValues?.performedByDentistId !== null
      ? String(initialValues.performedByDentistId)
      : (initialValues?.dentistId !== undefined && initialValues?.dentistId !== null ? String(initialValues.dentistId) : ''),
    assistedByUserId: initialValues?.assistedByUserId !== undefined && initialValues?.assistedByUserId !== null ? String(initialValues.assistedByUserId) : '',
    completionDate: initialValues?.completionDate || new Date().toISOString().split('T')[0],
    actualCost: initialValues?.actualCost !== undefined && initialValues?.actualCost !== null
      ? String(initialValues.actualCost)
      : (initialValues?.estimatedCost !== undefined && initialValues?.estimatedCost !== null ? String(initialValues.estimatedCost) : '0.00'),

    // Shared field
    clinicalProgressNotes: initialValues?.clinicalProgressNotes || ''
  });

  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData({
        procedureName: initialValues.procedureName || '',
        procedureCode: initialValues.procedureCode || '',
        toothNumber: initialValues.toothNumber !== undefined && initialValues.toothNumber !== null ? String(initialValues.toothNumber) : '',
        sequenceNumber: initialValues.sequenceNumber !== undefined && initialValues.sequenceNumber !== null ? String(initialValues.sequenceNumber) : '1',
        quantity: initialValues.quantity !== undefined && initialValues.quantity !== null ? String(initialValues.quantity) : '1',
        estimatedCost: initialValues.estimatedCost !== undefined && initialValues.estimatedCost !== null
          ? String(initialValues.estimatedCost)
          : (initialValues.unitCost !== undefined && initialValues.unitCost !== null ? String(initialValues.unitCost) : '0.00'),
        performedByDentistId: initialValues.performedByDentistId !== undefined && initialValues.performedByDentistId !== null
          ? String(initialValues.performedByDentistId)
          : (initialValues.dentistId !== undefined && initialValues.dentistId !== null ? String(initialValues.dentistId) : ''),
        assistedByUserId: initialValues.assistedByUserId !== undefined && initialValues.assistedByUserId !== null ? String(initialValues.assistedByUserId) : '',
        completionDate: initialValues.completionDate || new Date().toISOString().split('T')[0],
        actualCost: initialValues.actualCost !== undefined && initialValues.actualCost !== null
          ? String(initialValues.actualCost)
          : (initialValues.estimatedCost !== undefined && initialValues.estimatedCost !== null ? String(initialValues.estimatedCost) : '0.00'),
        clinicalProgressNotes: initialValues.clinicalProgressNotes || ''
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

    if (isCompleteMode) {
      if (!formData.performedByDentistId.trim()) {
        errors.performedByDentistId = 'Performing dentist ID is required';
      } else {
        const num = Number(formData.performedByDentistId);
        if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
          errors.performedByDentistId = 'Performing dentist ID must be a positive integer';
        }
      }

      if (formData.actualCost.trim() !== '') {
        const cost = Number(formData.actualCost);
        if (isNaN(cost) || cost < 0) {
          errors.actualCost = 'Actual cost must be greater than or equal to zero';
        }
      }
    } else {
      if (!formData.procedureName.trim()) {
        errors.procedureName = 'Procedure name is required';
      } else if (formData.procedureName.trim().length > 150) {
        errors.procedureName = 'Procedure name cannot exceed 150 characters';
      }

      if (formData.toothNumber.trim() !== '') {
        const tNum = Number(formData.toothNumber);
        if (isNaN(tNum) || !Number.isInteger(tNum) || tNum < 11 || tNum > 48) {
          errors.toothNumber = 'Tooth number must be a valid FDI code (11–48)';
        }
      }

      if (formData.sequenceNumber.trim() !== '') {
        const seq = Number(formData.sequenceNumber);
        if (isNaN(seq) || !Number.isInteger(seq) || seq < 1) {
          errors.sequenceNumber = 'Sequence number must be at least 1';
        }
      }

      if (formData.quantity.trim() !== '') {
        const qty = Number(formData.quantity);
        if (isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
          errors.quantity = 'Quantity must be greater than zero';
        }
      }

      if (formData.estimatedCost.trim() !== '') {
        const cost = Number(formData.estimatedCost);
        if (isNaN(cost) || cost < 0) {
          errors.estimatedCost = 'Estimated cost must be greater than or equal to zero';
        }
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
      if (isCompleteMode) {
        onSubmit({
          performedByDentistId: Number(formData.performedByDentistId),
          dentistId: Number(formData.performedByDentistId),
          assistedByUserId: formData.assistedByUserId.trim() ? Number(formData.assistedByUserId) : null,
          completionDate: formData.completionDate || new Date().toISOString().split('T')[0],
          actualCost: formData.actualCost.trim() !== '' ? Number(formData.actualCost) : null,
          clinicalProgressNotes: formData.clinicalProgressNotes.trim() || null,
          notes: formData.clinicalProgressNotes.trim() || null
        });
      } else {
        const parsedEstimatedCost = formData.estimatedCost.trim() !== '' ? Number(formData.estimatedCost) : 0;
        onSubmit({
          procedureName: formData.procedureName.trim(),
          procedureCode: formData.procedureCode.trim() || null,
          toothNumber: formData.toothNumber.trim() ? Number(formData.toothNumber) : null,
          sequenceNumber: formData.sequenceNumber.trim() ? Number(formData.sequenceNumber) : 1,
          quantity: formData.quantity.trim() ? Number(formData.quantity) : 1,
          estimatedCost: parsedEstimatedCost,
          unitCost: parsedEstimatedCost,
          clinicalProgressNotes: formData.clinicalProgressNotes.trim() || null
        });
      }
    }
  };

  return (
    <div className="form-card">
      {serverError && (
        <div className="error-alert" role="alert">
          <p>{serverError}</p>
        </div>
      )}

      <form aria-label="Procedure form" onSubmit={handleSubmit} noValidate>
        {isCompleteMode ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="procPerformedByDentistId">
                  Performing Dentist ID <span className="required-star">*</span>
                </label>
                <input
                  id="procPerformedByDentistId"
                  name="performedByDentistId"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={formData.performedByDentistId}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-invalid={Boolean(clientErrors.performedByDentistId)}
                  aria-describedby={clientErrors.performedByDentistId ? 'procPerformedByDentistId-error' : undefined}
                  required
                />
                {clientErrors.performedByDentistId && (
                  <span id="procPerformedByDentistId-error" className="field-error" role="alert">
                    {clientErrors.performedByDentistId}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="procAssistedByUserId">Assisting User ID (optional)</label>
                <input
                  id="procAssistedByUserId"
                  name="assistedByUserId"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={formData.assistedByUserId}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="procCompletionDate">Completion Date</label>
                <input
                  id="procCompletionDate"
                  name="completionDate"
                  type="date"
                  className="form-input"
                  value={formData.completionDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="procActualCost">Actual Cost ($)</label>
                <input
                  id="procActualCost"
                  name="actualCost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={formData.actualCost}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-invalid={Boolean(clientErrors.actualCost)}
                  aria-describedby={clientErrors.actualCost ? 'procActualCost-error' : undefined}
                />
                {clientErrors.actualCost && (
                  <span id="procActualCost-error" className="field-error" role="alert">
                    {clientErrors.actualCost}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="procProcedureName">
                Procedure Name <span className="required-star">*</span>
              </label>
              <input
                id="procProcedureName"
                name="procedureName"
                type="text"
                maxLength={150}
                className="form-input"
                placeholder="e.g. Composite Resin Restoration, Extraction"
                value={formData.procedureName}
                onChange={handleChange}
                disabled={submitting}
                aria-invalid={Boolean(clientErrors.procedureName)}
                aria-describedby={clientErrors.procedureName ? 'procProcedureName-error' : undefined}
                required
              />
              {clientErrors.procedureName && (
                <span id="procProcedureName-error" className="field-error" role="alert">
                  {clientErrors.procedureName}
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="procProcedureCode">Procedure Code (optional)</label>
                <input
                  id="procProcedureCode"
                  name="procedureCode"
                  type="text"
                  maxLength={50}
                  className="form-input"
                  placeholder="e.g. CDT D2391"
                  value={formData.procedureCode}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="procToothNumber">Tooth Number (FDI 11–48, optional)</label>
                <input
                  id="procToothNumber"
                  name="toothNumber"
                  type="number"
                  min="11"
                  max="48"
                  step="1"
                  className="form-input"
                  placeholder="Leave empty for general"
                  value={formData.toothNumber}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-invalid={Boolean(clientErrors.toothNumber)}
                  aria-describedby={clientErrors.toothNumber ? 'procToothNumber-error' : undefined}
                />
                {clientErrors.toothNumber && (
                  <span id="procToothNumber-error" className="field-error" role="alert">
                    {clientErrors.toothNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="procSequenceNumber">Sequence Number</label>
                <input
                  id="procSequenceNumber"
                  name="sequenceNumber"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={formData.sequenceNumber}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-invalid={Boolean(clientErrors.sequenceNumber)}
                  aria-describedby={clientErrors.sequenceNumber ? 'procSequenceNumber-error' : undefined}
                />
                {clientErrors.sequenceNumber && (
                  <span id="procSequenceNumber-error" className="field-error" role="alert">
                    {clientErrors.sequenceNumber}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="procQuantity">Quantity</label>
                <input
                  id="procQuantity"
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  className="form-input"
                  value={formData.quantity}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-invalid={Boolean(clientErrors.quantity)}
                  aria-describedby={clientErrors.quantity ? 'procQuantity-error' : undefined}
                />
                {clientErrors.quantity && (
                  <span id="procQuantity-error" className="field-error" role="alert">
                    {clientErrors.quantity}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="procEstimatedCost">Estimated Cost ($)</label>
                <input
                  id="procEstimatedCost"
                  name="estimatedCost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={formData.estimatedCost}
                  onChange={handleChange}
                  disabled={submitting}
                  aria-invalid={Boolean(clientErrors.estimatedCost)}
                  aria-describedby={clientErrors.estimatedCost ? 'procEstimatedCost-error' : undefined}
                />
                {clientErrors.estimatedCost && (
                  <span id="procEstimatedCost-error" className="field-error" role="alert">
                    {clientErrors.estimatedCost}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="procClinicalProgressNotes">Clinical Progress Notes</label>
          <textarea
            id="procClinicalProgressNotes"
            name="clinicalProgressNotes"
            rows="3"
            className="form-textarea"
            placeholder="Clinical details, materials used, patient tolerance, or progress notes"
            value={formData.clinicalProgressNotes}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : (submitLabel || defaultSubmitLabel)}
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

export default ProcedureForm;
