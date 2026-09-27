import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Building2,
  AlertTriangle,
  AlertOctagon
} from 'lucide-react';
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

  // Quick summary counts
  const outOfStockCount = alerts.filter((a) => a.outOfStock).length;
  const lowStockCount = alerts.filter((a) => !a.outOfStock).length;
  const totalDeficitUnits = alerts.reduce((acc, item) => {
    const def =
      item.deficit !== undefined && item.deficit !== null
        ? item.deficit
        : Math.max((item.reorderLevel || 0) - (item.currentQuantity || 0), 0);
    return acc + def;
  }, 0);

  return (
    <div className="alerts-table-container" data-testid="low-stock-alerts-section">
      {/* Quick Status Pill Bar when alerts are present */}
      {!loading && !error && alerts.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            padding: '0.625rem 0.875rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '0.8125rem'
          }}
        >
          <span style={{ fontWeight: 600, color: '#475569' }}>Current Alert Snapshot:</span>
          {outOfStockCount > 0 && (
            <span className="stock-alert-badge badge-out-of-stock">
              {outOfStockCount} {outOfStockCount === 1 ? 'Item' : 'Items'} Out of Stock
            </span>
          )}
          {lowStockCount > 0 && (
            <span className="stock-alert-badge badge-low-stock">
              {lowStockCount} {lowStockCount === 1 ? 'Item' : 'Items'} Low Stock
            </span>
          )}
          {totalDeficitUnits > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                fontWeight: 600,
                color: '#64748b'
              }}
            >
              Cumulative Deficit: <strong style={{ color: '#b91c1c' }}>+{totalDeficitUnits} units</strong>
            </span>
          )}
        </div>
      )}

      <div className="alerts-toolbar">
        <form onSubmit={handleFilterSubmit} className="alerts-filter-form">
          <label htmlFor="low-stock-category-filter" className="filter-label">
            Filter by Category:
          </label>
          <div className="alerts-filter-input-wrap">
            <Search size={14} className="alerts-filter-icon" aria-hidden="true" />
            <input
              id="low-stock-category-filter"
              type="text"
              className="form-control form-control-sm"
              placeholder="e.g. Diagnostic, Consumable..."
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              disabled={loading}
            />
          </div>
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
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} aria-hidden="true" />
          <span>Refresh Alerts</span>
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
        <div className="alerts-empty-state-modern empty-state">
          <div
            className={`empty-state-icon-box ${categoryFilter ? 'icon-search' : 'icon-healthy'}`}
            aria-hidden="true"
          >
            {categoryFilter ? <Search size={28} /> : <ShieldCheck size={28} />}
          </div>
          <h3 className="alerts-empty-title">
            {categoryFilter ? 'No Category Matches' : 'Stock Levels Completely Compliant'}
          </h3>
          <p className="alerts-empty-desc">
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
                  <th scope="col" style={{ textAlign: 'right' }}>Current Stock</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Reorder Level</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Deficit</th>
                  <th scope="col">Default Supplier</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((item) => {
                  const deficit =
                    item.deficit !== undefined && item.deficit !== null
                      ? item.deficit
                      : Math.max((item.reorderLevel || 0) - (item.currentQuantity || 0), 0);
                  const targetLevel = item.reorderLevel || 0;
                  const currentQty = item.currentQuantity || 0;
                  const percentOfTarget =
                    targetLevel > 0
                      ? Math.min(100, Math.round((currentQty / targetLevel) * 100))
                      : currentQty > 0 ? 100 : 0;

                  return (
                    <tr key={item.itemId}>
                      <td>
                        <Link to={`/inventory/items/${item.itemId}`} className="item-link">
                          <div className="item-link-wrap">
                            <div className="item-icon-box" aria-hidden="true">
                              <Package size={16} />
                            </div>
                            <div>
                              <strong className="item-title-text">{item.name}</strong>{' '}
                              <span className="inv-mono inv-mono-badge">({item.itemCode})</span>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {item.category ? (
                          <span className="category-pill">{item.category}</span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
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
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        <div className="stock-health-container" style={{ alignItems: 'flex-end' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: item.outOfStock ? '#dc2626' : '#0f172a'
                            }}
                          >
                            {item.currentQuantity} {item.unit || ''}
                          </span>
                          <div
                            className="stock-health-bar-track"
                            aria-hidden="true"
                            title={`Stock health: ${percentOfTarget}% of minimum target`}
                          >
                            <div
                              className={`stock-health-bar-fill ${
                                item.outOfStock ? 'fill-depleted' : 'fill-low'
                              }`}
                              style={{ width: `${percentOfTarget}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        <span style={{ fontWeight: 600, color: '#475569' }}>
                          {item.reorderLevel} {item.unit || ''}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        <span className={`deficit-indicator ${deficit === 0 ? 'at-threshold' : ''}`}>
                          {deficit > 0 ? `+${deficit} needed` : 'At threshold'}
                        </span>
                      </td>
                      <td>
                        {item.defaultSupplierReference ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              color: '#334155',
                              fontSize: '0.8125rem'
                            }}
                          >
                            <Building2 size={13} style={{ color: '#94a3b8' }} aria-hidden="true" />
                            <span>{item.defaultSupplierReference}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                            None specified
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/inventory/items/${item.itemId}`}
                          className="btn btn-secondary btn-sm"
                          aria-label={`View details for ${item.name}`}
                        >
                          View Item
                        </Link>
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
