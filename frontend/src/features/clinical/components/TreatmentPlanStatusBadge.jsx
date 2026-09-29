import React from 'react';

/**
 * Accessible status badge for Treatment Plan lifecycles.
 * Handles PROPOSED, APPROVED, IN_PROGRESS, COMPLETED, and CANCELLED statuses.
 * Explicit text is always rendered for accessibility.
 */
export function TreatmentPlanStatusBadge({ status = 'PROPOSED' }) {
  const normalized = status ? String(status).toUpperCase() : 'PROPOSED';

  let badgeClass = 'badge-proposed';
  let label = 'Proposed';

  switch (normalized) {
    case 'PROPOSED':
      badgeClass = 'badge-proposed';
      label = 'Proposed';
      break;
    case 'APPROVED':
      badgeClass = 'badge-approved';
      label = 'Approved';
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

export default TreatmentPlanStatusBadge;
