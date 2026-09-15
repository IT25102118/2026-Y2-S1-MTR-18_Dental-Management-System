import React, { useState, useEffect } from 'react';
import { recordStockMovement } from '../api/movementApi';
import { getItems, InventoryApiError } from '../api/inventoryApi';
import { useAuth } from '../../auth/context/AuthContext';

const MOVEMENT_TYPES = [
  { value: 'RECEIVED', label: 'Stock In (Received)', isOut: false },
  { value: 'USED', label: 'Stock Out (Used / Dispensed)', isOut: true },
  { value: 'DAMAGED', label: 'Stock Out (Damaged / Discarded)', isOut: true },
  { value: 'EXPIRED', label: 'Stock Out (Expired)', isOut: true },
  { value: 'ADJUSTED', label: 'Adjustment (Stock Reconciliation)', isOut: null }
];

export default function StockMovementForm({ item: propItem, onSuccess, onCancel }) {
  const { user, isAuthenticated } = useAuth();

  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(propItem?.id ? String(propItem.id) : '');
  const [selectedItem, setSelectedItem] = useState(propItem || null);

  const [movementType, setMovementType] = useState('RECEIVED');
  const [adjustmentDirection, setAdjustmentDirection] = useState('INCREASE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierReference, setSupplierReference] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [clientErrors, setClientErrors] = useState({});
  const [backendError, setBackendError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load items if not provided via prop
  useEffect(() => {
    if (propItem) {
      setSelectedItem(propItem);
      setSelectedItemId(String(propItem.id));
      return;
    }

    let isMounted = true;
    getItems({ active: true, size: 100 })
      .then((data) => {
        if (isMounted) {
          setItems(data.content || []);
          if (data.content?.length > 0 && !selectedItemId) {
            setSelectedItemId(String(data.content[0].id));
            setSelectedItem(data.content[0]);
          }
        }
      })
      .catch(() => {
        // Fallback silently if items cannot be preloaded
      });

    return () => {
      isMounted = false;
    };
  }, [propItem]);

  // Keep selectedItem in sync when propItem changes
  useEffect(() => {
    if (propItem) {
      setSelectedItem(propItem);
      setSelectedItemId(String(propItem.id));
    }
  }, [propItem]);

  const handleItemSelectChange = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    const found = items.find((it) => String(it.id) === String(id));
    setSelectedItem(found || null);
    setClientErrors((prev) => ({ ...prev, item: null }));
  };

  const isStaff = isAuthenticated && user && user.role !== 'PATIENT';

  const validate = () => {
    const errors = {};

    if (!selectedItemId) {
      errors.item = 'Please select an inventory item.';
    }

    const numQty = Number(quantity);
    if (!quantity || isNaN(numQty) || !Number.isInteger(numQty) || numQty <= 0) {
      errors.quantity = 'Quantity must be a whole number strictly greater than zero.';
    }

    if (movementType === 'ADJUSTED') {
      if (!adjustmentDirection) {
        errors.adjustmentDirection = 'Please select an adjustment direction (Increase or Decrease).';
      }
      if (!reason || reason.trim() === '') {
        errors.reason = 'A detailed reason is required for stock adjustments.';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError(null);
    setSuccessMessage(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }
    setClientErrors({});

    setSubmitting(true);

    try {
      const payload = {
        movementType,
        quantity: Number(quantity)
      };

      if (movementType === 'ADJUSTED') {
        payload.adjustmentDirection = adjustmentDirection;
      }

      if (reason && reason.trim()) {
        payload.reason = reason.trim();
      }

      if (batchNumber && batchNumber.trim()) {
        payload.batchNumber = batchNumber.trim();
      }

      if (expiryDate) {
        payload.expiryDate = expiryDate;
      }

      if (supplierReference && supplierReference.trim()) {
        payload.supplierReference = supplierReference.trim();
      }

      const response = await recordStockMovement(selectedItemId, payload);

      setSuccessMessage(
        `Movement successfully recorded! Updated stock balance: ${response.resultingQuantity}`
      );
      setQuantity('');
      setReason('');
      setBatchNumber('');
      setExpiryDate('');
      setSupplierReference('');

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      if (err instanceof InventoryApiError) {
        setBackendError(err.message || 'Failed to record stock movement.');
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setClientErrors(err.fieldErrors);
        }
      } else {
        setBackendError(err.message || 'An unexpected error occurred while recording stock movement.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="movement-form-card" data-testid="movement-form-restricted">
        <div className="info-alert" role="status">
          <p>
            {!isAuthenticated
              ? 'Please sign in with a clinic staff account to record stock movements.'
              : 'Patient accounts are not authorized to perform stock movements.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="movement-form-card" data-testid="movement-form-section">
      <div className="form-card-header">
        <h3>Record Stock Movement</h3>
        <span className="acting-user-badge" data-testid="acting-user-badge">
          Acting User: {user.firstName} {user.lastName} ({user.role})
        </span>
      </div>

      {successMessage && (
        <div className="success-alert" role="status" aria-live="polite" data-testid="movement-success-message">
          <p>{successMessage}</p>
        </div>
      )}

      {backendError && (
        <div className="error-alert" role="alert" aria-live="assertive" data-testid="movement-backend-error">
          <p>{backendError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Item Selection / Context */}
        {!propItem ? (
          <div className="form-group">
            <label htmlFor="movement-item-select">
              Select Inventory Item <span className="required-star">*</span>
            </label>
            <select
              id="movement-item-select"
              value={selectedItemId}
              onChange={handleItemSelectChange}
              disabled={submitting}
              className={`form-control ${clientErrors.item ? 'is-invalid' : ''}`}
            >
              <option value="">-- Choose Item --</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.itemCode} — {it.name} (Current Stock: {it.currentQuantity})
                </option>
              ))}
            </select>
            {clientErrors.item && <span className="field-error">{clientErrors.item}</span>}
          </div>
        ) : null}

        {selectedItem && (
          <div className="movement-item-context" data-testid="movement-item-context">
            <div className="context-item">
              <span className="context-label">Item Code:</span>
              <strong className="context-value">{selectedItem.itemCode}</strong>
            </div>
            <div className="context-item">
              <span className="context-label">Item Name:</span>
              <strong className="context-value">{selectedItem.name}</strong>
            </div>
            <div className="context-item">
              <span className="context-label">Current Quantity:</span>
              <strong className="context-value stock-highlight" data-testid="movement-current-quantity">
                {selectedItem.currentQuantity} {selectedItem.unit || ''}
              </strong>
            </div>
          </div>
        )}

        {/* Movement Type */}
        <div className="form-group">
          <label htmlFor="movement-type-select">
            Movement Type <span className="required-star">*</span>
          </label>
          <select
            id="movement-type-select"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            disabled={submitting}
            className="form-control"
          >
            {MOVEMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Adjustment Direction (only for ADJUSTED) */}
        {movementType === 'ADJUSTED' && (
          <div className="form-group" data-testid="adjustment-direction-group">
            <label>
              Adjustment Direction <span className="required-star">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="adjustmentDirection"
                  value="INCREASE"
                  checked={adjustmentDirection === 'INCREASE'}
                  onChange={(e) => setAdjustmentDirection(e.target.value)}
                  disabled={submitting}
                />
                <span>↑ Increase Stock (Surplus correction)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="adjustmentDirection"
                  value="DECREASE"
                  checked={adjustmentDirection === 'DECREASE'}
                  onChange={(e) => setAdjustmentDirection(e.target.value)}
                  disabled={submitting}
                />
                <span>↓ Decrease Stock (Deficit correction)</span>
              </label>
            </div>
            {clientErrors.adjustmentDirection && (
              <span className="field-error">{clientErrors.adjustmentDirection}</span>
            )}
          </div>
        )}

        {/* Quantity */}
        <div className="form-group">
          <label htmlFor="movement-quantity">
            Quantity <span className="required-star">*</span>
          </label>
          <input
            id="movement-quantity"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setClientErrors((prev) => ({ ...prev, quantity: null }));
            }}
            disabled={submitting}
            placeholder="e.g. 10"
            className={`form-control ${clientErrors.quantity ? 'is-invalid' : ''}`}
          />
          {clientErrors.quantity && (
            <span className="field-error" data-testid="quantity-error">
              {clientErrors.quantity}
            </span>
          )}
        </div>

        {/* Reason / Reference */}
        <div className="form-group">
          <label htmlFor="movement-reason">
            Reason / Reference {movementType === 'ADJUSTED' ? <span className="required-star">*</span> : '(Optional)'}
          </label>
          <input
            id="movement-reason"
            type="text"
            maxLength="255"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setClientErrors((prev) => ({ ...prev, reason: null }));
            }}
            disabled={submitting}
            placeholder={
              movementType === 'ADJUSTED'
                ? 'Mandatory reason for reconciliation, e.g. Monthly physical audit recount'
                : 'e.g. PO-8823 / Operatory restocking'
            }
            className={`form-control ${clientErrors.reason ? 'is-invalid' : ''}`}
          />
          {clientErrors.reason && (
            <span className="field-error" data-testid="reason-error">
              {clientErrors.reason}
            </span>
          )}
        </div>

        {/* Batch details (Optional / Tracking) */}
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="movement-batch-number">Batch / Lot Number (Optional)</label>
            <input
              id="movement-batch-number"
              type="text"
              maxLength="100"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              disabled={submitting}
              placeholder="e.g. LOT-2026-A"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="movement-expiry-date">Expiry Date (Optional)</label>
            <input
              id="movement-expiry-date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={submitting}
              className="form-control"
            />
          </div>
        </div>

        {movementType === 'RECEIVED' && (
          <div className="form-group">
            <label htmlFor="movement-supplier-ref">Supplier Reference (Optional)</label>
            <input
              id="movement-supplier-ref"
              type="text"
              maxLength="150"
              value={supplierReference}
              onChange={(e) => setSupplierReference(e.target.value)}
              disabled={submitting}
              placeholder="e.g. Invoice #INV-90412"
              className="form-control"
            />
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            data-testid="submit-movement-button"
          >
            {submitting ? 'Recording Movement...' : 'Record Movement'}
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
