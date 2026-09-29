import React from 'react';

/**
 * Accessible status badge for Clinical Examination lifecycles.
 * Handles DRAFT, COMPLETED, and CANCELLED statuses.
 * Explicit text is always rendered for accessibility.
 */
export function ExaminationStatusBadge({ status = 'DRAFT' }) {
  const normalized = status ? String(status).toUpperCase() : 'DRAFT';

  let badgeClass = 'badge-draft';
  let label = 'Draft';

  switch (normalized) {
    case 'DRAFT':
      badgeClass = 'badge-draft';
      label = 'Draft';
      break;
    case 'COMPLETED':
      badgeClass = 'badge-completed';
      label = 'Completed';
      break;
    case 'CANCELLED':
      badgeClass = 'badge-cancelled';
      label = 'Cancelled';
      break;
    default:
      badgeClass = 'badge-unknown';
      label = status ? String(status) : 'Unknown';
      break;
  }

  return (
    <span className={`badge ${badgeClass}`} role="status">
      {label}
    </span>
  );
}

export default ExaminationStatusBadge;
