import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listTreatmentPlansByPatient, createTreatmentPlan } from '../api/treatmentPlanApi';
import { useAuth } from '../../auth/context/AuthContext';
import ClinicalNav from '../components/ClinicalNav';
import TreatmentPlansTable from '../components/TreatmentPlansTable';
import TreatmentPlanForm from '../components/TreatmentPlanForm';
import '../clinical.css';

/**
 * TreatmentPlansPage lists all treatment plans proposed or executed for a selected patient.
 * Allows filtering by patientId query parameter and proposing new treatment plans.
 */
export default function TreatmentPlansPage() {
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
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchPlans = useCallback(async (pid) => {
    if (!pid) {
      setPlans([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listTreatmentPlansByPatient(pid);
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load treatment plans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPatientIdInput(patientIdParam);
    if (patientIdParam) {
      fetchPlans(patientIdParam);
    } else {
      setPlans([]);
    }
  }, [patientIdParam, fetchPlans]);

  const handleSearchPatient = (e) => {
    e.preventDefault();
    const trimmed = patientIdInput.trim();
    if (trimmed) {
      setSearchParams({ patientId: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const handleSelectPlan = (id) => {
    navigate(`/clinical/treatment-plans/${id}`);
  };

  const handleCreateSubmit = async (values) => {
    setCreateSubmitting(true);
    setCreateError('');
    try {
      await createTreatmentPlan(values);
      setSuccessMessage('Treatment plan proposed successfully.');
      setShowCreateForm(false);
      if (patientIdParam) {
        await fetchPlans(patientIdParam);
      } else if (values.patientId) {
        setSearchParams({ patientId: String(values.patientId) });
      }
    } catch (err) {
      setCreateError(err.message || 'Failed to propose treatment plan.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="clinical-container" data-testid="treatment-plans-page-placeholder">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="clinical-header">
        <h1>Treatment Plans</h1>
        {patientIdParam && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setSuccessMessage(null);
            }}
          >
            {showCreateForm ? 'Cancel New Plan' : 'Create Treatment Plan'}
          </button>
        )}
      </div>

      <ClinicalNav />

      <div className="clinical-filter-card">
        <form onSubmit={handleSearchPatient} className="patient-search-form">
          <div className="form-group-inline">
            <label htmlFor="planPatientIdSearch">Patient ID:</label>
            <input
              id="planPatientIdSearch"
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
          <h2>Propose New Treatment Plan</h2>
          <TreatmentPlanForm
            initialValues={{
              patientId: patientIdParam ? Number(patientIdParam) : '',
              dentistId: authUser?.role === 'DENTIST' ? authUser.id : '',
              createdByUserId: authUser?.id || ''
            }}
            onSubmit={handleCreateSubmit}
            submitting={createSubmitting}
            serverError={createError}
            submitLabel="Propose Plan"
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
          <p>Please enter a Patient ID above and click Load to view treatment plans.</p>
        </div>
      ) : loading ? (
        <div className="loading-state" role="status">
          Loading treatment plans...
        </div>
      ) : (
        <div className="clinical-section">
          <div className="section-header">
            <h2>Treatment Plans for Patient #{patientIdParam}</h2>
          </div>
          <TreatmentPlansTable
            plans={plans}
            onSelect={handleSelectPlan}
          />
        </div>
      )}
    </div>
  );
}
