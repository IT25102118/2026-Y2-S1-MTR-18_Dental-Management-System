import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatientInvoices } from '../../patient/api/patientPortalApi';
import '../patient-dashboard.css';
import '../patient-invoices.css';

/* Accessible SVGs */
function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function formatAmount(val) {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0.00';
  }
  return Number(val).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIALLY_PAID':
      return 'Partially paid';
    case 'UNPAID':
      return 'Unpaid';
    case 'DRAFT':
      return 'Draft';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status ? String(status).replace(/_/g, ' ') : 'Unknown';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'PAID':
      return 'status-chip-paid';
    case 'PARTIALLY_PAID':
      return 'status-chip-partially-paid';
    case 'UNPAID':
      return 'status-chip-unpaid';
    case 'DRAFT':
      return 'status-chip-draft';
    case 'CANCELLED':
      return 'status-chip-cancelled';
    default:
      return '';
  }
}

export default function PatientInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchInvoices = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await getPatientInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load invoices. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch = searchQuery.trim() === '' ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Derived aggregate metrics computed strictly from real patient data
  const metrics = useMemo(() => {
    let totalInvoices = invoices.length;
    let totalOutstanding = 0;
    let totalPaid = 0;

    invoices.forEach((inv) => {
      const bal = Number(inv.balanceAmount) || 0;
      const pd = Number(inv.paidAmount) || 0;
      if (inv.status !== 'CANCELLED') {
        totalOutstanding += bal;
        totalPaid += pd;
      }
    });

    return {
      count: totalInvoices,
      outstanding: totalOutstanding.toFixed(2),
      paid: totalPaid.toFixed(2)
    };
  }, [invoices]);

  return (
    <main className="patient-invoices-page" data-testid="patient-invoices-page">
      <div className="patient-invoices-container">

        {/* Back navigation */}
        <Link to="/patient/dashboard" className="patient-back-link">
          <ArrowLeftIcon />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <header className="patient-invoices-header">
          <div className="patient-invoices-title-group">
            <span className="patient-portal-kicker">
              <span className="patient-portal-kicker-dot" />
              Billing Records
            </span>
            <h1>My Invoices</h1>
            <p className="patient-invoices-subtitle">
              Review your treatment charges, payment history, and current account balances.
            </p>
          </div>
        </header>

        {/* Aggregate Metrics Cards derived strictly from returned records */}
        {!isLoading && !errorMessage && (
          <section className="patient-invoices-metrics" aria-label="Billing Summary">
            <div className="patient-metric-card">
              <span className="patient-metric-label">Total Invoices</span>
              <span className="patient-metric-value" data-testid="metric-invoice-count">{metrics.count}</span>
            </div>
            <div className="patient-metric-card">
              <span className="patient-metric-label">Outstanding Balance</span>
              <span className="patient-metric-value balance-due" data-testid="metric-balance-due">${metrics.outstanding}</span>
            </div>
            <div className="patient-metric-card">
              <span className="patient-metric-label">Total Paid to Date</span>
              <span className="patient-metric-value total-paid" data-testid="metric-total-paid">${metrics.paid}</span>
            </div>
          </section>
        )}

        {/* Search and Filters */}
        <section className="patient-invoices-toolbar" aria-label="Search and filter invoices">
          <div className="invoices-search-wrap">
            <span className="invoices-search-icon"><SearchIcon /></span>
            <input
              type="text"
              className="invoices-search-input"
              placeholder="Search by invoice number (e.g. INV-2026-0001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search invoices"
            />
          </div>

          <div className="invoices-filter-group">
            <label htmlFor="invoice-status-filter" className="sr-only">Filter by Status</label>
            <select
              id="invoice-status-filter"
              className="invoices-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter invoices by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </section>

        {/* Content Body: Loading, Error, Empty, or Table */}
        {isLoading && (
          <div className="patient-loading-state" role="status" data-testid="invoices-loading">
            <div className="patient-spinner" aria-hidden="true" />
            <p>Loading your invoices...</p>
          </div>
        )}

        {errorMessage && !isLoading && (
          <div className="patient-error-state" role="alert" data-testid="invoices-error">
            <span className="patient-error-icon"><AlertCircleIcon /></span>
            <h3>Unable to load invoices</h3>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="patient-btn-primary"
              onClick={fetchInvoices}
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && invoices.length === 0 && (
          <div className="patient-empty-state" data-testid="invoices-empty-state">
            <span className="patient-empty-state-icon"><ReceiptIcon /></span>
            <h3>No Invoices on File</h3>
            <p className="patient-empty-state-text">
              You do not have any invoices available in the patient portal yet.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && invoices.length > 0 && filteredInvoices.length === 0 && (
          <div className="patient-empty-state" data-testid="invoices-no-results">
            <span className="patient-empty-state-icon"><SearchIcon /></span>
            <h3>No Matching Invoices</h3>
            <p className="patient-empty-state-text">
              No invoices match your current search or filter criteria.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && filteredInvoices.length > 0 && (
          <section className="patient-invoices-table-card" aria-label="Invoice List">
            <div className="patient-table-wrap">
              <table className="patient-table">
                <thead>
                  <tr>
                    <th scope="col">Invoice #</th>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                    <th scope="col">Total</th>
                    <th scope="col">Paid</th>
                    <th scope="col">Balance</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} data-testid={`invoice-row-${inv.id}`}>
                      <td>
                        <Link to={`/patient/invoices/${inv.id}`} className="invoice-number-link">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td>{formatDate(inv.invoiceDate)}</td>
                      <td>
                        <span className={`status-chip ${getStatusClass(inv.status)}`}>
                          {getStatusLabel(inv.status)}
                        </span>
                      </td>
                      <td><strong>${formatAmount(inv.totalAmount)}</strong></td>
                      <td>${formatAmount(inv.paidAmount)}</td>
                      <td>
                        <span className={Number(inv.balanceAmount) > 0 ? 'patient-metric-value balance-due' : ''} style={{ fontSize: '14px' }}>
                          ${formatAmount(inv.balanceAmount)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/patient/invoices/${inv.id}`}
                          className="patient-btn-outline"
                          data-testid={`view-invoice-${inv.id}`}
                          aria-label={`View details for invoice ${inv.invoiceNumber}`}
                        >
                          View Details <span aria-hidden="true">→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
