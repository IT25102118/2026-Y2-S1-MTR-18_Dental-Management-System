import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listExaminationsByPatient, createExamination } from '../api/examinationApi';
import { useAuth } from '../../auth/context/AuthContext';
import ClinicalNav from '../components/ClinicalNav';
import ExaminationsTable from '../components/ExaminationsTable';
import ExaminationForm from '../components/ExaminationForm';
import '../clinical.css';

/**
 * ExaminationsPage lists all clinical examinations recorded for a selected patient.
 * Allows filtering by patientId query parameter and recording new examinations.
 */
export default function ExaminationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user || null;
  } catch {
    authUser = null;
  }

  const patientIdParam = searchParams.get('patientId') || '';
  const [patientIdInput, setPatientIdInput] = useState(patientIdParam);
  const [examinations, setExaminations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchExaminations = useCallback(async (pid) => {
    if (!pid) {
      setExaminations([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listExaminationsByPatient(pid);
      setExaminations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load examinations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPatientIdInput(patientIdParam);
    if (patientIdParam) {
      fetchExaminations(patientIdParam);
    } else {
      setExaminations([]);
    }
  }, [patientIdParam, fetchExaminations]);

  const handleSearchPatient = (e) => {
    e.preventDefault();
    const trimmed = patientIdInput.trim();
    if (trimmed) {
      setSearchParams({ patientId: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const handleSelectExamination = (id) => {
    navigate(`/clinical/examinations/${id}`);
  };

  const handleCreateSubmit = async (values) => {
    setCreateSubmitting(true);
    setCreateError('');
    try {
      await createExamination(values);
      setSuccessMessage('Examination created successfully.');
      setShowCreateForm(false);
      if (patientIdParam) {
        await fetchExaminations(patientIdParam);
      } else if (values.patientId) {
        setSearchParams({ patientId: String(values.patientId) });
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to create examination.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const isDentist = authUser?.role === 'DENTIST';

  return (
    <div className="clinical-container" data-testid="examinations-page-placeholder">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="clinical-header">
        <h1>Clinical Examinations</h1>
        {isDentist && patientIdParam && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setSuccessMessage(null);
            }}
          >
            {showCreateForm ? 'Cancel New Examination' : 'Create Examination'}
          </button>
        )}
      </div>

      <ClinicalNav />

      <div className="clinical-filter-card">
        <form onSubmit={handleSearchPatient} className="patient-search-form">
          <div className="form-group-inline">
            <label htmlFor="patientIdSearch">Patient ID:</label>
            <input
              id="patientIdSearch"
              type="number"
              min="1"
              step="1"
              className="form-input"
              placeholder="Enter Patient ID..."
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              Load
            </button>
          </div>
        </form>
      </div>

      {successMessage && (
        <div className="success-alert" role="status">
          <p>{successMessage}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="clinical-section">
          <h2>Record New Clinical Examination</h2>
          <ExaminationForm
            initialValues={{
              patientId: patientIdParam ? Number(patientIdParam) : '',
              dentistId: authUser?.role === 'DENTIST' ? authUser.id : '',
              recordedByUserId: authUser?.id || ''
            }}
            onSubmit={handleCreateSubmit}
            submitting={createSubmitting}
            serverError={createError}
            submitLabel="Create Examination"
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {error && (
        <div className="error-alert" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!patientIdParam ? (
        <div className="empty-state">
          <p>Please enter a Patient ID above and click Load to view clinical examinations.</p>
        </div>
      ) : loading ? (
        <div className="loading-state" role="status">
          Loading examinations...
        </div>
      ) : (
        <div className="clinical-section">
          <div className="section-header">
            <h2>Examinations for Patient #{patientIdParam}</h2>
          </div>
          <ExaminationsTable
            examinations={examinations}
            onSelect={handleSelectExamination}
          />
        </div>
      )}
    </div>
  );
}
