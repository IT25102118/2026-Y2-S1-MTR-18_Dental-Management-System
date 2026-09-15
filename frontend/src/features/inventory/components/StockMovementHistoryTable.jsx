import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getItemMovements, reverseStockMovement } from '../api/movementApi';
import { InventoryApiError } from '../api/inventoryApi';
import InventoryPagination from './InventoryPagination';
import { useAuth } from '../../auth/context/AuthContext';

function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

const MOVEMENT_TYPE_LABELS = {
  RECEIVED: 'Received',
  USED: 'Used',
  DAMAGED: 'Damaged',
  ADJUSTED: 'Adjusted',
  EXPIRED: 'Expired'
};

function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return { user: null, isAuthenticated: false };
  }
}

export default function StockMovementHistoryTable({ itemId, onReversalSuccess, refreshTrigger }) {
  const { user, isAuthenticated } = useOptionalAuth();
  const isStaff = isAuthenticated && user && user.role !== 'PATIENT';

  const [movements, setMovements] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  });
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reversal dialog state
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalSubmitting, setReversalSubmitting] = useState(false);
  const [reversalError, setReversalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Track locally known reversed movements
  const [reversedMovementIds, setReversedMovementIds] = useState(() => new Set());

  // Derive known reversed movement IDs from loaded movements
  const allReversedIds = useMemo(() => {
    const ids = new Set(reversedMovementIds);
    movements.forEach((m) => {
      if (m.reversalOfMovementId != null) {
        ids.add(Number(m.reversalOfMovementId));
      }
    });
    return ids;
  }, [movements, reversedMovementIds]);

  const loadMovements = useCallback(async (selectedType, pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItemMovements(itemId, {
        movementType: selectedType === 'ALL' ? undefined : selectedType,
        page: pageNum,
        size: 20,
        sort: 'occurredAt,desc'
      });
      setMovements(data.content);
      setPageInfo({
        number: data.number,
        size: data.size,
        totalPages: data.totalPages,
        totalElements: data.totalElements,
        first: data.first,
        last: data.last,
        empty: data.empty
      });
    } catch (err) {
      setError(err.message || 'Failed to load movement history.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadMovements(typeFilter, 0);
  }, [loadMovements, typeFilter, refreshTrigger]);

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
  };

  const handlePageChange = (newPage) => {
    loadMovements(typeFilter, newPage);
  };

  const handleOpenReversal = (movement) => {
    setReversalTarget(movement);
    setReversalReason('');
    setReversalError(null);
  };

  const handleCloseReversal = () => {
    if (reversalSubmitting) return;
    setReversalTarget(null);
    setReversalReason('');
    setReversalError(null);
  };

  const handleConfirmReversal = async () => {
    if (!reversalTarget) return;

    const trimmedReason = reversalReason.trim();
    if (!trimmedReason) {
      setReversalError('Reversal reason is required.');
      return;
    }

    setReversalSubmitting(true);
    setReversalError(null);

    try {
      const response = await reverseStockMovement(itemId, reversalTarget.id, {
        reason: trimmedReason
      });

      // Mark movement as reversed locally
      setReversedMovementIds((prev) => new Set(prev).add(Number(reversalTarget.id)));
      setSuccessMessage(
        `Movement #${reversalTarget.id} successfully reversed! Compensating transaction #${response.id} recorded.`
      );
      setReversalTarget(null);

      // Refresh list
      await loadMovements(typeFilter, pageInfo.number);

      // Notify parent to refresh item stock balance
      if (onReversalSuccess) {
        onReversalSuccess(response);
      }
    } catch (err) {
      if (err instanceof InventoryApiError) {
        setReversalError(err.message || 'Failed to reverse stock movement.');
      } else {
        setReversalError(err.message || 'An unexpected error occurred during reversal.');
      }
    } finally {
      setReversalSubmitting(false);
    }
  };

  return (
    <div className="movement-history-container" data-testid="movement-history-section">
      <div className="history-toolbar">
        <div className="history-filter-group">
          <label htmlFor="movement-type-filter" className="filter-label">
            Filter by Movement Type:
          </label>
          <select
            id="movement-type-filter"
            value={typeFilter}
            onChange={handleTypeChange}
            disabled={loading}
            className="form-control form-control-sm"
          >
            <option value="ALL">All Types</option>
            <option value="RECEIVED">Received</option>
            <option value="USED">Used</option>
            <option value="DAMAGED">Damaged</option>
            <option value="ADJUSTED">Adjusted</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => loadMovements(typeFilter, pageInfo.number)}
          disabled={loading}
        >
          Refresh History
        </button>
      </div>

      {successMessage && (
        <div className="success-alert" role="status" aria-live="polite" data-testid="movement-table-success">
          <p>{successMessage}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSuccessMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="error-alert" role="region" aria-label="Movement history error">
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadMovements(typeFilter, pageInfo.number)}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading movement history...
        </div>
      ) : movements.length === 0 ? (
        <div className="empty-state">
          <p>
            {typeFilter !== 'ALL'
              ? `No ${MOVEMENT_TYPE_LABELS[typeFilter] || typeFilter} movements found for this item.`
              : 'No stock movements recorded for this item yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="inventory-table movement-table" aria-label="Stock movement history">
              <thead>
                <tr>
                  <th scope="col">Date / Time</th>
                  <th scope="col">Type</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Direction</th>
                  <th scope="col">Batch / Expiry</th>
                  <th scope="col">Responsible User</th>
                  <th scope="col">Reason</th>
                  <th scope="col">References</th>
                  <th scope="col">Reversal / Actions</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isPositive = m.quantityDelta != null ? m.quantityDelta > 0 : m.movementType === 'RECEIVED';
                  const isNegative = m.quantityDelta != null ? m.quantityDelta < 0 : ['USED', 'DAMAGED', 'EXPIRED'].includes(m.movementType);
                  const isReversalItself = m.reversalOfMovementId != null;
                  const isAlreadyReversed = allReversedIds.has(Number(m.id));
                  const isEligibleForReversal = isStaff && !isReversalItself && !isAlreadyReversed;

                  return (
                    <tr key={m.id} data-testid={`movement-row-${m.id}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(m.occurredAt)}</td>
                      <td>
                        <span className={`movement-badge badge-${m.movementType?.toLowerCase()}`}>
                          {MOVEMENT_TYPE_LABELS[m.movementType] || m.movementType}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <span className={isPositive ? 'delta-positive' : isNegative ? 'delta-negative' : ''}>
                          {m.quantityDelta != null
                            ? (m.quantityDelta > 0 ? `+${m.quantityDelta}` : `${m.quantityDelta}`)
                            : m.quantity}
                        </span>
                        {m.resultingQuantity != null && (
                          <span className="resulting-qty"> (Bal: {m.resultingQuantity})</span>
                        )}
                      </td>
                      <td>
                        {m.adjustmentDirection
                          ? m.adjustmentDirection === 'INCREASE' ? '↑ Increase' : '↓ Decrease'
                          : '—'}
                      </td>
                      <td>
                        {m.batchNumber ? (
                          <div>
                            <strong>{m.batchNumber}</strong>
                            {m.expiryDate && (
                              <div className="subtext">Exp: {m.expiryDate}</div>
                            )}
                          </div>
                        ) : (
                          <span className="unbatched-badge">Unbatched Stock</span>
                        )}
                      </td>
                      <td>
                        {m.responsibleUserId != null ? (
                          <span>
                            User #{m.responsibleUserId}
                            {user?.id && Number(user.id) === Number(m.responsibleUserId) && (
                              <span className="subtext" style={{ display: 'block', color: '#059669' }}>
                                (You)
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span title={m.reason || ''}>{m.reason || '—'}</span>
                      </td>
                      <td>
                        {m.treatmentProcedureId && (
                          <div>Proc #{m.treatmentProcedureId}</div>
                        )}
                        {m.reversalOfMovementId && (
                          <div className="reversal-ref">
                            Reversal of #{m.reversalOfMovementId}
                          </div>
                        )}
                        {!m.treatmentProcedureId && !m.reversalOfMovementId && '—'}
                      </td>
                      <td>
                        {isReversalItself ? (
                          <span className="badge badge-reversal" data-testid={`badge-reversal-${m.id}`}>
                            Compensating Reversal
                          </span>
                        ) : isAlreadyReversed ? (
                          <span className="badge badge-reversed" data-testid={`badge-reversed-${m.id}`}>
                            Reversed
                          </span>
                        ) : isEligibleForReversal ? (
                          <button
                            type="button"
                            className="btn btn-warning btn-sm"
                            onClick={() => handleOpenReversal(m)}
                            data-testid={`reverse-movement-btn-${m.id}`}
                          >
                            Reverse Movement
                          </button>
                        ) : (
                          <span className="subtext">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <InventoryPagination
            pageInfo={pageInfo}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </>
      )}

      {/* Confirmation Modal for Movement Reversal */}
      {reversalTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reversal-modal-title"
          data-testid="reversal-modal"
        >
          <div className="modal-content">
            <div className="modal-header">
              <h3 id="reversal-modal-title">Confirm Movement Reversal</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseReversal}
                disabled={reversalSubmitting}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="reversal-dialog-prompt">
                Are you sure you want to reverse this stock movement? This action will create a
                compensating inventory transaction.
              </p>

              <div className="reversal-summary-box">
                <div>
                  <strong>Target Movement:</strong> #{reversalTarget.id} (
                  {MOVEMENT_TYPE_LABELS[reversalTarget.movementType] || reversalTarget.movementType})
                </div>
                <div>
                  <strong>Quantity Effect:</strong>{' '}
                  {reversalTarget.quantityDelta != null
                    ? (reversalTarget.quantityDelta > 0
                        ? `+${reversalTarget.quantityDelta}`
                        : `${reversalTarget.quantityDelta}`)
                    : reversalTarget.quantity}
                </div>
                <div>
                  <strong>Original Date:</strong> {formatDateTime(reversalTarget.occurredAt)}
                </div>
                {reversalTarget.reason && (
                  <div>
                    <strong>Original Reason:</strong> {reversalTarget.reason}
                  </div>
                )}
              </div>

              {reversalError && (
                <div className="error-alert" role="alert" data-testid="reversal-error-alert">
                  <p>{reversalError}</p>
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="reversal-reason-input">
                  Reversal Reason <span className="required-star">*</span>
                </label>
                <textarea
                  id="reversal-reason-input"
                  rows="3"
                  className="form-control"
                  value={reversalReason}
                  onChange={(e) => {
                    setReversalReason(e.target.value);
                    setReversalError(null);
                  }}
                  disabled={reversalSubmitting}
                  placeholder="Mandatory explanation for this reversal (e.g. Returned damaged shipment, entry error correction)..."
                  data-testid="reversal-reason-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmReversal}
                disabled={reversalSubmitting || !reversalReason.trim()}
                data-testid="confirm-reversal-button"
              >
                {reversalSubmitting ? 'Reversing...' : 'Confirm Reversal'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseReversal}
                disabled={reversalSubmitting}
                data-testid="cancel-reversal-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

