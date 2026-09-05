import React, { useState, useEffect } from 'react';

/**
 * Reusable form component for registering and editing inventory catalog items.
 */
const EMPTY_INITIAL_VALUES = {};

export default function InventoryItemForm({
  initialValues = EMPTY_INITIAL_VALUES,
  mode = 'create',
  onSubmit,
  onCancel,
  serverFieldErrors = {},
  serverErrorMessage = '',
  submitting = false
}) {
  const [formData, setFormData] = useState({
    itemCode: initialValues?.itemCode || '',
    name: initialValues?.name || '',
    category: initialValues?.category || '',
    unit: initialValues?.unit || '',
    reorderLevel: initialValues?.reorderLevel !== undefined ? String(initialValues.reorderLevel) : '0',
    defaultSupplierReference: initialValues?.defaultSupplierReference || ''
  });

  const [clientErrors, setClientErrors] = useState({});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData({
        itemCode: initialValues.itemCode || '',
        name: initialValues.name || '',
        category: initialValues.category || '',
        unit: initialValues.unit || '',
        reorderLevel: initialValues.reorderLevel !== undefined ? String(initialValues.reorderLevel) : '0',
        defaultSupplierReference: initialValues.defaultSupplierReference || ''
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear client error on change
    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const errors = {};

    if (mode === 'create') {
      if (!formData.itemCode.trim()) {
        errors.itemCode = 'Item code is required';
      } else if (formData.itemCode.trim().length > 50) {
        errors.itemCode = 'Item code must not exceed 50 characters';
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'Item name is required';
    } else if (formData.name.trim().length > 150) {
      errors.name = 'Item name must not exceed 150 characters';
    }

    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    } else if (formData.category.trim().length > 100) {
      errors.category = 'Category must not exceed 100 characters';
    }

    if (!formData.unit.trim()) {
      errors.unit = 'Unit is required';
    } else if (formData.unit.trim().length > 50) {
      errors.unit = 'Unit must not exceed 50 characters';
    }

    const reorderVal = formData.reorderLevel.trim();
    if (reorderVal === '') {
      errors.reorderLevel = 'Reorder level is required';
    } else {
      const num = Number(reorderVal);
      if (isNaN(num) || !Number.isInteger(num) || num < 0) {
        errors.reorderLevel = 'Reorder level must be greater than or equal to zero';
      }
    }

    if (formData.defaultSupplierReference && formData.defaultSupplierReference.trim().length > 150) {
      errors.defaultSupplierReference = 'Default supplier reference must not exceed 150 characters';
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
    if (mode === 'create') {
      onSubmit({
        itemCode: formData.itemCode.trim(),
        name: formData.name.trim(),
        category: formData.category.trim(),
        unit: formData.unit.trim(),
        reorderLevel: parseInt(formData.reorderLevel, 10),
        defaultSupplierReference: formData.defaultSupplierReference.trim() || null
      });
    } else {
      // Edit mode: strictly send UpdateInventoryItemRequest fields only (no itemCode or quantity)
      onSubmit({
        name: formData.name.trim(),
        category: formData.category.trim(),
        unit: formData.unit.trim(),
        reorderLevel: parseInt(formData.reorderLevel, 10),
        defaultSupplierReference: formData.defaultSupplierReference.trim() || null
      });
    }
  };

  // Merge client and server field errors
  const errors = { ...clientErrors, ...serverFieldErrors };

  return (
    <div className="form-card">
      {serverErrorMessage && (
        <div className="error-alert" role="alert">
          <p>{serverErrorMessage}</p>
        </div>
      )}

      {mode === 'create' && (
        <div className="info-callout" role="note">
          Initial stock is 0. Stock quantity is changed through stock movement operations.
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="itemCode">
            Item Code {mode === 'create' && <span className="required-star">*</span>}
          </label>
          {mode === 'create' ? (
            <>
              <input
                id="itemCode"
                name="itemCode"
                type="text"
                className="form-input"
                maxLength={50}
                value={formData.itemCode}
                onChange={handleChange}
                disabled={submitting}
                aria-invalid={Boolean(errors.itemCode)}
                aria-describedby={errors.itemCode ? 'itemCode-error' : undefined}
                required
              />
              {errors.itemCode && (
                <span id="itemCode-error" className="field-error" role="alert">
                  {errors.itemCode}
                </span>
              )}
            </>
          ) : (
            <>
              <input
                id="itemCode"
                name="itemCode"
                type="text"
                className="form-input"
                value={formData.itemCode}
                readOnly
                disabled
                aria-readonly="true"
              />
              <span className="form-help">Item code cannot be changed once created.</span>
            </>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="name">
            Item Name <span className="required-star">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="form-input"
            maxLength={150}
            value={formData.name}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            required
          />
          {errors.name && (
            <span id="name-error" className="field-error" role="alert">
              {errors.name}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="category">
            Category <span className="required-star">*</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            className="form-input"
            maxLength={100}
            value={formData.category}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'category-error' : undefined}
            required
          />
          {errors.category && (
            <span id="category-error" className="field-error" role="alert">
              {errors.category}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="unit">
            Unit of Measurement <span className="required-star">*</span>
          </label>
          <input
            id="unit"
            name="unit"
            type="text"
            className="form-input"
            maxLength={50}
            placeholder="e.g. piece, box, bottle, pack"
            value={formData.unit}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={errors.unit ? 'unit-error' : undefined}
            required
          />
          {errors.unit && (
            <span id="unit-error" className="field-error" role="alert">
              {errors.unit}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="reorderLevel">
            Reorder Level <span className="required-star">*</span>
          </label>
          <input
            id="reorderLevel"
            name="reorderLevel"
            type="number"
            min="0"
            step="1"
            className="form-input"
            value={formData.reorderLevel}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(errors.reorderLevel)}
            aria-describedby={errors.reorderLevel ? 'reorderLevel-error' : undefined}
            required
          />
          {errors.reorderLevel && (
            <span id="reorderLevel-error" className="field-error" role="alert">
              {errors.reorderLevel}
            </span>
          )}
          <span className="form-help">When stock drops to or below this level, low-stock warnings trigger.</span>
        </div>

        <div className="form-group">
          <label htmlFor="defaultSupplierReference">Default Supplier Reference</label>
          <input
            id="defaultSupplierReference"
            name="defaultSupplierReference"
            type="text"
            className="form-input"
            maxLength={150}
            placeholder="Supplier name or reference code"
            value={formData.defaultSupplierReference}
            onChange={handleChange}
            disabled={submitting}
            aria-invalid={Boolean(errors.defaultSupplierReference)}
            aria-describedby={errors.defaultSupplierReference ? 'supplier-error' : undefined}
          />
          {errors.defaultSupplierReference && (
            <span id="supplier-error" className="field-error" role="alert">
              {errors.defaultSupplierReference}
            </span>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : (mode === 'create' ? 'Register Item' : 'Save Changes')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
