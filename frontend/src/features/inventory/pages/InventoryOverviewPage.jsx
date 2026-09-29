import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  AlertTriangle,
  CalendarClock,
  Plus,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  RefreshCw
} from 'lucide-react';
import InventoryPageHeader from '../components/InventoryPageHeader';
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

  const headerActions = (
    <Link to="/inventory/items/new" className="btn btn-primary" data-testid="overview-register-btn">
      <Plus size={16} aria-hidden="true" style={{ marginRight: '0.35rem' }} />
      Register New Item
    </Link>
  );

  return (
    <div className="inventory-container">
      <InventoryPageHeader
        title="Inventory Management"
        subtitle="Practice inventory catalog, batch tracking, and operational stock monitoring."
        breadcrumb={{ to: '/', label: '← Back to Home' }}
        actions={headerActions}
        showNav={true}
      />

      {error && (
        <div className="error-alert" role="region" aria-label="Overview error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchOverviewMetrics}>
            Retry
          </button>
        </div>
      )}

      {/* Operational Attention Banner */}
      {!loading && !error && metrics.lowStockCount !== null && (
        metrics.lowStockCount > 0 ? (
          <div className="overview-attention-banner attention-warning" role="region" aria-label="Low-stock attention required">
            <div className="attention-icon-wrap" aria-hidden="true">
              <AlertTriangle size={22} />
            </div>
            <div className="attention-content">
              <h4 className="attention-heading">Attention Required: Low-Stock Threshold Reached</h4>
              <p>
                <strong>{metrics.lowStockCount}</strong> {metrics.lowStockCount === 1 ? 'supply item is' : 'supply items are'} currently at or below minimum reorder levels. Review stock to prevent operatory shortages.
              </p>
            </div>
            <div className="attention-action">
              <Link to="/inventory/alerts" className="btn btn-warning btn-sm">
                View Low-Stock Alerts →
              </Link>
            </div>
          </div>
        ) : (
          <div className="overview-attention-banner attention-healthy" role="region" aria-label="Stock status healthy">
            <div className="attention-icon-wrap" aria-hidden="true">
              <CheckCircle2 size={22} />
            </div>
            <div className="attention-content">
              <h4 className="attention-heading">Stock Levels Healthy</h4>
              <p>All active inventory catalog items currently meet or exceed their designated reorder thresholds.</p>
            </div>
            <div className="attention-action">
              <Link to="/inventory/alerts" className="btn btn-secondary btn-sm">
                View Alerts Status
              </Link>
            </div>
          </div>
        )
      )}

      {/* KPI Cards Grid */}
      <h2 className="sr-only">Key Performance Indicators</h2>
      <div className="overview-grid" aria-label="Inventory overview summary cards">
        {/* Card 1: Catalog Items */}
        <div className="overview-card" data-testid="overview-card-items">
          <div className="overview-card-header">
            <div className="overview-card-title-wrap">
              <span className="card-header-icon items" aria-hidden="true">
                <Package size={18} />
              </span>
              <h3>Catalog Items</h3>
            </div>
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
            <div className="overview-card-title-wrap">
              <span className="card-header-icon batches" aria-hidden="true">
                <Boxes size={18} />
              </span>
              <h3>Batches</h3>
            </div>
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
            <div className="overview-card-title-wrap">
              <span className="card-header-icon alerts" aria-hidden="true">
                <AlertTriangle size={18} />
              </span>
              <h3>Low-Stock Alerts</h3>
            </div>
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
            <div className="overview-card-title-wrap">
              <span className="card-header-icon expiry" aria-hidden="true">
                <CalendarClock size={18} />
              </span>
              <h3>Expiry Monitoring</h3>
            </div>
            <span className="overview-card-badge">Monitoring</span>
          </div>
          <div className="overview-metric-subtext">Date Horizon</div>
          <p className="overview-desc">
            Impending product expiries monitored via staff-selected target cutoff dates.
            Review batches approaching or past expiration to safeguard clinical operatory safety.
          </p>
          <div className="overview-card-actions">
            <Link to="/inventory/alerts" className="btn btn-primary btn-sm">
              Inspect Expiry Alerts →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Operational Navigation */}
      <section className="overview-quick-nav-section" aria-labelledby="quick-nav-title">
        <h2 id="quick-nav-title" className="overview-section-title">
          Quick Operational Navigation
        </h2>
        <div className="overview-quick-grid">
          <Link to="/inventory/items/new" className="quick-nav-card">
            <div className="quick-nav-icon-wrap" aria-hidden="true">
              <Plus size={20} />
            </div>
            <div className="quick-nav-body">
              <span className="quick-nav-title">Register Catalog Item</span>
              <span className="quick-nav-desc">Create master records for new clinical supplies, instruments, and materials.</span>
            </div>
            <ArrowRight size={16} className="quick-nav-arrow" aria-hidden="true" />
          </Link>

          <Link to="/inventory/items" className="quick-nav-card">
            <div className="quick-nav-icon-wrap" aria-hidden="true">
              <Search size={20} />
            </div>
            <div className="quick-nav-body">
              <span className="quick-nav-title">Browse & Filter Catalog</span>
              <span className="quick-nav-desc">Search items by category, active status, and current stock level.</span>
            </div>
            <ArrowRight size={16} className="quick-nav-arrow" aria-hidden="true" />
          </Link>

          <Link to="/inventory/batches" className="quick-nav-card">
            <div className="quick-nav-icon-wrap" aria-hidden="true">
              <Boxes size={20} />
            </div>
            <div className="quick-nav-body">
              <span className="quick-nav-title">Batch & Lot Search</span>
              <span className="quick-nav-desc">Inspect lot numbers, remaining quantities, and receipt arrival dates.</span>
            </div>
            <ArrowRight size={16} className="quick-nav-arrow" aria-hidden="true" />
          </Link>

          <Link to="/inventory/alerts" className="quick-nav-card">
            <div className="quick-nav-icon-wrap" aria-hidden="true">
              <AlertTriangle size={20} />
            </div>
            <div className="quick-nav-body">
              <span className="quick-nav-title">Operational Alerts Center</span>
              <span className="quick-nav-desc">Manage low-stock shortages and filter batches by expiry cutoff date.</span>
            </div>
            <ArrowRight size={16} className="quick-nav-arrow" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Operational Guidelines & Governance */}
      <section className="overview-guidelines-section" aria-labelledby="guidelines-title">
        <div className="detail-card">
          <h2 id="guidelines-title" className="overview-section-title" style={{ marginTop: 0 }}>
            Operational Principles & Governance
          </h2>
          <div className="guidelines-grid">
            <div className="guideline-card">
              <div className="guideline-icon-wrap" aria-hidden="true">
                <ShieldCheck size={20} />
              </div>
              <div className="guideline-body">
                <strong>Append-Only Stock Ledger</strong>
                <p>
                  Newly created catalog items begin with an initial stock of 0.
                  Stock mutations are performed via audited stock movements with
                  shared authentication/current-user integration.
                </p>
              </div>
            </div>

            <div className="guideline-card">
              <div className="guideline-icon-wrap" aria-hidden="true">
                <Layers size={20} />
              </div>
              <div className="guideline-body">
                <strong>Batch Selection Integrity</strong>
                <p>
                  Unbatched stock is explicitly tracked without synthetic batch numbers,
                  and no automated FEFO/FIFO deductions are made. Staff must verify physical lots dispensed.
                </p>
              </div>
            </div>

            <div className="guideline-card">
              <div className="guideline-icon-wrap" aria-hidden="true">
                <RefreshCw size={20} />
              </div>
              <div className="guideline-body">
                <strong>Non-Destructive Reversals</strong>
                <p>
                  Mistaken entries are corrected through compensating reversal transactions, preserving complete audit trails while protecting against stock deficits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
