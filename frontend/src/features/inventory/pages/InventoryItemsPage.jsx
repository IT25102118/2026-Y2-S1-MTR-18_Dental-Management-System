import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getItems } from '../api/inventoryApi';
import { StockStatusBadge, ActiveStatusBadge } from '../components/InventoryStatusBadge';
import InventoryFilters from '../components/InventoryFilters';
import InventoryPagination from '../components/InventoryPagination';
import '../inventory.css';

/**
 * Main Inventory Catalog Page listing inventory items with search, filtering, and pagination.
 */
export default function InventoryItemsPage() {
  const [items, setItems] = useState([]);
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
    search: '',
    category: '',
    active: undefined,
    stockStatus: undefined
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async (currentFilters, pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItems({
        ...currentFilters,
        page: pageNum,
        size: 20,
        sort: 'name,asc'
      });
      setItems(data.content);
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
      setError(err.message || 'Failed to load inventory items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(filters, 0);
  }, [fetchItems, filters]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      active: undefined,
      stockStatus: undefined
    });
  };

  const handlePageChange = (newPage) => {
    fetchItems(filters, newPage);
  };

  const handleRetry = () => {
    fetchItems(filters, pageInfo.number);
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.category || filters.active !== undefined || filters.stockStatus
  );

  return (
    <div className="inventory-container">
      <nav className="inventory-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="inventory-header">
        <h1>Inventory Items</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/inventory/batches" className="btn btn-secondary">
            View Batches
          </Link>
          <Link to="/inventory/alerts" className="btn btn-secondary">
            View Alerts
          </Link>
          <Link to="/inventory/items/new" className="btn btn-primary">
            Register New Item
          </Link>
        </div>
      </div>

      <InventoryFilters
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        disabled={loading}
      />

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
          Loading inventory items...
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          {hasActiveFilters ? (
            <>
              <p>No inventory items match your search or filter criteria.</p>
              <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <p>No inventory items have been registered yet.</p>
              <Link to="/inventory/items/new" className="btn btn-primary">
                Register New Item
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="inventory-table" aria-label="Inventory catalog table">
              <thead>
                <tr>
                  <th scope="col">Item Code</th>
                  <th scope="col">Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Current Qty</th>
                  <th scope="col">Reorder Lvl</th>
                  <th scope="col">Stock Status</th>
                  <th scope="col">Active Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/inventory/items/${item.id}`} style={{ fontWeight: 600 }}>
                        {item.itemCode}
                      </Link>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td>{item.currentQuantity}</td>
                    <td>{item.reorderLevel}</td>
                    <td>
                      <StockStatusBadge
                        currentQuantity={item.currentQuantity}
                        lowStock={item.lowStock}
                      />
                    </td>
                    <td>
                      <ActiveStatusBadge active={item.active} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/inventory/items/${item.id}`}
                          className="btn btn-secondary btn-sm"
                          aria-label={`View ${item.name}`}
                        >
                          View
                        </Link>
                        <Link
                          to={`/inventory/items/${item.id}/edit`}
                          className="btn btn-secondary btn-sm"
                          aria-label={`Edit ${item.name}`}
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <InventoryPagination
            page={pageInfo.number}
            totalPages={pageInfo.totalPages}
            totalElements={pageInfo.totalElements}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
