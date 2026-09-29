import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Check, Ban, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';

/**
 * Accessible stock condition badge.
 * Does not rely on color alone; explicit text and iconography are always rendered.
 */
export function StockStatusBadge({ currentQuantity = 0, lowStock = false }) {
  if (currentQuantity === 0) {
    return (
      <span className="badge badge-out-of-stock" role="status">
        <XCircle size={12} className="badge-icon" aria-hidden="true" />
        <span>Out of Stock</span>
      </span>
    );
  }

  if (lowStock) {
    return (
      <span className="badge badge-low-stock" role="status">
        <AlertTriangle size={12} className="badge-icon" aria-hidden="true" />
        <span>Low Stock</span>
      </span>
    );
  }

  return (
    <span className="badge badge-in-stock" role="status">
      <CheckCircle2 size={12} className="badge-icon" aria-hidden="true" />
      <span>In Stock</span>
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
        <Check size={12} className="badge-icon" aria-hidden="true" />
        <span>Active</span>
      </span>
    );
  }

  return (
    <span className="badge badge-inactive" role="status">
      <Ban size={12} className="badge-icon" aria-hidden="true" />
      <span>Inactive</span>
    </span>
  );
}

/**
 * Reusable movement type badge with standardized iconography.
 */
export function MovementTypeBadge({ type }) {
  const normalized = String(type || '').toUpperCase();
  const labelMap = {
    RECEIVED: 'Received',
    USED: 'Used',
    DAMAGED: 'Damaged',
    ADJUSTED: 'Adjusted',
    EXPIRED: 'Expired'
  };
  const label = labelMap[normalized] || normalized;

  let Icon = Clock;
  if (normalized === 'RECEIVED') Icon = ArrowDownRight;
  else if (['USED', 'DAMAGED', 'EXPIRED'].includes(normalized)) Icon = ArrowUpRight;

  return (
    <span className={`movement-badge badge-${normalized.toLowerCase()}`} role="status">
      <Icon size={12} className="badge-icon" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

