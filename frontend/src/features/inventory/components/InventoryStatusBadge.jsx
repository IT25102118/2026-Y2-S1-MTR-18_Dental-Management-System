import React from 'react';

/**
 * Accessible stock condition badge.
 * Does not rely on color alone; explicit text is always rendered.
 */
export function StockStatusBadge({ currentQuantity = 0, lowStock = false }) {
  if (currentQuantity === 0) {
    return (
      <span className="badge badge-out-of-stock" role="status">
        Out of Stock
      </span>
    );
  }

  if (lowStock) {
    return (
      <span className="badge badge-low-stock" role="status">
        Low Stock
      </span>
    );
  }

  return (
    <span className="badge badge-in-stock" role="status">
      In Stock
    </span>
  );
}

/**
 * Accessible item active/inactive status badge.
 */
export function ActiveStatusBadge({ active = true }) {
  if (active) {
    return (
      <span className="badge badge-active" role="status">
        Active
      </span>
    );
  }

  return (
    <span className="badge badge-inactive" role="status">
      Inactive
    </span>
  );
}
