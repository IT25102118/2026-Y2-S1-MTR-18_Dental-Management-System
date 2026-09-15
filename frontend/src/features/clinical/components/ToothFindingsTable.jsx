import React from 'react';

/**
 * Helper to truncate long text strings.
 */
function truncateText(text, maxLength = 60) {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * ToothFindingsTable displays findings and oral conditions recorded during an examination.
 *
 * @param {Array} findings List of tooth finding DTOs
 * @param {Function} onEdit Callback invoked with tooth finding ID when "Edit" is clicked
 */
export function ToothFindingsTable({ findings = [], onEdit }) {
  const hasFindings = Array.isArray(findings) && findings.length > 0;

  return (
    <div className="table-responsive">
      <table className="clinical-table" aria-label="Tooth and oral findings table">
        <thead>
          <tr>
            <th scope="col">Tooth Number</th>
            <th scope="col">Condition</th>
            <th scope="col">Notes</th>
            <th scope="col">Recorded By</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!hasFindings ? (
            <tr>
              <td colSpan={5} className="table-empty-cell">
                No tooth findings recorded.
              </td>
            </tr>
          ) : (
            findings.map((finding) => (
              <tr key={finding.id}>
                <td>
                  {finding.isGeneral ? (
                    <span className="badge badge-general">General</span>
                  ) : (
                    finding.toothNumber ?? '—'
                  )}
                </td>
                <td style={{ fontWeight: 500 }}>{finding.conditionName}</td>
                <td>{truncateText(finding.notes)}</td>
                <td>{finding.recordedByUserId ?? '—'}</td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEdit && onEdit(finding.id)}
                      aria-label={`Edit finding ${finding.id}`}
                    >
                      Edit
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

export default ToothFindingsTable;
