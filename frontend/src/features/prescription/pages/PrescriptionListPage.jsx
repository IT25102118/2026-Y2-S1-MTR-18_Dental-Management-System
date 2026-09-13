import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPrescriptions } from '../api/prescriptionApi';
import PrescriptionStatusBadge from '../components/PrescriptionStatusBadge';
import PrescriptionNav from '../components/PrescriptionNav';
import '../prescription.css';

/**
 * Main Prescription List Page listing all prescriptions with pagination and status badges.
 */
export default function PrescriptionListPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrescriptions = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrescriptions({
        page: pageNum,
        size: 20,
        sort: 'createdAt,desc'
      });
      setPrescriptions(data.content);
      setPageInfo({
        number: data.number,
        size: data.size,
        totalPages: data.totalPages,
        totalElements: data.totalElements,
        first: data.first,
        last: data.last,
        empty: data.empty
      });
    } catch (err) {
      setError(err.message || 'Failed to load prescriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions(0);
  }, [fetchPrescriptions]);

  const handlePageChange = (newPage) => {
    fetchPrescriptions(newPage);
  };

  const handleRetry = () => {
    fetchPrescriptions(pageInfo.number);
  };

  return (
    <div className="prescription-container">
      <PrescriptionNav />

      <div className="prescription-header">
        <div>
          <h1>Prescription Management</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Manage dental prescriptions, draft treatments, and clinical medication orders
          </p>
        </div>
        <Link to="/prescriptions/new" className="btn btn-primary" id="btn-create-prescription">
          + Create Prescription
        </Link>
      </div>

      {error && (
        <div className="error-alert" role="alert">
          <p style={{ margin: 0 }}>{error}</p>
          <div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
              Retry
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading prescriptions...
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '1.1rem', fontWeight: 500, color: '#334155' }}>
            No prescriptions recorded yet
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Get started by creating a new dental prescription for a patient.
          </p>
          <Link to="/prescriptions/new" className="btn btn-primary">
            + Create First Prescription
          </Link>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="prescription-table" aria-label="Prescriptions table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Prescribing Dentist</th>
                  <th scope="col">Status</th>
                  <th scope="col">Medicines</th>
                  <th scope="col">Created Date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td>
                      <Link to={`/prescriptions/${rx.id}`} style={{ fontWeight: 600, color: '#2563eb' }}>
                        #{rx.id}
                      </Link>
                    </td>
                    <td>
                      <div>
                        <strong>{rx.patientName || `Patient #${rx.patientId}`}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {rx.patientId}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{rx.dentistName || `Dentist #${rx.dentistId}`}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {rx.dentistId}</div>
                      </div>
                    </td>
                    <td>
                      <PrescriptionStatusBadge status={rx.status} />
                    </td>
                    <td>{rx.itemCount} item{rx.itemCount !== 1 ? 's' : ''}</td>
                    <td>
                      {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : '—'}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/prescriptions/${rx.id}`}
                          className="btn btn-secondary btn-sm"
                          aria-label={`View prescription #${rx.id}`}
                        >
                          View
                        </Link>
                        {rx.status === 'DRAFT' && (
                          <Link
                            to={`/prescriptions/${rx.id}/edit`}
                            className="btn btn-secondary btn-sm"
                            aria-label={`Edit draft #${rx.id}`}
                          >
                            Edit
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageInfo.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Page {pageInfo.number + 1} of {pageInfo.totalPages} ({pageInfo.totalElements} total)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(pageInfo.number - 1)}
                  disabled={pageInfo.first || loading}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(pageInfo.number + 1)}
                  disabled={pageInfo.last || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
