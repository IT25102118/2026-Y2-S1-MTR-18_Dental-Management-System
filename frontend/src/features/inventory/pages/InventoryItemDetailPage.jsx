import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getItemById, updateItemStatus, InventoryApiError } from '../api/inventoryApi';
import { StockStatusBadge, ActiveStatusBadge } from '../components/InventoryStatusBadge';
import StockMovementHistoryTable from '../components/StockMovementHistoryTable';
import ItemBatchesTable from '../components/ItemBatchesTable';
import '../inventory.css';

/**
 * Format ISO datetime string readably without external libraries.
 */
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

/**
 * Detail page displaying master data, current quantity, and lifecycle controls for an inventory item.
 */
export default function InventoryItemDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [activeTab, setActiveTab] = useState('movements');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    getItemById(id)
      .then((data) => {
        if (isMounted) {
          setItem(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof InventoryApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setLoadError(err.message || 'Failed to load inventory item.');
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleStatus = async (newActiveState) => {
    setStatusSubmitting(true);
    setActionError(null);

    try {
      const updated = await updateItemStatus(id, newActiveState);
      setItem(updated);
      setShowDeactivateConfirm(false);
    } catch (err) {
      setActionError(err.message || 'Failed to update item status.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="inventory-container">
        <div className="loading-state" role="status">
          Loading item details...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="inventory-container">
        <nav className="inventory-nav" aria-label="Breadcrumb">
          <Link to="/inventory/items">← Back to Inventory Items</Link>
        </nav>
        <div className="empty-state" role="alert">
          <h2>Item Not Found</h2>
          <p>The requested inventory item does not exist or has been removed.</p>
          <Link to="/inventory/items" className="btn btn-primary">
            Return to Inventory Catalog
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="inventory-container">
        <nav className="inventory-nav" aria-label="Breadcrumb">
          <Link to="/inventory/items">← Back to Inventory Items</Link>
        </nav>
        <div className="error-alert" role="alert">
          <p>{loadError}</p>
          <Link to="/inventory/items" className="btn btn-secondary btn-sm">
            Back to Items
          </Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="inventory-container">
      <nav className="inventory-nav" aria-label="Breadcrumb">
        <Link to="/inventory/items">← Back to Inventory Items</Link>
      </nav>

      <div className="inventory-header">
        <div>
          <h1>{item.name}</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>Item Code: {item.itemCode}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <StockStatusBadge currentQuantity={item.currentQuantity} lowStock={item.lowStock} />
          <ActiveStatusBadge active={item.active} />
        </div>
      </div>

      {actionError && (
        <div className="error-alert" role="alert">
          <p>{actionError}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="detail-card">
        <h2>Item Specifications</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Item Code</span>
            <span className="detail-value">{item.itemCode}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Item Name</span>
            <span className="detail-value">{item.name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Category</span>
            <span className="detail-value">{item.category}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Unit of Measurement</span>
            <span className="detail-value">{item.unit}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Current Stock Quantity</span>
            <span className="detail-value" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {item.currentQuantity}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Reorder Level</span>
            <span className="detail-value">{item.reorderLevel}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Default Supplier Reference</span>
            <span className="detail-value">{item.defaultSupplierReference || 'None specified'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Created At</span>
            <span className="detail-value">{formatDateTime(item.createdAt)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Updated</span>
            <span className="detail-value">{formatDateTime(item.updatedAt)}</span>
          </div>
        </div>

        <div className="detail-actions">
          <Link to={`/inventory/items/${item.id}/edit`} className="btn btn-secondary">
            Edit Item
          </Link>

          {item.active ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowDeactivateConfirm(true)}
              disabled={statusSubmitting || showDeactivateConfirm}
            >
              Deactivate Item
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleToggleStatus(true)}
              disabled={statusSubmitting}
            >
              {statusSubmitting ? 'Activating...' : 'Activate Item'}
            </button>
          )}
        </div>

        {showDeactivateConfirm && (
          <div
            className="confirmation-card"
            role="region"
            aria-label="Confirm deactivation"
          >
            <p>
              Are you sure you want to deactivate <strong>{item.name}</strong>? It will not be
              available for new stock operations.
            </p>
            <div className="confirmation-actions">
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleToggleStatus(false)}
                disabled={statusSubmitting}
              >
                {statusSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDeactivateConfirm(false)}
                disabled={statusSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="detail-card tabs-card">
        <div className="tab-navigation" role="tablist" aria-label="Item activity tabs">
          <button
            type="button"
            role="tab"
            id="tab-movements"
            aria-controls="panel-movements"
            aria-selected={activeTab === 'movements'}
            className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            Movement History
          </button>
          <button
            type="button"
            role="tab"
            id="tab-batches"
            aria-controls="panel-batches"
            aria-selected={activeTab === 'batches'}
            className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
            onClick={() => setActiveTab('batches')}
          >
            Active Batches
          </button>
        </div>

        <div
          id="panel-movements"
          role="tabpanel"
          aria-labelledby="tab-movements"
          hidden={activeTab !== 'movements'}
        >
          {activeTab === 'movements' && <StockMovementHistoryTable itemId={item.id} />}
        </div>

        <div
          id="panel-batches"
          role="tabpanel"
          aria-labelledby="tab-batches"
          hidden={activeTab !== 'batches'}
        >
          {activeTab === 'batches' && <ItemBatchesTable itemId={item.id} />}
        </div>
      </div>
    </div>
  );
}
