import React, { useState, useEffect, useCallback } from 'react';
import { getItemBatches } from '../api/movementApi';
import InventoryPagination from './InventoryPagination';

export default function ItemBatchesTable({ itemId }) {
  const [batches, setBatches] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 50,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  });
  const [positiveStockOnly, setPositiveStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBatches = useCallback(async (positiveOnly, pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItemBatches(itemId, {
        positiveStockOnly: positiveOnly,
        page: pageNum,
        size: 50,
        sort: 'expiryDate,asc'
      });
      setBatches(data.content);
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
      setError(err.message || 'Failed to load item batches.');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadBatches(positiveStockOnly, 0);
  }, [loadBatches, positiveStockOnly]);

  const handleTogglePositive = (e) => {
    setPositiveStockOnly(e.target.checked);
  };

  const handlePageChange = (newPage) => {
    loadBatches(positiveStockOnly, newPage);
  };

  return (
    <div className="item-batches-container" data-testid="item-batches-section">
      <div className="history-toolbar">
        <div className="history-filter-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={positiveStockOnly}
              onChange={handleTogglePositive}
              disabled={loading}
            />
            Show positive stock only
          </label>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => loadBatches(positiveStockOnly, pageInfo.number)}
          disabled={loading}
        >
          Refresh Batches
        </button>
      </div>

      {error && (
        <div className="error-alert" role="region" aria-label="Item batches error">
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadBatches(positiveStockOnly, pageInfo.number)}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading batches...
        </div>
      ) : batches.length === 0 ? (
        <div className="empty-state">
          <p>
            {positiveStockOnly
              ? 'No batches with positive stock currently available for this item.'
              : 'No inventory batches registered for this item.'}
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="inventory-table batches-table" aria-label="Item batches table">
              <thead>
                <tr>
                  <th scope="col">Batch Number</th>
                  <th scope="col">Quantity On Hand</th>
                  <th scope="col">Expiry Date</th>
                  <th scope="col">Received Date</th>
                  <th scope="col">Supplier Reference</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.batchNumber ? (
                        <strong>{b.batchNumber}</strong>
                      ) : (
                        <span className="unbatched-badge">Unbatched Stock</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.quantityOnHand}</td>
                    <td>{b.expiryDate || 'No expiry'}</td>
                    <td>{b.receivedDate || '—'}</td>
                    <td>{b.supplierReference || '—'}</td>
                  </tr>
                ))}
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
