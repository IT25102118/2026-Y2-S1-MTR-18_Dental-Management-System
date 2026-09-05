import React, { useState, useEffect, useCallback } from 'react';
import { getItemMovements } from '../api/movementApi';
import InventoryPagination from './InventoryPagination';

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

export default function StockMovementHistoryTable({ itemId }) {
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
  }, [loadMovements, typeFilter]);

  const handleTypeChange = (e) => {
    setTypeFilter(e.target.value);
  };

  const handlePageChange = (newPage) => {
    loadMovements(typeFilter, newPage);
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
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isPositive = m.quantityDelta != null ? m.quantityDelta > 0 : m.movementType === 'RECEIVED';
                  const isNegative = m.quantityDelta != null ? m.quantityDelta < 0 : ['USED', 'DAMAGED', 'EXPIRED'].includes(m.movementType);

                  return (
                    <tr key={m.id}>
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
                        {m.responsibleUserId != null ? `User #${m.responsibleUserId}` : '—'}
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
    </div>
  );
}
