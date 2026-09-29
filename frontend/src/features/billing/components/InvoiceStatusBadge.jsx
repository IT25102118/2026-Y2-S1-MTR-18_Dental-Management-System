import React from 'react';
import { InvoiceStatus } from '../types';

const STATUS_CONFIG = {
  [InvoiceStatus.DRAFT]: {
    label: 'Draft',
    className: 'badge badge-status-draft'
  },
  [InvoiceStatus.UNPAID]: {
    label: 'Unpaid',
    className: 'badge badge-status-unpaid'
  },
  [InvoiceStatus.PARTIALLY_PAID]: {
    label: 'Partially Paid',
    className: 'badge badge-status-partially-paid'
  },
  [InvoiceStatus.PAID]: {
    label: 'Paid',
    className: 'badge badge-status-paid'
  },
  [InvoiceStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'badge badge-status-cancelled'
  }
};

/**
 * Accessible lifecycle status badge for invoices (MF-05).
 * Renders explicit status text with semantic role="status" and distinct accessible styling.
 */
export default function InvoiceStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    className: 'badge'
  };

  return (
    <span className={config.className} role="status">
      {config.label}
    </span>
  );
}
