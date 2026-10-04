import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, BillingApiError } from '../api/billingApi';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceFilters from '../components/InvoiceFilters';
import '../billing.css';

/**
 * Format numeric monetary amount with fixed 2 decimal places without inventing currency symbols.
 */
function formatAmount(value) {
  if (value === null || value === undefined) return '0.00';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(2);
}

/**
 * MF-05 UI-BIL-01 Staff Invoice List Page.
 * Displays searchable, filterable invoices for Receptionist and Administrator roles.
 */
export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = useCallback(async (currentFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoices(currentFilters);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof BillingApiError) {
        if (err.status === 401) {
          setError('Authentication required. Please sign in to view invoices.');
        } else if (err.status === 403) {
          setError('Access denied. You do not have permission to view billing invoices.');
        } else if (err.status === 400) {
          setError(err.message || 'Invalid search criteria. Please check your filter values.');
        } else {
          setError(err.message || 'Failed to load invoices. Please try again.');
        }
      } else {
        setError(err?.message || 'Failed to load invoices. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(filters);
  }, [fetchInvoices, filters]);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleRetry = () => {
    fetchInvoices(filters);
  };

  const hasActiveFilters = Boolean(
    filters.patientId !== undefined ||
    filters.status ||
    filters.startDate ||
    filters.endDate
  );

  return (
    <div className="billing-container">
      <nav className="billing-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="billing-header">
        <h1>Invoices</h1>
        <Link to="/billing/invoices/new" className="btn btn-primary">
          + Create Invoice
        </Link>
      </div>

      <InvoiceFilters
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {hasActiveFilters && (
        <div
          className="active-filters-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            padding: '0.65rem 1rem',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #bae6fd',
            fontSize: '0.875rem',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#0369a1' }}>Filtered By:</span>
            {filters.patientId !== undefined && (
              <span className="badge-status-draft" style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                Patient ID: {filters.patientId}
              </span>
            )}
            {filters.status && (
              <span className="badge-status-draft" style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                Status: {filters.status}
              </span>
            )}
            {filters.startDate && (
              <span className="badge-status-draft" style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                From: {filters.startDate}
              </span>
            )}
            {filters.endDate && (
              <span className="badge-status-draft" style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                To: {filters.endDate}
              </span>
            )}
            <span style={{ color: '#64748b', marginLeft: '0.25rem' }}>
              ({invoices.length} {invoices.length === 1 ? 'record' : 'records'} found)
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="error-alert" role="alert" data-testid="invoice-list-error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="empty-state" data-testid="empty-state">
          {hasActiveFilters ? (
            <>
              <p>No invoices match your filter criteria.</p>
              <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                Clear Filters
              </button>
            </>
          ) : (
            <p>No invoices found.</p>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="billing-table" aria-label="Invoices list table">
            <thead>
              <tr>
                <th scope="col">Invoice Number</th>
                <th scope="col">Patient</th>
                <th scope="col">Invoice Date</th>
                <th scope="col" className="amount-header">Total</th>
                <th scope="col" className="amount-header">Paid</th>
                <th scope="col" className="amount-header">Balance</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td>{inv.patientId}</td>
                  <td>{inv.invoiceDate}</td>
                  <td className="amount-cell">{formatAmount(inv.totalAmount)}</td>
                  <td className="amount-cell">{formatAmount(inv.paidAmount)}</td>
                  <td className="amount-cell">{formatAmount(inv.balanceAmount)}</td>
                  <td>
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        to={`/billing/invoices/${inv.id}`}
                        className="btn btn-secondary btn-sm"
                        aria-label={`View invoice ${inv.invoiceNumber}`}
                      >
                        View
                      </Link>
                      {inv.status === 'DRAFT' && (
                        <Link
                          to={`/billing/invoices/${inv.id}/edit`}
                          className="btn btn-secondary btn-sm"
                          aria-label={`Edit draft ${inv.invoiceNumber}`}
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
      )}
    </div>
  );
}
