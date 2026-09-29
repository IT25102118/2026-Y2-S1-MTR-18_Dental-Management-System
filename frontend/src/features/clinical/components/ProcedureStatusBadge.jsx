import React from 'react';

/**
 * Accessible status badge for Treatment Procedure lifecycles.
 * Handles PLANNED, IN_PROGRESS, COMPLETED, and CANCELLED statuses.
 * Explicit text is always rendered for accessibility.
 */
export function ProcedureStatusBadge({ status = 'PLANNED' }) {
  const normalized = status ? String(status).toUpperCase() : 'PLANNED';

  let badgeClass = 'badge-planned';
  let label = 'Planned';

  switch (normalized) {
    case 'PLANNED':
      badgeClass = 'badge-planned';
      label = 'Planned';
      break;
    case 'IN_PROGRESS':
      badgeClass = 'badge-in-progress';
      label = 'In Progress';
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

export default ProcedureStatusBadge;
