// stock movement frontend,
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { recordStockMovement, getItemBatches } from '../api/movementApi';
import { getItems, InventoryApiError } from '../api/inventoryApi';
import { useAuth } from '../../auth/context/AuthContext';

const MOVEMENT_TYPES = [
  { value: 'RECEIVED', label: 'Stock In (Received)', isOut: false },
  { value: 'USED', label: 'Stock Out (Used / Dispensed)', isOut: true },
  { value: 'DAMAGED', label: 'Stock Out (Damaged / Discarded)', isOut: true },
  { value: 'EXPIRED', label: 'Stock Out (Expired)', isOut: true },
  { value: 'ADJUSTED', label: 'Adjustment (Stock Reconciliation)', isOut: null }
];

export function getTodayLocalString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function StockMovementForm({ item: propItem, onSuccess, onCancel }) {
  const { user, isAuthenticated } = useAuth();
  const today = useMemo(() => getTodayLocalString(), []);

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

  const [availableBatches, setAvailableBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [clientErrors, setClientErrors] = useState({});
  const [backendError, setBackendError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const isStockOut =
    movementType === 'USED' ||
    movementType === 'DAMAGED' ||
    movementType === 'EXPIRED' ||
    (movementType === 'ADJUSTED' && adjustmentDirection === 'DECREASE');

  const loadItemBatches = useCallback(async (itemId) => {
    if (!itemId) {
      setAvailableBatches([]);
      setSelectedBatchId('');
      return;
    }
    if (typeof getItemBatches !== 'function') return;
    setLoadingBatches(true);
    try {
      const data = await getItemBatches(itemId, { positiveStockOnly: true, size: 100 });
      setAvailableBatches(data?.content || []);
    } catch {
      setAvailableBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

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

  // Load positive batches whenever selected item changes
  useEffect(() => {
    loadItemBatches(selectedItemId);
  }, [selectedItemId, loadItemBatches]);

  const handleItemSelectChange = (e) => {
    const id = e.target.value;
    setSelectedItemId(id);
    const found = items.find((it) => String(it.id) === String(id));
    setSelectedItem(found || null);
    setSelectedBatchId('');
    setClientErrors((prev) => ({ ...prev, item: null, batchId: null }));
  };

  const isStaff = isAuthenticated && user && user.role !== 'PATIENT';

  // Identify earliest expiring usable batch for advisory recommendation
  const earliestExpiryBatchId = useMemo(() => {
    if (!availableBatches || availableBatches.length === 0) return null;
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const eligible = availableBatches.filter((b) => {
      if (b.quantityOnHand <= 0) return false;
      if (!b.expiryDate) return false;
      const parts = b.expiryDate.split('-');
      if (parts.length !== 3) return false;
      const expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return expDate >= todayMidnight;
    });

    if (eligible.length === 0) return null;

    eligible.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    return eligible[0].id;
  }, [availableBatches]);

  // Calculation for projected stock balance
  const projectedCalculation = useMemo(() => {
    if (!selectedItem) return null;
    const current = Number(selectedItem.currentQuantity ?? 0);
    const entered = Number(quantity);
    if (!quantity || isNaN(entered) || !Number.isInteger(entered) || entered <= 0) {
      return null;
    }
    const delta = isStockOut ? -entered : entered;
    const projected = current + delta;
    return {
      current,
      delta,
      projected,
      isDeficit: projected < 0
    };
  }, [selectedItem, quantity, isStockOut]);

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

    if (isStockOut) {
      if (availableBatches.length > 1 && !selectedBatchId) {
        errors.batchId = 'Batch selection is required when multiple positive batches exist.';
      }
      if (movementType === 'USED' && selectedBatchId) {
        const chosen = availableBatches.find((b) => String(b.id) === String(selectedBatchId));
        if (chosen?.expiryDate) {
          const parts = chosen.expiryDate.split('-');
          if (parts.length === 3) {
            const expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            if (expDate < todayMidnight) {
              errors.batchId = 'Expired batches cannot be consumed for USED movements. Please record as EXPIRED stock out.';
            }
          }
        }
      }
    } else if (expiryDate) {
      const todayStr = getTodayLocalString();
      if (expiryDate < todayStr) {
        errors.expiryDate = 'Expiry date cannot be earlier than today.';
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

      if (isStockOut) {
        if (selectedBatchId) {
          payload.batchId = Number(selectedBatchId);
          const chosen = availableBatches.find((b) => String(b.id) === String(selectedBatchId));
          if (chosen?.batchNumber) {
            payload.batchNumber = chosen.batchNumber;
          }
        } else if (batchNumber && batchNumber.trim()) {
          payload.batchNumber = batchNumber.trim();
        }
      } else {
        if (batchNumber && batchNumber.trim()) {
          payload.batchNumber = batchNumber.trim();
        }
        if (expiryDate) {
          payload.expiryDate = expiryDate;
        }
        if (supplierReference && supplierReference.trim()) {
          payload.supplierReference = supplierReference.trim();
        }
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
      setSelectedBatchId('');
      loadItemBatches(selectedItemId);

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

  // Determine direction metadata for banner
  let bannerClass = 'direction-in';
  let bannerTitle = '+ Stock In — Increases inventory balance';
  let bannerDesc = 'Inbound stock movement • Records incoming clinic inventory into stock balance and registers batch tracking.';

  if (isStockOut) {
    bannerClass = 'direction-out';
    bannerTitle = '− Stock Out — Deducts inventory balance';
    if (movementType === 'USED') {
      bannerDesc = 'Outbound stock movement • Dispenses clinic stock for operatory use or patient procedure.';
    } else if (movementType === 'DAMAGED') {
      bannerDesc = 'Outbound stock movement • Deducts damaged, compromised, or dropped supplies from clinic inventory.';
    } else if (movementType === 'EXPIRED') {
      bannerDesc = 'Outbound stock movement • Disposes of expired stock batches past safe medical clinical date.';
    } else {
      bannerDesc = 'Outbound stock movement • Reduces stock balance to reconcile with physical inventory deficit.';
    }
  } else if (movementType === 'ADJUSTED') {
    bannerTitle = '+ Stock In — Increases inventory balance';
    bannerDesc = 'Inbound stock movement • Increases stock balance to reconcile with physical inventory surplus.';
  }

  return (
    <div className="movement-form-card" data-testid="movement-form-section">
      <div className="form-card-header">
        <h3>Record Stock Movement</h3>
        <span className="acting-user-badge" data-testid="acting-user-badge">
          Acting User: {user.firstName} {user.lastName} ({user.role})
        </span>
      </div>

      {/* Movement Direction Indicator Banner */}
      <div className={`movement-direction-banner ${bannerClass}`} data-testid="movement-direction-banner">
        <div className="direction-icon-wrap" aria-hidden="true">
          <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{isStockOut ? '↓' : '↑'}</span>
        </div>
        <div className="direction-content">
          <span className="direction-title">{bannerTitle}</span>
          <span className="direction-desc">{bannerDesc}</span>
        </div>
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
            onChange={(e) => {
              setMovementType(e.target.value);
              setClientErrors((prev) => ({ ...prev, batchId: null }));
            }}
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

        {movementType === 'ADJUSTED' && (
          <fieldset className="form-group radio-fieldset" data-testid="adjustment-direction-group" style={{ border: 'none', padding: 0, margin: '0 0 1rem 0' }}>
            <legend className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', display: 'block' }}>
              Adjustment Direction <span className="required-star">*</span>
            </legend>
            <div className="radio-group" role="radiogroup" aria-label="Adjustment direction">
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
              <span className="field-error" role="alert">{clientErrors.adjustmentDirection}</span>
            )}
          </fieldset>
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
            aria-invalid={Boolean(clientErrors.quantity)}
            aria-describedby={clientErrors.quantity ? 'quantity-error' : undefined}
          />
          {clientErrors.quantity && (
            <span id="quantity-error" className="field-error" role="alert" data-testid="quantity-error">
              {clientErrors.quantity}
            </span>
          )}
        </div>

        {/* Projected Balance Calculator (Presentation-only) */}
        {projectedCalculation && (
          <div className="projected-balance-card" data-testid="projected-balance-card">
            <div className="projected-balance-header">
              <span className="projected-label">Projected Stock Impact</span>
              <span className="projected-disclaimer">Preview only — actual ledger balance recorded upon submission</span>
            </div>
            <div className="projected-balance-display">
              <div className="balance-step">
                <span className="step-label">Current Balance</span>
                <span className="step-val">
                  {projectedCalculation.current} {selectedItem?.unit || ''}
                </span>
              </div>
              <span className="balance-arrow">→</span>
              <div className="balance-step">
                <span className="step-label">Transaction Delta</span>
                <span
                  className="step-val"
                  style={{ color: projectedCalculation.delta < 0 ? '#dc2626' : '#166534' }}
                >
                  {projectedCalculation.delta > 0
                    ? `+${projectedCalculation.delta}`
                    : `${projectedCalculation.delta}`}{' '}
                  {selectedItem?.unit || ''}
                </span>
              </div>
              <span className="balance-arrow">→</span>
              <div className="balance-step highlight">
                <span className="step-label">Projected Balance</span>
                <span
                  className="step-val"
                  style={{ color: projectedCalculation.isDeficit ? '#dc2626' : '#0f172a' }}
                >
                  {projectedCalculation.projected} {selectedItem?.unit || ''}
                </span>
              </div>
            </div>
            {projectedCalculation.isDeficit && (
              <div className="projected-deficit-warning" role="alert">
                ⚠️ Warning: Projected stock balance is negative ({projectedCalculation.projected}). Incurring negative stock will violate inventory invariants and will be rejected by the server.
              </div>
            )}
          </div>
        )}

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
            aria-invalid={Boolean(clientErrors.reason)}
            aria-describedby={clientErrors.reason ? 'reason-error' : undefined}
          />
          {clientErrors.reason && (
            <span id="reason-error" className="field-error" role="alert" data-testid="reason-error">
              {clientErrors.reason}
            </span>
          )}
        </div>

        {/* Batch Allocation (Stock Out) or Registration (Stock In) */}
        {isStockOut ? (
          <div className="form-group" data-testid="stock-out-batch-section">
            {availableBatches.length > 0 ? (
              <>
                <label htmlFor="movement-batch-select">
                  Allocate From Batch {availableBatches.length > 1 ? <span className="required-star">*</span> : '(Optional)'}
                </label>

                {/* Visual Selectable Batch Cards Grid */}
                <div className="batch-selection-grid" data-testid="batch-selection-grid">
                  {availableBatches.map((b) => {
                    let isExpired = false;
                    if (b.expiryDate) {
                      const parts = b.expiryDate.split('-');
                      if (parts.length === 3) {
                        const expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                        const todayMidnight = new Date();
                        todayMidnight.setHours(0, 0, 0, 0);
                        isExpired = expDate < todayMidnight;
                      }
                    }
                    const isCardDisabled = movementType === 'USED' && isExpired;
                    const isSelected = String(selectedBatchId) === String(b.id);
                    const isRecommended = String(b.id) === String(earliestExpiryBatchId) && !isCardDisabled;

                    return (
                      <div
                        key={b.id}
                        role="button"
                        tabIndex={isCardDisabled ? -1 : 0}
                        aria-pressed={isSelected}
                        aria-disabled={isCardDisabled}
                        className={`batch-select-card ${isSelected ? 'selected' : ''} ${isCardDisabled ? 'disabled' : ''}`}
                        onClick={() => {
                          if (isCardDisabled || submitting || loadingBatches) return;
                          setSelectedBatchId((prev) => (String(prev) === String(b.id) ? '' : String(b.id)));
                          setClientErrors((prev) => ({ ...prev, batchId: null }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!isCardDisabled && !submitting && !loadingBatches) {
                              setSelectedBatchId((prev) => (String(prev) === String(b.id) ? '' : String(b.id)));
                              setClientErrors((prev) => ({ ...prev, batchId: null }));
                            }
                          }
                        }}
                        data-testid={`batch-card-${b.id}`}
                      >
                        <div className="batch-card-top">
                          <div className="batch-card-lot">
                            <strong>{b.batchNumber ? b.batchNumber : 'Unbatched Stock'}</strong>
                            {isRecommended && (
                              <span className="earliest-expiry-pill" title="Recommended: Earliest expiring batch lot">
                                ⭐ Recommended — Earliest Expiry
                              </span>
                            )}
                          </div>
                          <div className="batch-card-qty">
                            <span className="batch-qty-label">On Hand</span>
                            <span className="batch-qty-val">{b.quantityOnHand}</span>
                          </div>
                        </div>
                        <div className="batch-card-bottom">
                          <span>Exp: {b.expiryDate || 'No expiry'}</span>
                          {isCardDisabled ? (
                            <span className="batch-expired-warning">Expired — Cannot Use</span>
                          ) : isExpired ? (
                            <span className="badge badge-batch-expired">Expired (Eligible for Write-off)</span>
                          ) : (
                            <span className="badge badge-batch-valid">Valid Stock</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Synchronized accessible select element */}
                <div className="accessible-batch-fallback">
                  <select
                    id="movement-batch-select"
                    value={selectedBatchId}
                    onChange={(e) => {
                      setSelectedBatchId(e.target.value);
                      setClientErrors((prev) => ({ ...prev, batchId: null }));
                    }}
                    disabled={submitting || loadingBatches}
                    className={`form-control ${clientErrors.batchId ? 'is-invalid' : ''}`}
                    data-testid="movement-batch-select"
                    aria-invalid={Boolean(clientErrors.batchId)}
                    aria-describedby={clientErrors.batchId ? 'batch-error' : undefined}
                  >
                    <option value="">
                      {availableBatches.length > 1
                        ? '-- Select Batch (Required: Multiple Batches Available) --'
                        : '-- Select Batch (Optional) --'}
                    </option>
                    {availableBatches.map((b) => {
                      let isExpired = false;
                      if (b.expiryDate) {
                        const parts = b.expiryDate.split('-');
                        if (parts.length === 3) {
                          const expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                          const todayMidnight = new Date();
                          todayMidnight.setHours(0, 0, 0, 0);
                          isExpired = expDate < todayMidnight;
                        }
                      }
                      const disableOption = movementType === 'USED' && isExpired;
                      return (
                        <option key={b.id} value={b.id} disabled={disableOption}>
                          {b.batchNumber ? b.batchNumber : 'Unbatched Stock'} (Qty: {b.quantityOnHand}, Exp: {b.expiryDate || 'No expiry'}{isExpired ? ' - EXPIRED' : ''}){disableOption ? ' [Expired - Cannot Use]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {clientErrors.batchId && (
                  <span id="batch-error" className="field-error" role="alert" data-testid="batch-error">{clientErrors.batchId}</span>
                )}
                {availableBatches.length > 1 && (
                  <span className="subtext" style={{ marginTop: '0.25rem', display: 'block' }}>
                    Staff must select the specific physical batch lot used in clinic operatory.
                  </span>
                )}
                {movementType === 'USED' && (
                  <span className="subtext" style={{ marginTop: '0.25rem', display: 'block', color: '#64748b' }}>
                    Expired stock cannot be used clinically. To discard or dispose of expired materials, record an EXPIRED movement instead.
                  </span>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        ) : (
          <>
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
                  min={today}
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate(e.target.value);
                    setClientErrors((prev) => ({ ...prev, expiryDate: null }));
                  }}
                  disabled={submitting}
                  className={`form-control ${clientErrors.expiryDate ? 'is-invalid' : ''}`}
                  aria-invalid={Boolean(clientErrors.expiryDate)}
                  aria-describedby={clientErrors.expiryDate ? 'movement-expiry-date-error' : undefined}
                />
                {clientErrors.expiryDate && (
                  <span
                    id="movement-expiry-date-error"
                    className="field-error"
                    role="alert"
                    data-testid="movement-expiry-date-error"
                  >
                    {clientErrors.expiryDate}
                  </span>
                )}
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
          </>
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
