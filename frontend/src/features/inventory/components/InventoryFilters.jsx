import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, X, SlidersHorizontal } from 'lucide-react';

/**
 * Filter bar for searching and filtering inventory catalog items.
 * Includes active filter feedback chips and one-click reset/removal actions.
 */
export default function InventoryFilters({
  filters = {},
  onApply,
  onReset,
  onRemoveFilter,
  disabled = false
}) {
  const [draft, setDraft] = useState({
    search: filters.search || '',
    category: filters.category || '',
    active: filters.active !== undefined && filters.active !== null ? String(filters.active) : '',
    stockStatus: filters.stockStatus || ''
  });

  useEffect(() => {
    setDraft({
      search: filters.search || '',
      category: filters.category || '',
      active: filters.active !== undefined && filters.active !== null ? String(filters.active) : '',
      stockStatus: filters.stockStatus || ''
    });
  }, [filters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply({
      search: draft.search.trim(),
      category: draft.category.trim(),
      active: draft.active === '' ? undefined : (draft.active === 'true'),
      stockStatus: draft.stockStatus || undefined
    });
  };

  const handleReset = () => {
    const emptyDraft = {
      search: '',
      category: '',
      active: '',
      stockStatus: ''
    };
    setDraft(emptyDraft);
    onReset();
  };

  const handleRemoveChip = (key) => {
    if (onRemoveFilter) {
      onRemoveFilter(key);
    } else {
      const updated = {
        search: key === 'search' ? '' : (filters.search || ''),
        category: key === 'category' ? '' : (filters.category || ''),
        active: key === 'active' ? undefined : filters.active,
        stockStatus: key === 'stockStatus' ? undefined : filters.stockStatus
      };
      onApply(updated);
    }
  };

  // Derive active filter chips for clear visual feedback
  const activeChips = [];
  if (filters.search && filters.search.trim()) {
    activeChips.push({
      key: 'search',
      label: `Search: "${filters.search.trim()}"`,
      name: 'search'
    });
  }
  if (filters.category && filters.category.trim()) {
    activeChips.push({
      key: 'category',
      label: `Category: "${filters.category.trim()}"`,
      name: 'category'
    });
  }
  if (filters.active !== undefined && filters.active !== null && filters.active !== '') {
    const isActive = filters.active === true || filters.active === 'true';
    activeChips.push({
      key: 'active',
      label: `Status: ${isActive ? 'Active' : 'Inactive'}`,
      name: 'active status'
    });
  }
  if (filters.stockStatus && filters.stockStatus !== 'ALL') {
    const stockLabels = {
      IN_STOCK: 'In Stock',
      LOW_STOCK: 'Low Stock',
      OUT_OF_STOCK: 'Out of Stock'
    };
    activeChips.push({
      key: 'stockStatus',
      label: `Stock: ${stockLabels[filters.stockStatus] || filters.stockStatus}`,
      name: 'stock level'
    });
  }

  return (
    <div className="filter-card catalog-filter-card">
      <form onSubmit={handleSubmit} className="filter-form" role="search" aria-label="Filter inventory items">
        <div className="form-group filter-group-search">
          <label htmlFor="filter-search">Search</label>
          <div className="filter-input-wrap">
            <Search size={15} className="filter-input-icon" aria-hidden="true" />
            <input
              id="filter-search"
              name="search"
              type="text"
              className="form-input filter-search-input"
              placeholder="Search by code, name, category..."
              value={draft.search}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="filter-category">Category</label>
          <input
            id="filter-category"
            name="category"
            type="text"
            className="form-input"
            placeholder="Filter by category..."
            value={draft.category}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor="filter-active">Active Status</label>
          <select
            id="filter-active"
            name="active"
            className="form-input form-select"
            value={draft.active}
            onChange={handleChange}
            disabled={disabled}
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="filter-stockStatus">Stock Level</label>
          <select
            id="filter-stockStatus"
            name="stockStatus"
            className="form-input form-select"
            value={draft.stockStatus}
            onChange={handleChange}
            disabled={disabled}
          >
            <option value="">All Stock Levels</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>

        <div className="filter-actions">
          <button type="submit" className="btn btn-primary filter-btn" disabled={disabled}>
            <Search size={15} aria-hidden="true" />
            <span>Search</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary filter-btn"
            onClick={handleReset}
            disabled={disabled}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </form>

      {activeChips.length > 0 && (
        <div className="active-filters-bar" data-testid="active-filters-bar" aria-label="Active filters">
          <div className="active-filters-label">
            <SlidersHorizontal size={13} aria-hidden="true" />
            <span>Active Filters:</span>
          </div>
          <div className="active-filters-list">
            {activeChips.map((chip) => (
              <span key={chip.key} className="filter-chip" data-testid={`filter-chip-${chip.key}`}>
                <span className="filter-chip-text">{chip.label}</span>
                <button
                  type="button"
                  className="filter-chip-remove"
                  onClick={() => handleRemoveChip(chip.key)}
                  aria-label={`Remove ${chip.name} filter`}
                  disabled={disabled}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </span>
            ))}
            <button
              type="button"
              className="active-filters-clear-btn"
              onClick={handleReset}
              disabled={disabled}
              aria-label="Clear all filters"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
