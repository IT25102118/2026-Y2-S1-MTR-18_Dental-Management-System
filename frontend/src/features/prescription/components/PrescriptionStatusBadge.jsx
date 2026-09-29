import React from 'react';

/**
 * Accessible prescription lifecycle status badge.
 * Values: 'DRAFT' | 'FINALIZED' | 'CANCELLED'
 */
export function PrescriptionStatusBadge({ status = 'DRAFT' }) {
  const normalizedStatus = (status || 'DRAFT').toUpperCase();

  switch (normalizedStatus) {
    case 'FINALIZED':
      return (
        <span className="badge badge-finalized" role="status" aria-label="Prescription status: Finalized">
          Finalized
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="badge badge-cancelled" role="status" aria-label="Prescription status: Cancelled">
          Cancelled
        </span>
      );
    case 'DRAFT':
    default:
      return (
        <span className="badge badge-draft" role="status" aria-label="Prescription status: Draft">
          Draft
        </span>
      );
  }
}

export default PrescriptionStatusBadge;
