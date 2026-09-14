import React from 'react';
import ProcedureStatusBadge from './ProcedureStatusBadge';

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
 * ProceduresTable displays the list of treatment procedures scheduled or executed
 * under a treatment plan.
 *
 * @param {Array} procedures List of treatment procedure DTOs
 * @param {Function} onEdit Callback invoked with procedure ID when "Edit" is clicked
 * @param {Function} onComplete Callback invoked with procedure ID when "Complete" is clicked
 */
export function ProceduresTable({ procedures = [], onEdit, onComplete }) {
  const hasProcedures = Array.isArray(procedures) && procedures.length > 0;

  return (
    <div className="table-responsive">
      <table className="clinical-table" aria-label="Treatment procedures table">
        <thead>
          <tr>
            <th scope="col">Sequence</th>
            <th scope="col">Procedure Name</th>
            <th scope="col">Tooth Number</th>
            <th scope="col">Quantity</th>
            <th scope="col">Estimated Cost</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!hasProcedures ? (
            <tr>
              <td colSpan={7} className="table-empty-cell">
                No procedures recorded.
              </td>
            </tr>
          ) : (
            procedures.map((proc) => {
              const canModify = proc.status === 'PLANNED' || proc.status === 'IN_PROGRESS';

              return (
                <tr key={proc.id}>
                  <td>{proc.sequenceNumber ?? '—'}</td>
                  <td style={{ fontWeight: 500 }}>
                    {proc.procedureName || proc.description}
                    {proc.procedureCode && (
                      <span className="procedure-code-badge"> ({proc.procedureCode})</span>
                    )}
                  </td>
                  <td>
                    {proc.toothNumber ? (
                      proc.toothNumber
                    ) : (
                      <span className="badge badge-general">General</span>
                    )}
                  </td>
                  <td>{proc.quantity ?? 1}</td>
                  <td>{formatCost(proc.estimatedCost)}</td>
                  <td>
                    <ProcedureStatusBadge status={proc.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      {canModify && onEdit && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEdit(proc.id)}
                          aria-label={`Edit procedure ${proc.id}`}
                        >
                          Edit
                        </button>
                      )}
                      {canModify && onComplete && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onComplete(proc.id)}
                          aria-label={`Complete procedure ${proc.id}`}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProceduresTable;
