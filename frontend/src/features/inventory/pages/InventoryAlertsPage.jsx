import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LowStockAlertsTable from '../components/LowStockAlertsTable';
import ExpiryAlertsTable from '../components/ExpiryAlertsTable';
import '../inventory.css';

export default function InventoryAlertsPage() {
  const [activeTab, setActiveTab] = useState('low-stock');

  return (
    <div className="inventory-container">
      <nav className="inventory-nav" aria-label="Breadcrumb">
        <Link to="/inventory/items">← Back to Inventory Items</Link>
      </nav>

      <div className="inventory-header">
        <div>
          <h1>Inventory Alerts</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Monitor low-stock reorder thresholds and impending product expiries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/inventory/items" className="btn btn-secondary">
            View Items
          </Link>
          <Link to="/inventory/batches" className="btn btn-secondary">
            View Batches
          </Link>
        </div>
      </div>

      <div className="detail-card tabs-card">
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
            Low Stock Alerts
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
            Expiry Alerts
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
