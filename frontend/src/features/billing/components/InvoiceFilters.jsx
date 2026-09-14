import React, { useState, useEffect } from 'react';
import { InvoiceStatus } from '../types';

/**
 * Filter form for the Staff Invoice List (UI-BIL-01).
 * Exposes controls for: patientId, status, startDate, endDate.
 * Performs client-side validation to prevent startDate > endDate submissions.
 */
export default function InvoiceFilters({
  filters = {},
  onApply,
  onReset,
  disabled = false
}) {
  const [draft, setDraft] = useState({
    patientId: filters.patientId !== undefined && filters.patientId !== null ? String(filters.patientId) : '',
    status: filters.status || '',
    startDate: filters.startDate || '',
    endDate: filters.endDate || ''
  });

  const [dateError, setDateError] = useState('');

  useEffect(() => {
    setDraft({
      patientId: filters.patientId !== undefined && filters.patientId !== null ? String(filters.patientId) : '',
      status: filters.status || '',
      startDate: filters.startDate || '',
      endDate: filters.endDate || ''
    });
    setDateError('');
  }, [filters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
    if (name === 'startDate' || name === 'endDate') {
      setDateError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedPatient = draft.patientId.trim();
    const trimmedStatus = draft.status.trim();
    const trimmedStart = draft.startDate.trim();
    const trimmedEnd = draft.endDate.trim();

    // Client-side date range validation
    if (trimmedStart && trimmedEnd && trimmedStart > trimmedEnd) {
      setDateError('Start date cannot be after end date');
      return;
    }

    setDateError('');

    const appliedFilters = {};
    if (trimmedPatient) {
      appliedFilters.patientId = Number(trimmedPatient);
    }
    if (trimmedStatus) {
      appliedFilters.status = trimmedStatus;
    }
    if (trimmedStart) {
      appliedFilters.startDate = trimmedStart;
    }
    if (trimmedEnd) {
      appliedFilters.endDate = trimmedEnd;
    }

    onApply(appliedFilters);
  };

  const handleReset = () => {
    setDraft({
      patientId: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    setDateError('');
    onReset();
  };

  return (
    <div className="filter-card">
      <form onSubmit={handleSubmit} className="filter-form" role="search" aria-label="Filter invoices">
        <div className="form-group">
          <label htmlFor="filter-patient-id">Patient ID</label>
          <input
            id="filter-patient-id"
            name="patientId"
            type="number"
            min="1"
            className="form-input"
            placeholder="Filter by patient ID..."
            value={draft.patientId}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            name="status"
            className="form-input"
            value={draft.status}
            onChange={handleChange}
            disabled={disabled}
          >
            <option value="">All</option>
            <option value={InvoiceStatus.DRAFT}>Draft</option>
            <option value={InvoiceStatus.UNPAID}>Unpaid</option>
            <option value={InvoiceStatus.PARTIALLY_PAID}>Partially Paid</option>
            <option value={InvoiceStatus.PAID}>Paid</option>
            <option value={InvoiceStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="filter-start-date">Start Date</label>
          <input
            id="filter-start-date"
            name="startDate"
            type="date"
            className="form-input"
            value={draft.startDate}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label htmlFor="filter-end-date">End Date</label>
          <input
            id="filter-end-date"
            name="endDate"
            type="date"
            className="form-input"
            value={draft.endDate}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>

        <div className="filter-actions">
          <button type="submit" className="btn btn-primary" disabled={disabled}>
            Apply Filters
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={disabled}>
            Reset
          </button>
        </div>
      </form>

      {dateError && (
        <div className="field-error" role="alert" data-testid="filter-date-error" style={{ marginTop: '0.75rem' }}>
          {dateError}
        </div>
      )}
    </div>
  );
}
