import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { searchBatches } from '../api/movementApi';
import InventoryPagination from '../components/InventoryPagination';
import '../inventory.css';

export default function InventoryBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  });
  const [filters, setFilters] = useState({
    batchNumber: '',
    expiryFrom: '',
    expiryTo: '',
    positiveStockOnly: false
  });
  const [formInputs, setFormInputs] = useState({
    batchNumber: '',
    expiryFrom: '',
    expiryTo: '',
    positiveStockOnly: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBatches = useCallback(async (currentFilters, pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchBatches({
        batchNumber: currentFilters.batchNumber,
        expiryFrom: currentFilters.expiryFrom || undefined,
        expiryTo: currentFilters.expiryTo || undefined,
        positiveStockOnly: currentFilters.positiveStockOnly,
        page: pageNum,
        size: 20,
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
      setError(err.message || 'Failed to search inventory batches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches(filters, 0);
  }, [fetchBatches, filters]);

  const handleInputChange = (field, value) => {
    setFormInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setFilters({ ...formInputs });
  };

  const handleResetFilters = () => {
    const defaultState = {
      batchNumber: '',
      expiryFrom: '',
      expiryTo: '',
      positiveStockOnly: false
    };
    setFormInputs(defaultState);
    setFilters(defaultState);
  };

  const handlePageChange = (newPage) => {
    fetchBatches(filters, newPage);
  };

  const handleRetry = () => {
    fetchBatches(filters, pageInfo.number);
  };

  const hasActiveFilters = Boolean(
    filters.batchNumber || filters.expiryFrom || filters.expiryTo || filters.positiveStockOnly
  );

  return (
    <div className="inventory-container">
      <nav className="inventory-nav" aria-label="Breadcrumb">
        <Link to="/inventory/items">← Back to Inventory Items</Link>
      </nav>

      <div className="inventory-header">
        <div>
          <h1>Inventory Batches</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Global batch tracking, expiry monitoring, and stock allocations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/inventory/items" className="btn btn-secondary">
            View Items
          </Link>
          <Link to="/inventory/items/new" className="btn btn-primary">
            Register New Item
          </Link>
        </div>
      </div>

      <form className="batch-filters-card" onSubmit={handleFilterSubmit} aria-label="Batch search filters">
        <div className="filters-grid">
          <div className="form-group">
            <label htmlFor="batch-search-number">Batch Number</label>
            <input
              id="batch-search-number"
              type="text"
              className="form-control"
              placeholder="Search batch number..."
              value={formInputs.batchNumber}
              onChange={(e) => handleInputChange('batchNumber', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="batch-expiry-from">Expiry From</label>
            <input
              id="batch-expiry-from"
              type="date"
              className="form-control"
              value={formInputs.expiryFrom}
              onChange={(e) => handleInputChange('expiryFrom', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="batch-expiry-to">Expiry To</label>
            <input
              id="batch-expiry-to"
              type="date"
              className="form-control"
              value={formInputs.expiryTo}
              onChange={(e) => handleInputChange('expiryTo', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
            <label className="checkbox-label" style={{ margin: 0 }}>
              <input
                id="batch-positive-stock"
                type="checkbox"
                checked={formInputs.positiveStockOnly}
                onChange={(e) => handleInputChange('positiveStockOnly', e.target.checked)}
                disabled={loading}
              />
              In-stock batches only
            </label>
          </div>
        </div>

        <div className="filters-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            Apply Filters
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
            disabled={loading || !hasActiveFilters}
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="error-alert" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading inventory batches...
        </div>
      ) : batches.length === 0 ? (
        <div className="empty-state">
          {hasActiveFilters ? (
            <>
              <p>No inventory batches match your filter criteria.</p>
              <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                Clear Filters
              </button>
            </>
          ) : (
            <p>No inventory batches currently exist in the system.</p>
          )}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="inventory-table batches-table" aria-label="Global inventory batches">
              <thead>
                <tr>
                  <th scope="col">Batch Number</th>
                  <th scope="col">Item</th>
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
                    <td>
                      {b.inventoryItemId ? (
                        <Link to={`/inventory/items/${b.inventoryItemId}`} className="item-link">
                          {b.itemName} ({b.itemCode})
                        </Link>
                      ) : (
                        `${b.itemName || '—'} (${b.itemCode || '—'})`
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
