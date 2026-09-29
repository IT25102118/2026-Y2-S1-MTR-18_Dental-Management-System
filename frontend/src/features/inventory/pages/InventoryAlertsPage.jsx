import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Package,
  Boxes,
  ShieldCheck,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import LowStockAlertsTable from '../components/LowStockAlertsTable';
import ExpiryAlertsTable from '../components/ExpiryAlertsTable';
import InventoryPageHeader from '../components/InventoryPageHeader';
import '../inventory.css';

export default function InventoryAlertsPage() {
  const [activeTab, setActiveTab] = useState('low-stock');

  return (
    <div className="inventory-container">
      <InventoryPageHeader
        title="Inventory Alerts"
        subtitle="Monitor low-stock reorder thresholds and impending product expiries."
        breadcrumb={{ to: '/inventory/items', label: '← Back to Inventory Items' }}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              to="/inventory/items"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Package size={14} aria-hidden="true" />
              <span>View Items</span>
            </Link>
            <Link
              to="/inventory/batches"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Boxes size={14} aria-hidden="true" />
              <span>View Batches</span>
            </Link>
          </div>
        }
      />

      {/* Executive Alert Intelligence Summary Cards */}
      <div className="alerts-kpi-grid" aria-label="Alerts executive summary">
        <div className="alerts-kpi-card kpi-warning">
          <div className="alerts-kpi-icon-wrap" aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <div className="alerts-kpi-content">
            <div className="alerts-kpi-header">
              <span className="alerts-kpi-title">Stock Depletion Watch</span>
              <span className="alerts-kpi-badge">Reorder Alerts</span>
            </div>
            <div className="alerts-kpi-number">
              <span>Safety Stock</span>
            </div>
            <p className="alerts-kpi-desc">
              Active supplies at or below minimum threshold requiring replenishment.
            </p>
          </div>
        </div>

        <div className="alerts-kpi-card kpi-horizon">
          <div className="alerts-kpi-icon-wrap" aria-hidden="true">
            <CalendarClock size={22} />
          </div>
          <div className="alerts-kpi-content">
            <div className="alerts-kpi-header">
              <span className="alerts-kpi-title">Shelf-Life Compliance</span>
              <span className="alerts-kpi-badge">Perishables</span>
            </div>
            <div className="alerts-kpi-number">
              <span>FIFO Horizon</span>
            </div>
            <p className="alerts-kpi-desc">
              Impending batch expiration monitoring to prevent clinic wastage and compliance risks.
            </p>
          </div>
        </div>

        <div className="alerts-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div
            className="alerts-kpi-icon-wrap"
            style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}
            aria-hidden="true"
          >
            <ShieldCheck size={22} />
          </div>
          <div className="alerts-kpi-content">
            <div className="alerts-kpi-header">
              <span className="alerts-kpi-title">Operatory Readiness</span>
              <span
                className="alerts-kpi-badge"
                style={{ background: '#ecfdf5', color: '#065f46' }}
              >
                Protocol
              </span>
            </div>
            <div className="alerts-kpi-number">
              <span>Active Control</span>
            </div>
            <p className="alerts-kpi-desc">
              Automated stock checks keep dental operatories equipped without clinical disruption.
            </p>
          </div>
        </div>
      </div>

      <h2 className="sr-only">Inventory Alert Panels</h2>
      <div className="detail-card tabs-card alerts-card">
        <div className="tab-navigation" role="tablist" aria-label="Inventory alert tabs">
          <button
            type="button"
            role="tab"
            id="tab-low-stock"
            aria-controls="panel-low-stock"
            aria-selected={activeTab === 'low-stock'}
            className={`tab-btn ${activeTab === 'low-stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('low-stock')}
          >
            <AlertTriangle size={15} aria-hidden="true" />
            <span>Low Stock Alerts</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-expiry"
            aria-controls="panel-expiry"
            aria-selected={activeTab === 'expiry'}
            className={`tab-btn ${activeTab === 'expiry' ? 'active' : ''}`}
            onClick={() => setActiveTab('expiry')}
          >
            <CalendarClock size={15} aria-hidden="true" />
            <span>Expiry Alerts</span>
          </button>
        </div>

        <div
          id="panel-low-stock"
          role="tabpanel"
          aria-labelledby="tab-low-stock"
          hidden={activeTab !== 'low-stock'}
        >
          {activeTab === 'low-stock' && <LowStockAlertsTable />}
        </div>

        <div
          id="panel-expiry"
          role="tabpanel"
          aria-labelledby="tab-expiry"
          hidden={activeTab !== 'expiry'}
        >
          {activeTab === 'expiry' && <ExpiryAlertsTable />}
        </div>
      </div>
    </div>
  );
}
