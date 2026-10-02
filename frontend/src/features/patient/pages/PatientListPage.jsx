import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPatients, deactivatePatient, reactivatePatient } from '../api/patientApi';
import PatientStatusBadge from '../components/PatientStatusBadge';
import '../patient.css';

export default function PatientListPage() {
  const [patients, setPatients] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  });
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Deactivation confirmation modal state
  const [deactivatingPatient, setDeactivatingPatient] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPatients = useCallback(async (searchTerm = search, statusFilter = activeFilter, pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const activeParam = statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : undefined;
      const data = await getPatients({
        search: searchTerm,
        active: activeParam,
        page: pageNum,
        size: 20
      });
      setPatients(data.content);
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
      setError(err.message || 'Failed to load patient records.');
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    fetchPatients(search, activeFilter, 0);
  }, [fetchPatients, search, activeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(search, activeFilter, 0);
  };

  const handleDeactivateClick = (patient) => {
    setDeactivatingPatient(patient);
    setDeactivationReason('');
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingPatient) return;
    setActionLoading(true);
    setError(null);
    try {
      await deactivatePatient(deactivatingPatient.id, deactivationReason);
      setActionSuccess(`Patient ${deactivatingPatient.firstName} ${deactivatingPatient.lastName} (${deactivatingPatient.patientCode}) deactivated successfully.`);
      setDeactivatingPatient(null);
      await fetchPatients(search, activeFilter, pageInfo.number);
    } catch (err) {
      setError(err.message || 'Failed to deactivate patient.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateClick = async (patient) => {
    setActionLoading(true);
    setError(null);
    try {
      await reactivatePatient(patient.id);
      setActionSuccess(`Patient ${patient.firstName} ${patient.lastName} (${patient.patientCode}) reactivated successfully.`);
      await fetchPatients(search, activeFilter, pageInfo.number);
    } catch (err) {
      setError(err.message || 'Failed to reactivate patient.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="patient-container">
      <nav className="patient-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="patient-header">
        <h1>Patient Records</h1>
        <Link to="/patients/new" className="btn btn-primary" data-testid="add-patient-button">
          Add Patient
        </Link>
      </div>

      <form className="patient-search-bar" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, patient code, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="patient-search-input"
          aria-label="Search patients"
        />
        <select
          className="filter-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          aria-label="Filter by status"
          data-testid="patient-status-filter"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
        <button type="submit" className="btn btn-secondary">
          Search
        </button>
      </form>

      {actionSuccess && (
        <div className="success-alert" role="status">
          {actionSuccess}
        </div>
      )}

      {error && (
        <div className="error-alert" role="alert">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading patient records...
        </div>
      ) : patients.length === 0 ? (
        <div className="empty-state">
          <p>No patient records found.</p>
          {search || activeFilter ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setActiveFilter('');
              }}
            >
              Clear Filters
            </button>
          ) : (
            <Link to="/patients/new" className="btn btn-primary">
              Register First Patient
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="patient-table" aria-label="Patient records list">
              <thead>
                <tr>
                  <th scope="col">Patient Code</th>
                  <th scope="col">Name</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col">City</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} data-testid={`patient-row-${patient.id}`}>
                    <td>
                      <Link to={`/patients/${patient.id}`} style={{ fontWeight: 600 }}>
                        {patient.patientCode}
                      </Link>
                    </td>
                    <td>{`${patient.firstName} ${patient.lastName}`}</td>
                    <td>{patient.phone || '-'}</td>
                    <td>{patient.email || '-'}</td>
                    <td>{patient.city || '-'}</td>
                    <td>
                      <PatientStatusBadge active={patient.active} />
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="btn btn-secondary btn-sm"
                          aria-label={`View ${patient.firstName} ${patient.lastName}`}
                          data-testid={`view-patient-${patient.id}`}
                        >
                          View
                        </Link>
                        <Link
                          to={`/patients/${patient.id}/edit`}
                          className="btn btn-secondary btn-sm"
                          aria-label={`Edit ${patient.firstName} ${patient.lastName}`}
                          data-testid={`edit-patient-${patient.id}`}
                        >
                          Edit
                        </Link>
                        {patient.active ? (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeactivateClick(patient)}
                            disabled={actionLoading}
                            data-testid={`deactivate-patient-${patient.id}`}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleReactivateClick(patient)}
                            disabled={actionLoading}
                            data-testid={`reactivate-patient-${patient.id}`}
                          >
                            Reactivate
                          </button>
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
              <div>
                Showing page {pageInfo.number + 1} of {pageInfo.totalPages} ({pageInfo.totalElements} patients)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={pageInfo.first || loading}
                  onClick={() => fetchPatients(search, activeFilter, pageInfo.number - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={pageInfo.last || loading}
                  onClick={() => fetchPatients(search, activeFilter, pageInfo.number + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Deactivation Confirmation Modal */}
      {deactivatingPatient && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="deactivate-dialog-title">
          <div className="modal-content">
            <h3 id="deactivate-dialog-title">Confirm Deactivation</h3>
            <p>
              Are you sure you want to deactivate patient <strong>{deactivatingPatient.firstName} {deactivatingPatient.lastName}</strong> ({deactivatingPatient.patientCode})?
            </p>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="modal-deactivation-reason">Reason for deactivation (optional):</label>
              <input
                id="modal-deactivation-reason"
                type="text"
                className="form-input"
                maxLength={255}
                placeholder="e.g., Relocated, Transferred, Requested by patient"
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                disabled={actionLoading}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeactivatingPatient(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeactivate}
                disabled={actionLoading}
                data-testid="confirm-deactivate-button"
              >
                {actionLoading ? 'Deactivating...' : 'Deactivate Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
