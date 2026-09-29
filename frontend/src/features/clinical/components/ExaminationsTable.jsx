import React from 'react';
import ExaminationStatusBadge from './ExaminationStatusBadge';

/**
 * Helper to truncate long text strings.
 */
function truncateText(text, maxLength = 60) {
  if (!text) return '—';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * ExaminationsTable displays a tabular list of clinical examinations.
 *
 * @param {Array} examinations List of examination DTOs
 * @param {Function} onSelect Callback invoked with examination ID when "View" is clicked
 */
export function ExaminationsTable({ examinations = [], onSelect }) {
  const hasExaminations = Array.isArray(examinations) && examinations.length > 0;

  return (
    <div className="table-responsive">
      <table className="clinical-table" aria-label="Clinical examinations table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Patient ID</th>
            <th scope="col">Dentist ID</th>
            <th scope="col">Chief Complaint</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {!hasExaminations ? (
            <tr>
              <td colSpan={6} className="table-empty-cell">
                No examinations found.
              </td>
            </tr>
          ) : (
            examinations.map((exam) => (
              <tr key={exam.id}>
                <td>{exam.examinationDate || '—'}</td>
                <td>{exam.patientId}</td>
                <td>{exam.dentistId}</td>
                <td>{truncateText(exam.chiefComplaint)}</td>
                <td>
                  <ExaminationStatusBadge status={exam.status} />
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelect && onSelect(exam.id)}
                      aria-label={`View examination ${exam.id}`}
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

export default ExaminationsTable;
