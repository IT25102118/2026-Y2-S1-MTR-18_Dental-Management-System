import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getLowStockAlerts } from '../api/alertApi';
import InventoryPagination from './InventoryPagination';

export default function LowStockAlertsTable() {
  const [alerts, setAlerts] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async (cat, pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLowStockAlerts({
        category: cat || undefined,
        page: pageNum,
        size: 20,
        sort: 'currentQuantity,asc'
      });
      setAlerts(data.content);
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
      setError(err.message || 'Failed to load low-stock alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts(categoryFilter, 0);
  }, [fetchAlerts, categoryFilter]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setCategoryFilter(categoryInput.trim());
  };

  const handleResetFilter = () => {
    setCategoryInput('');
    setCategoryFilter('');
  };

  const handlePageChange = (newPage) => {
    fetchAlerts(categoryFilter, newPage);
  };

  const handleRetry = () => {
    fetchAlerts(categoryFilter, pageInfo.number);
  };

  return (
    <div className="alerts-table-container" data-testid="low-stock-alerts-section">
      <div className="alerts-toolbar">
        <form onSubmit={handleFilterSubmit} className="alerts-filter-form">
          <label htmlFor="low-stock-category-filter" className="filter-label">
            Filter by Category:
          </label>
          <input
            id="low-stock-category-filter"
            type="text"
            className="form-control form-control-sm"
            placeholder="e.g. Diagnostic, Consumable..."
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            Filter
          </button>
          {categoryFilter && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetFilter}
              disabled={loading}
            >
              Reset
            </button>
          )}
        </form>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleRetry}
          disabled={loading}
        >
          Refresh Alerts
        </button>
      </div>

      {error && (
        <div className="error-alert" role="region" aria-label="Low-stock alerts error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading low-stock alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <p>
            {categoryFilter
              ? `No low-stock items found in category "${categoryFilter}".`
              : 'All active catalog items currently meet or exceed their reorder thresholds.'}
          </p>
          {categoryFilter && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetFilter}>
              Clear Category Filter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="inventory-table alerts-table" aria-label="Low-stock inventory alerts">
              <thead>
                <tr>
                  <th scope="col">Item Code & Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Status</th>
                  <th scope="col">Current Stock</th>
                  <th scope="col">Reorder Level</th>
                  <th scope="col">Deficit</th>
                  <th scope="col">Default Supplier</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((item) => (
                  <tr key={item.itemId}>
                    <td>
                      <Link to={`/inventory/items/${item.itemId}`} className="item-link">
                        <strong>{item.name}</strong> ({item.itemCode})
                      </Link>
                    </td>
                    <td>{item.category || '—'}</td>
                    <td>
                      {item.outOfStock ? (
                        <span className="stock-alert-badge badge-out-of-stock">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="stock-alert-badge badge-low-stock">
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {item.currentQuantity} {item.unit || ''}
                    </td>
                    <td>
                      {item.reorderLevel} {item.unit || ''}
                    </td>
                    <td>
                      <span className="deficit-indicator">
                        {item.deficit > 0 ? `+${item.deficit} needed` : 'At threshold'}
                      </span>
                    </td>
                    <td>{item.defaultSupplierReference || 'None specified'}</td>
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
