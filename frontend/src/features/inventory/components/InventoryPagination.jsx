import React from 'react';

/**
 * Feature-local pagination controls.
 * Accepts either unpacked pagination props ({ page, totalPages, totalElements })
 * or a Spring Page metadata object ({ pageInfo: { number, totalPages, totalElements, first, last } }).
 * Displays 1-based page numbers to the user while using 0-based page numbers for backend queries.
 */
export default function InventoryPagination({
  page: propPage,
  totalPages: propTotalPages,
  totalElements: propTotalElements,
  pageInfo,
  onPageChange,
  disabled = false
}) {
  // Resolve values from pageInfo if provided, otherwise fallback to direct props
  const page = pageInfo?.number !== undefined
    ? pageInfo.number
    : (pageInfo?.page !== undefined ? pageInfo.page : (propPage ?? 0));

  const totalPages = pageInfo?.totalPages !== undefined
    ? pageInfo.totalPages
    : (propTotalPages ?? 0);

  const totalElements = pageInfo?.totalElements !== undefined
    ? pageInfo.totalElements
    : (propTotalElements ?? 0);

  if (totalElements === 0) {
    return null;
  }

  const currentPageDisplay = totalPages > 0 ? Math.min(page + 1, totalPages) : 1;
  const isFirst = pageInfo?.first !== undefined ? pageInfo.first : page <= 0;
  const isLast = pageInfo?.last !== undefined ? pageInfo.last : (totalPages === 0 || page >= totalPages - 1);

  const handlePrev = () => {
    if (!disabled && !isFirst && onPageChange) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (!disabled && !isLast && onPageChange) {
      onPageChange(page + 1);
    }
  };

  return (
    <nav className="pagination-controls" aria-label="Inventory items pagination">
      <div className="pagination-info">
        Page <strong>{currentPageDisplay}</strong> of <strong>{Math.max(totalPages, 1)}</strong> ({totalElements} total items)
      </div>
      <div className="pagination-buttons">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handlePrev}
          disabled={disabled || isFirst}
          aria-label="Go to previous page"
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleNext}
          disabled={disabled || isLast}
          aria-label="Go to next page"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
