import React, { useState, useEffect } from 'react';

/**
 * Filter bar for searching and filtering inventory catalog items.
 */
export default function InventoryFilters({
  filters = {},
  onApply,
  onReset,
  disabled = false
}) {
  const [draft, setDraft] = useState({
    search: filters.search || '',
    category: filters.category || '',
    active: filters.active !== undefined ? String(filters.active) : '',
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

  return (
    <div className="filter-card">
      <form onSubmit={handleSubmit} className="filter-form" role="search" aria-label="Filter inventory items">
        <div className="form-group">
          <label htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            name="search"
            type="text"
            className="form-input"
            placeholder="Search by code, name, category..."
            value={draft.search}
            onChange={handleChange}
            disabled={disabled}
          />
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
            className="form-input"
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
            className="form-input"
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
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            Search
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={disabled}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
