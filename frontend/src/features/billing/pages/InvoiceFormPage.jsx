import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getInvoice, createInvoice, updateInvoice, BillingApiError } from '../api/billingApi';
import '../billing.css';

/**
 * Returns today's calendar date as YYYY-MM-DD.
 */
function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * MF-05 UI-BIL-02 Staff Invoice Form Page.
 * Supports creating an invoice draft and editing an existing DRAFT invoice.
 */
export default function InvoiceFormPage({ mode: modeProp }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = modeProp === 'edit' || Boolean(id);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [formData, setFormData] = useState({
    patientId: '',
    invoiceDate: getTodayIsoDate(),
    treatmentPlanId: '',
    discountAmount: '',
    notes: '',
    items: []
  });

  const [clientErrors, setClientErrors] = useState({});
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load existing invoice if in edit mode
  useEffect(() => {
    if (!isEdit || !id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    getInvoice(id)
      .then((data) => {
        if (!isMounted) return;
        setInvoice(data);
        if (data.status === 'DRAFT') {
          setFormData({
            patientId: String(data.patientId ?? ''),
            invoiceDate: data.invoiceDate || getTodayIsoDate(),
            treatmentPlanId: data.treatmentPlanId !== null && data.treatmentPlanId !== undefined ? String(data.treatmentPlanId) : '',
            discountAmount: data.discountAmount !== null && data.discountAmount !== undefined ? String(data.discountAmount) : '',
            notes: data.notes || '',
            items: (data.items || []).map((it) => ({
              description: it.description || '',
              quantity: it.quantity !== undefined ? String(it.quantity) : '1',
              unitPrice: it.unitPrice !== undefined ? String(it.unitPrice) : '0.00',
              treatmentProcedureId: it.treatmentProcedureId !== null && it.treatmentProcedureId !== undefined ? String(it.treatmentProcedureId) : ''
            }))
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err instanceof BillingApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(err.message || 'Failed to load invoice details.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, isEdit]);

  // Live financial preview calculations (display-only)
  const { subtotalPreview, totalPreview } = useMemo(() => {
    let subtotal = 0;
    formData.items.forEach((item) => {
      const q = Number(item.quantity);
      const p = Number(item.unitPrice);
      if (!isNaN(q) && !isNaN(p) && q > 0 && p >= 0) {
        subtotal += q * p;
      }
    });

    const discount = Number(formData.discountAmount);
    const validDiscount = !isNaN(discount) && discount > 0 ? discount : 0;
    const total = Math.max(0, subtotal - validDiscount);

    return {
      subtotalPreview: subtotal,
      totalPreview: total
    };
  }, [formData.items, formData.discountAmount]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (clientErrors[name]) {
      setClientErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });

    if (clientErrors.items && clientErrors.items[index] && clientErrors.items[index][field]) {
      setClientErrors((prev) => {
        const nextItems = [...(prev.items || [])];
        if (nextItems[index]) {
          nextItems[index] = { ...nextItems[index], [field]: undefined };
        }
        return { ...prev, items: nextItems };
      });
    }
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: '1',
          unitPrice: '0.00',
          treatmentProcedureId: ''
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));

    setClientErrors((prev) => {
      if (!prev.items) return prev;
      const nextItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: nextItems };
    });
  };

  const validate = () => {
    const errors = {};

    if (!isEdit) {
      const trimmedPatient = String(formData.patientId || '').trim();
      if (!trimmedPatient) {
        errors.patientId = 'Patient ID is required';
      } else {
        const num = Number(trimmedPatient);
        if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
          errors.patientId = 'Patient ID must be a positive integer';
        }
      }
    }

    if (formData.treatmentPlanId && String(formData.treatmentPlanId).trim()) {
      const planId = Number(formData.treatmentPlanId);
      if (isNaN(planId) || !Number.isInteger(planId) || planId <= 0) {
        errors.treatmentPlanId = 'Treatment plan ID must be a positive integer';
      }
    }

    // Item-level validations
    const itemErrors = [];
    let hasItemErrors = false;

    formData.items.forEach((item, index) => {
      const itemErr = {};
      if (!item.description || !item.description.trim()) {
        itemErr.description = 'Description is required';
      } else if (item.description.trim().length > 255) {
        itemErr.description = 'Description must not exceed 255 characters';
      }

      const qty = Number(item.quantity);
      if (item.quantity === '' || item.quantity === undefined || isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
        itemErr.quantity = 'Quantity must be an integer of at least 1';
      }

      const price = Number(item.unitPrice);
      if (item.unitPrice === '' || item.unitPrice === undefined || isNaN(price) || price < 0) {
        itemErr.unitPrice = 'Unit price must be non-negative';
      }

      if (item.treatmentProcedureId && String(item.treatmentProcedureId).trim()) {
        const procId = Number(item.treatmentProcedureId);
        if (isNaN(procId) || !Number.isInteger(procId) || procId <= 0) {
          itemErr.treatmentProcedureId = 'Procedure ID must be a positive integer';
        }
      }

      if (Object.keys(itemErr).length > 0) {
        itemErrors[index] = itemErr;
        hasItemErrors = true;
      }
    });

    if (hasItemErrors) {
      errors.items = itemErrors;
    }

    // Discount validation
    if (formData.discountAmount && String(formData.discountAmount).trim()) {
      const discount = Number(formData.discountAmount);
      if (isNaN(discount) || discount < 0) {
        errors.discountAmount = 'Discount amount must be non-negative';
      }
    }

    // Notes validation
    if (formData.notes && formData.notes.length > 500) {
      errors.notes = 'Notes must not exceed 500 characters';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      setSubmitError('Please correct the highlighted form errors.');
      return;
    }

    setSubmitting(true);
    setClientErrors({});
    setServerFieldErrors({});
    setSubmitError('');

    try {
      const itemsPayload = formData.items.map((it) => {
        const itemObj = {
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice)
        };
        if (it.treatmentProcedureId && String(it.treatmentProcedureId).trim()) {
          itemObj.treatmentProcedureId = Number(it.treatmentProcedureId);
        }
        return itemObj;
      });

      if (isEdit) {
        const updatePayload = {
          items: itemsPayload
        };
        if (formData.invoiceDate) {
          updatePayload.invoiceDate = formData.invoiceDate;
        }
        if (formData.treatmentPlanId && String(formData.treatmentPlanId).trim()) {
          updatePayload.treatmentPlanId = Number(formData.treatmentPlanId);
        }
        if (formData.discountAmount && String(formData.discountAmount).trim()) {
          updatePayload.discountAmount = Number(formData.discountAmount);
        }
        if (formData.notes) {
          updatePayload.notes = formData.notes.trim();
        }

        await updateInvoice(id, updatePayload);
      } else {
        const createPayload = {
          patientId: Number(formData.patientId),
          items: itemsPayload
        };
        if (formData.invoiceDate) {
          createPayload.invoiceDate = formData.invoiceDate;
        }
        if (formData.treatmentPlanId && String(formData.treatmentPlanId).trim()) {
          createPayload.treatmentPlanId = Number(formData.treatmentPlanId);
        }
        if (formData.discountAmount && String(formData.discountAmount).trim()) {
          createPayload.discountAmount = Number(formData.discountAmount);
        }
        if (formData.notes) {
          createPayload.notes = formData.notes.trim();
        }

        await createInvoice(createPayload);
      }

      navigate('/billing/invoices');
    } catch (err) {
      if (err instanceof BillingApiError) {
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setServerFieldErrors(err.fieldErrors);
          setSubmitError(err.message || 'Validation failed. Please correct the highlighted errors.');
        } else if (err.status === 400) {
          setSubmitError(err.message || 'Invalid invoice data. Please check your inputs.');
        } else if (err.status === 403) {
          setSubmitError('Access denied. You do not have permission to manage invoices.');
        } else {
          setSubmitError(err.message || 'An error occurred while saving the invoice.');
        }
      } else {
        setSubmitError(err?.message || 'Failed to save invoice. Please check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // State renders for edit mode
  if (isEdit && loading) {
    return (
      <div className="billing-container">
        <div className="loading-state" role="status">
          Loading invoice details...
        </div>
      </div>
    );
  }

  if (isEdit && notFound) {
    return (
      <div className="billing-container">
        <nav className="billing-nav" aria-label="Breadcrumb">
          <Link to="/billing/invoices">← Back to Invoices</Link>
        </nav>
        <div className="empty-state" role="alert" data-testid="invoice-not-found">
          <h2>Invoice Not Found</h2>
          <p>The invoice you are trying to edit does not exist or has been removed.</p>
          <Link to="/billing/invoices" className="btn btn-primary">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <div className="billing-container">
        <nav className="billing-nav" aria-label="Breadcrumb">
          <Link to="/billing/invoices">← Back to Invoices</Link>
        </nav>
        <div className="error-alert" role="alert" data-testid="invoice-load-error">
          <p>{loadError}</p>
          <Link to="/billing/invoices" className="btn btn-secondary btn-sm">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  // Editability rule: Only DRAFT invoices may be edited through this form
  if (isEdit && invoice && invoice.status !== 'DRAFT') {
    return (
      <div className="billing-container">
        <nav className="billing-nav" aria-label="Breadcrumb">
          <Link to="/billing/invoices">← Back to Invoices</Link>
        </nav>
        <div className="empty-state" role="alert" data-testid="non-draft-warning">
          <h2>Invoice Not Editable</h2>
          <p>
            Only DRAFT invoices can be edited. Invoice {invoice.invoiceNumber} is currently in {invoice.status} status.
          </p>
          <Link to="/billing/invoices" className="btn btn-primary">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = isEdit
    ? `Edit Draft Invoice (${invoice?.invoiceNumber || ''})`
    : 'Create Invoice Draft';

  return (
    <div className="billing-container">
      <nav className="billing-nav" aria-label="Breadcrumb">
        <Link to="/billing/invoices">← Back to Invoices</Link>
      </nav>

      <div className="billing-header">
        <h1>{pageTitle}</h1>
      </div>

      <div className="form-card">
        {submitError && (
          <div className="error-alert" role="alert" data-testid="form-submit-error" style={{ marginBottom: '1.25rem' }}>
            <p>{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid-2">
            {/* Patient ID */}
            <div className="form-group">
              <label htmlFor="patient-id">
                Patient ID {!isEdit && <span className="required-star">*</span>}
              </label>
              {isEdit ? (
                <>
                  <input
                    id="patient-id"
                    type="text"
                    className="form-input"
                    value={formData.patientId}
                    disabled
                    readOnly
                  />
                  <span className="form-help">Patient cannot be changed on an existing invoice.</span>
                </>
              ) : (
                <>
                  <input
                    id="patient-id"
                    name="patientId"
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="Enter patient ID..."
                    value={formData.patientId}
                    onChange={handleFieldChange}
                    disabled={submitting}
                    aria-invalid={Boolean(clientErrors.patientId || serverFieldErrors.patientId)}
                  />
                  {(clientErrors.patientId || serverFieldErrors.patientId) && (
                    <div className="field-error" role="alert">
                      {clientErrors.patientId || serverFieldErrors.patientId}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Invoice Date */}
            <div className="form-group">
              <label htmlFor="invoice-date">Invoice Date</label>
              <input
                id="invoice-date"
                name="invoiceDate"
                type="date"
                className="form-input"
                value={formData.invoiceDate}
                onChange={handleFieldChange}
                disabled={submitting}
              />
            </div>

            {/* Treatment Plan ID (Optional) */}
            <div className="form-group">
              <label htmlFor="treatment-plan-id">Treatment Plan ID (Optional)</label>
              <input
                id="treatment-plan-id"
                name="treatmentPlanId"
                type="number"
                min="1"
                className="form-input"
                placeholder="Optional plan reference..."
                value={formData.treatmentPlanId}
                onChange={handleFieldChange}
                disabled={submitting}
                aria-invalid={Boolean(clientErrors.treatmentPlanId || serverFieldErrors.treatmentPlanId)}
              />
              {(clientErrors.treatmentPlanId || serverFieldErrors.treatmentPlanId) && (
                <div className="field-error" role="alert">
                  {clientErrors.treatmentPlanId || serverFieldErrors.treatmentPlanId}
                </div>
              )}
            </div>

            {/* Discount Amount */}
            <div className="form-group">
              <label htmlFor="discount-amount">Discount Amount</label>
              <input
                id="discount-amount"
                name="discountAmount"
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={formData.discountAmount}
                onChange={handleFieldChange}
                disabled={submitting}
                aria-invalid={Boolean(clientErrors.discountAmount || serverFieldErrors.discountAmount)}
              />
              {(clientErrors.discountAmount || serverFieldErrors.discountAmount) && (
                <div className="field-error" role="alert">
                  {clientErrors.discountAmount || serverFieldErrors.discountAmount}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Section */}
          <div className="items-section">
            <div className="items-section-header">
              <h2>Line Items</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddItem}
                disabled={submitting}
              >
                + Add Line Item
              </button>
            </div>

            {formData.items.length === 0 ? (
              <p className="text-muted" style={{ fontStyle: 'italic', margin: '1rem 0' }}>
                No line items added yet. Draft invoices may be saved with zero items and itemized later.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="items-table" aria-label="Invoice line items">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '40%' }}>Description <span className="required-star">*</span></th>
                      <th scope="col" style={{ width: '15%' }}>Qty <span className="required-star">*</span></th>
                      <th scope="col" style={{ width: '20%' }}>Unit Price <span className="required-star">*</span></th>
                      <th scope="col" style={{ width: '15%' }}>Procedure ID</th>
                      <th scope="col" style={{ width: '10%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const itemErr = clientErrors.items?.[index] || {};
                      return (
                        <tr key={index}>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Service description..."
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              disabled={submitting}
                              aria-label={`Item ${index + 1} description`}
                              aria-invalid={Boolean(itemErr.description)}
                            />
                            {itemErr.description && (
                              <div className="field-error">{itemErr.description}</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="form-input"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              disabled={submitting}
                              aria-label={`Item ${index + 1} quantity`}
                              aria-invalid={Boolean(itemErr.quantity)}
                            />
                            {itemErr.quantity && (
                              <div className="field-error">{itemErr.quantity}</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-input"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              disabled={submitting}
                              aria-label={`Item ${index + 1} unit price`}
                              aria-invalid={Boolean(itemErr.unitPrice)}
                            />
                            {itemErr.unitPrice && (
                              <div className="field-error">{itemErr.unitPrice}</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="form-input"
                              placeholder="Opt ID"
                              value={item.treatmentProcedureId}
                              onChange={(e) => handleItemChange(index, 'treatmentProcedureId', e.target.value)}
                              disabled={submitting}
                              aria-label={`Item ${index + 1} procedure ID`}
                              aria-invalid={Boolean(itemErr.treatmentProcedureId)}
                            />
                            {itemErr.treatmentProcedureId && (
                              <div className="field-error">{itemErr.treatmentProcedureId}</div>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRemoveItem(index)}
                              disabled={submitting}
                              aria-label={`Remove item ${index + 1}`}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={500}
              className="form-input"
              placeholder="Optional invoice notes (maximum 500 characters)..."
              value={formData.notes}
              onChange={handleFieldChange}
              disabled={submitting}
            />
            <span className="form-help">{formData.notes.length}/500 characters</span>
            {clientErrors.notes && (
              <div className="field-error" role="alert">
                {clientErrors.notes}
              </div>
            )}
          </div>

          {/* Financial Preview Card */}
          <div className="preview-card" aria-label="Estimated calculation preview">
            <div className="preview-row">
              <span>Subtotal Preview:</span>
              <span className="amount-cell">{subtotalPreview.toFixed(2)}</span>
            </div>
            {formData.discountAmount && Number(formData.discountAmount) > 0 && (
              <div className="preview-row">
                <span>Discount Preview:</span>
                <span className="amount-cell">-{Number(formData.discountAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="preview-row preview-total">
              <span>Estimated Total:</span>
              <span className="amount-cell">{totalPreview.toFixed(2)}</span>
            </div>
            <p className="form-help" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              Live display preview. Authoritative financial totals are verified and calculated server-side upon saving.
            </p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update Draft' : 'Create Draft'}
            </button>
            <Link to="/billing/invoices" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
