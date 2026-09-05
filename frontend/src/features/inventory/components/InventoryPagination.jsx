import React from 'react';

/**
 * Feature-local pagination controls.
 * Displays 1-based page numbers to the user while using 0-based page numbers for backend queries.
 */
export default function InventoryPagination({
  page = 0,
  totalPages = 0,
  totalElements = 0,
  onPageChange,
  disabled = false
}) {
  if (totalElements === 0) {
    return null;
  }

  const currentPageDisplay = totalPages > 0 ? page + 1 : 1;
  const isFirst = page <= 0;
  const isLast = totalPages === 0 || page >= totalPages - 1;

  return (
    <nav className="pagination-controls" aria-label="Inventory items pagination">
      <div className="pagination-info">
        Page <strong>{currentPageDisplay}</strong> of <strong>{Math.max(totalPages, 1)}</strong> ({totalElements} total items)
      </div>
      <div className="pagination-buttons">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || isFirst}
          aria-label="Go to previous page"
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || isLast}
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
