import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import InventoryNav from '../components/InventoryNav';
import { getItems } from '../api/inventoryApi';
import { searchBatches } from '../api/movementApi';
import { getLowStockAlerts } from '../api/alertApi';
import '../inventory.css';

export default function InventoryOverviewPage() {
  const [metrics, setMetrics] = useState({
    itemCount: null,
    batchCount: null,
    lowStockCount: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverviewMetrics = async () => {
    setLoading(true);
    setError(null);

    const [itemsRes, batchesRes, alertsRes] = await Promise.allSettled([
      getItems({ page: 0, size: 1 }),
      searchBatches({ page: 0, size: 1 }),
      getLowStockAlerts({ page: 0, size: 1 })
    ]);

    const newMetrics = {
      itemCount: itemsRes.status === 'fulfilled' ? itemsRes.value.totalElements : null,
      batchCount: batchesRes.status === 'fulfilled' ? batchesRes.value.totalElements : null,
      lowStockCount: alertsRes.status === 'fulfilled' ? alertsRes.value.totalElements : null
    };

    setMetrics(newMetrics);

    // If all three failed, surface an error
    if (
      itemsRes.status === 'rejected' &&
      batchesRes.status === 'rejected' &&
      alertsRes.status === 'rejected'
    ) {
      setError('Unable to load overview metrics from the inventory service.');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOverviewMetrics();
  }, []);

  return (
    <div className="inventory-container">
      <nav className="inventory-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="inventory-header">
        <div>
          <h1>Inventory Management</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Practice inventory catalog, batch tracking, and operational stock monitoring.
          </p>
        </div>
        <Link to="/inventory/items/new" className="btn btn-primary">
          Register New Item
        </Link>
      </div>

      <InventoryNav />

      {error && (
        <div className="error-alert" role="region" aria-label="Overview error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchOverviewMetrics}>
            Retry
          </button>
        </div>
      )}

      <div className="overview-grid" aria-label="Inventory overview summary cards">
        {/* Card 1: Catalog Items */}
        <div className="overview-card" data-testid="overview-card-items">
          <div className="overview-card-header">
            <h3>Catalog Items</h3>
            <span className="overview-card-badge">Catalog</span>
          </div>
          <div className="overview-metric">
            {loading ? '...' : metrics.itemCount !== null ? metrics.itemCount : '—'}
          </div>
          <p className="overview-desc">
            Active and registered supply items tracked within the dental clinic catalog.
          </p>
          <div className="overview-card-actions">
            <Link to="/inventory/items" className="btn btn-primary btn-sm">
              Browse Items →
            </Link>
            <Link to="/inventory/items/new" className="btn btn-secondary btn-sm">
              + Register
            </Link>
          </div>
        </div>

        {/* Card 2: Batch Tracking */}
        <div className="overview-card" data-testid="overview-card-batches">
          <div className="overview-card-header">
            <h3>Batches</h3>
            <span className="overview-card-badge">Tracking</span>
          </div>
          <div className="overview-metric">
            {loading ? '...' : metrics.batchCount !== null ? metrics.batchCount : '—'}
          </div>
          <p className="overview-desc">
            Tracked product allocations, quantities on hand, and arrival records across items.
          </p>
          <div className="overview-card-actions">
            <Link to="/inventory/batches" className="btn btn-primary btn-sm">
              Search Batches →
            </Link>
          </div>
        </div>

        {/* Card 3: Low-Stock Alerts */}
        <div className="overview-card" data-testid="overview-card-low-stock">
          <div className="overview-card-header">
            <h3>Low-Stock Alerts</h3>
            {metrics.lowStockCount !== null && metrics.lowStockCount > 0 ? (
              <span className="stock-alert-badge badge-low-stock">Action Required</span>
            ) : (
              <span className="overview-card-badge">Thresholds</span>
            )}
          </div>
          <div className="overview-metric" style={{ color: metrics.lowStockCount > 0 ? '#b91c1c' : '#0f172a' }}>
            {loading ? '...' : metrics.lowStockCount !== null ? metrics.lowStockCount : '—'}
          </div>
          <p className="overview-desc">
            Active supplies currently at or below their designated reorder threshold.
          </p>
          <div className="overview-card-actions">
            <Link to="/inventory/alerts" className="btn btn-primary btn-sm">
              View Low Stock →
            </Link>
          </div>
        </div>

        {/* Card 4: Expiry Monitoring */}
        <div className="overview-card" data-testid="overview-card-expiry">
          <div className="overview-card-header">
            <h3>Expiry Monitoring</h3>
            <span className="overview-card-badge">Monitoring</span>
          </div>
          <div className="overview-metric-subtext">User Horizon</div>
          <p className="overview-desc">
            Cutoff-dependent expiry monitoring. Requires user-selected horizon (today or later)
            to compute impending expiries without speculative assumptions.
          </p>
          <div className="overview-card-actions">
            <Link to="/inventory/alerts" className="btn btn-primary btn-sm">
              Inspect Expiry Alerts →
            </Link>
          </div>
        </div>
      </div>

      <div className="detail-card" style={{ marginTop: '2rem' }}>
        <h2>Operational Guidelines</h2>
        <ul style={{ margin: '0.75rem 0 0 1.25rem', color: '#475569', lineHeight: '1.7' }}>
          <li>
            <strong>Initial Balance:</strong> Newly created catalog items begin with an initial stock of 0.
          </li>
          <li>
            <strong>Stock Mutations:</strong> Stock movement and reversal workflows are active and integrated with shared authentication/current-user integration.
          </li>
          <li>
            <strong>Batch Integrity:</strong> Unbatched stock is explicitly tracked without synthetic batch numbers,
            and no automated FEFO/FIFO deductions are made.
          </li>
        </ul>
      </div>
    </div>
  );
}
