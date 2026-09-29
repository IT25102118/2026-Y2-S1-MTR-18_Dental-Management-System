import React from 'react';
import TreatmentPlanStatusBadge from './TreatmentPlanStatusBadge';

/**
 * Format currency amount safely.
 */
function formatCost(cost) {
  if (cost === undefined || cost === null || cost === '') return '—';
  const num = Number(cost);
  if (isNaN(num)) return String(cost);
  return `$${num.toFixed(2)}`;
}

/**
 * TreatmentPlansTable displays a tabular list of dental treatment plans.
 *
 * @param {Array} plans List of treatment plan DTOs
 * @param {Function} onSelect Callback invoked with plan ID when "View" is clicked
 */
export function TreatmentPlansTable({ plans = [], onSelect }) {
  const hasPlans = Array.isArray(plans) && plans.length > 0;

  return (
    <div className="table-responsive">
      <table className="clinical-table" aria-label="Treatment plans table">
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Patient ID</th>
            <th scope="col">Dentist ID</th>
            <th scope="col">Status</th>
            <th scope="col">Estimated Cost</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!hasPlans ? (
            <tr>
              <td colSpan={6} className="table-empty-cell">
                No treatment plans found.
              </td>
            </tr>
          ) : (
            plans.map((plan) => (
              <tr key={plan.id}>
                <td style={{ fontWeight: 600 }}>{plan.planName || plan.title || '—'}</td>
                <td>{plan.patientId}</td>
                <td>{plan.dentistId}</td>
                <td>
                  <TreatmentPlanStatusBadge status={plan.status} />
                </td>
                <td>{formatCost(plan.totalEstimatedCost ?? plan.estimatedCost)}</td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelect && onSelect(plan.id)}
                      aria-label={`View treatment plan ${plan.id}`}
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TreatmentPlansTable;
