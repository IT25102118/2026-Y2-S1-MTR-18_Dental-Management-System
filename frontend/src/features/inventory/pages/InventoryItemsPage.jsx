import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit2, Search, Package, AlertCircle, RefreshCw } from 'lucide-react';
import { getItems } from '../api/inventoryApi';
import { StockStatusBadge, ActiveStatusBadge } from '../components/InventoryStatusBadge';
import InventoryPageHeader from '../components/InventoryPageHeader';
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
      if (data.totalPages > 0 && pageNum >= data.totalPages) {
        fetchItems(currentFilters, data.totalPages - 1);
        return;
      }
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

  const handleRemoveFilter = (filterKey) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (filterKey === 'active') {
        updated.active = undefined;
      } else if (filterKey === 'stockStatus') {
        updated.stockStatus = undefined;
      } else {
        updated[filterKey] = '';
      }
      return updated;
    });
  };

  const handlePageChange = (newPage) => {
    fetchItems(filters, newPage);
  };

  const handleRetry = () => {
    fetchItems(filters, pageInfo.number);
  };

  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim() !== '') ||
    (filters.category && filters.category.trim() !== '') ||
    (filters.active !== undefined && filters.active !== null && filters.active !== '') ||
    (filters.stockStatus && filters.stockStatus !== 'ALL')
  );

  return (
    <div className="inventory-container">
      <InventoryPageHeader
        title="Inventory Items"
        subtitle="Manage clinical supplies, stock levels, reorder thresholds, and catalog metadata"
        actions={
          <Link to="/inventory/items/new" className="btn btn-primary" data-testid="register-item-btn">
            <Plus size={16} aria-hidden="true" />
            <span>Register New Item</span>
          </Link>
        }
      />

      <h2 className="sr-only">Inventory Catalog</h2>
      <div className="catalog-toolbar">
        <div className="catalog-toolbar-info">
          <span>Central catalog for pharmaceutical, restorative, consumable, and diagnostic stock items.</span>
        </div>
        {!loading && !error && (
          <div className="catalog-total-pill" data-testid="catalog-total-pill">
            Total in Catalog: <strong>{pageInfo.totalElements}</strong>
          </div>
        )}
      </div>

      <InventoryFilters
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onRemoveFilter={handleRemoveFilter}
        disabled={loading}
      />

      {error && (
        <div className="error-alert" role="alert">
          <div className="error-alert-content">
            <AlertCircle size={18} aria-hidden="true" />
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            <RefreshCw size={13} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          <div className="loading-spinner" aria-hidden="true" />
          <span>Loading inventory items...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" data-testid="empty-catalog-state">
          {hasActiveFilters ? (
            <>
              <div className="empty-state-icon" aria-hidden="true">
                <Search size={44} strokeWidth={1.5} color="var(--inv-text-muted, #94a3b8)" />
              </div>
              <h3>No Matching Inventory Items</h3>
              <p>No inventory items match your search or filter criteria.</p>
              <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <div className="empty-state-icon" aria-hidden="true">
                <Package size={48} strokeWidth={1.5} color="var(--inv-brand-primary, #244b4b)" />
              </div>
              <h3>Inventory Catalog is Empty</h3>
              <p>No inventory items have been registered yet. Get started by registering clinical supplies, pharmaceuticals, or dental materials.</p>
              <Link to="/inventory/items/new" className="btn btn-primary btn-lg" style={{ marginTop: '0.5rem' }}>
                <Plus size={16} aria-hidden="true" style={{ marginRight: '0.35rem', verticalAlign: 'text-bottom' }} />
                <span>Register New Item</span>
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="catalog-table-summary">
            <div className="catalog-table-count">
              Showing <strong>{pageInfo.number * pageInfo.size + 1}</strong>–
              <strong>{Math.min((pageInfo.number + 1) * pageInfo.size, pageInfo.totalElements)}</strong> of <strong>{pageInfo.totalElements}</strong> items
              {hasActiveFilters && <span className="filtered-tag">Filtered</span>}
            </div>
          </div>

          <div className="table-responsive catalog-table-wrap">
            <table className="inventory-table catalog-table" aria-label="Inventory catalog table">
              <thead>
                <tr>
                  <th scope="col" className="col-item-code">Item Code</th>
                  <th scope="col" className="col-item-name">Name</th>
                  <th scope="col" className="col-item-category">Category</th>
                  <th scope="col" className="col-item-unit">Unit</th>
                  <th scope="col" className="col-item-qty num-cell">Current Qty</th>
                  <th scope="col" className="col-item-reorder num-cell">Reorder Lvl</th>
                  <th scope="col" className="col-item-stock-status">Stock Status</th>
                  <th scope="col" className="col-item-active-status">Active Status</th>
                  <th scope="col" className="col-item-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isLow = item.lowStock || (item.reorderLevel > 0 && item.currentQuantity <= item.reorderLevel);
                  const isOut = item.currentQuantity === 0;
                  return (
                    <tr key={item.id} className={!item.active ? 'row-inactive' : undefined}>
                      <td className="cell-item-code">
                        <Link to={`/inventory/items/${item.id}`} className="inv-mono item-code-link">
                          {item.itemCode}
                        </Link>
                      </td>
                      <td className="cell-item-name">
                        <Link to={`/inventory/items/${item.id}`} className="item-name-link">
                          {item.name}
                        </Link>
                      </td>
                      <td className="cell-item-category">
                        <span className="catalog-category-tag">{item.category}</span>
                      </td>
                      <td className="cell-item-unit">{item.unit}</td>
                      <td className="cell-item-qty num-cell">
                        <span className={`qty-value ${isOut ? 'qty-zero' : (isLow ? 'qty-low' : 'qty-normal')}`}>
                          {item.currentQuantity}
                        </span>
                      </td>
                      <td className="cell-item-reorder num-cell">
                        <span className="reorder-value">{item.reorderLevel}</span>
                      </td>
                      <td className="cell-item-stock-status">
                        <StockStatusBadge
                          currentQuantity={item.currentQuantity}
                          lowStock={item.lowStock}
                        />
                      </td>
                      <td className="cell-item-active-status">
                        <ActiveStatusBadge active={item.active} />
                      </td>
                      <td className="cell-item-actions">
                        <div className="table-actions">
                          <Link
                            to={`/inventory/items/${item.id}`}
                            className="btn btn-secondary btn-sm table-action-btn"
                            aria-label={`View ${item.name}`}
                          >
                            <Eye size={13} aria-hidden="true" />
                            <span>View</span>
                          </Link>
                          <Link
                            to={`/inventory/items/${item.id}/edit`}
                            className="btn btn-secondary btn-sm table-action-btn"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit2 size={13} aria-hidden="true" />
                            <span>Edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
