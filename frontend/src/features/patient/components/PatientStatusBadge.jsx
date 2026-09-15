import React from 'react';

/**
 * Reusable badge component for displaying patient active status.
 */
export default function PatientStatusBadge({ active }) {
  if (active) {
    return (
      <span className="badge badge-active" data-testid="patient-status-badge">
        Active
      </span>
    );
  }

  return (
    <span className="badge badge-inactive" data-testid="patient-status-badge">
      Inactive
    </span>
  );
}
