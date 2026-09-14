import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getInvoice, issueInvoice, cancelInvoice, BillingApiError } from '../api/billingApi';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import PaymentDialog from '../components/PaymentDialog';
import '../billing.css';

/**
 * Format numeric amount safely to 2 decimal places without inventing currency symbols.
 * Server values are authoritative; this function only formats the representation.
 */
function formatAmount(val) {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0.00';
  }
  return Number(val).toFixed(2);
}

/**
 * Format ISO datetime string readably without external dependencies.
 */
function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * MF-05 UI-BIL-03 Staff Invoice Detail Page.
 * Read-only invoice details with operational Issue and Cancel actions for staff.
 */
export default function InvoiceDetailPage() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    getInvoice(id)
      .then((data) => {
        if (isMounted) {
          setInvoice(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof BillingApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setLoadError(err.message || 'Failed to load invoice details.');
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleIssue = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to issue this invoice? Once issued, the invoice cannot be edited.'
    );
    if (!confirmed) return;

    setActionSubmitting(true);
    setIsIssuing(true);
    setActionError(null);
    setSuccessMessage('');

    try {
      const updated = await issueInvoice(invoice.id);
      setInvoice(updated);
      setSuccessMessage('Invoice issued successfully.');
    } catch (err) {
      setActionError(err.message || 'Failed to issue invoice.');
    } finally {
      setActionSubmitting(false);
      setIsIssuing(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this invoice? This action cannot be undone.'
    );
    if (!confirmed) return;

    setActionSubmitting(true);
    setIsCancelling(true);
    setActionError(null);
    setSuccessMessage('');

    try {
      const updated = await cancelInvoice(invoice.id);
      setInvoice(updated);
      setSuccessMessage('Invoice cancelled successfully.');
    } catch (err) {
      setActionError(err.message || 'Failed to cancel invoice.');
    } finally {
      setActionSubmitting(false);
      setIsCancelling(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentDialog(false);
    setSuccessMessage('Payment recorded successfully.');
    setActionError(null);
    try {
      const refreshed = await getInvoice(invoice.id);
      setInvoice(refreshed);
    } catch (err) {
      setActionError(err.message || 'Payment recorded, but failed to refresh invoice details.');
    }
  };

  if (loading) {
    return (
      <div className="billing-container">
        <div className="loading-state" role="status" data-testid="invoice-detail-loading">
          Loading invoice details...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="billing-container">
        <nav className="billing-nav" aria-label="Breadcrumb">
          <Link to="/billing/invoices">← Back to Invoices</Link>
        </nav>
        <div className="empty-state" role="alert" data-testid="invoice-not-found">
          <h2>Invoice Not Found</h2>
          <p>The requested invoice does not exist or has been removed.</p>
          <Link to="/billing/invoices" className="btn btn-primary">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="billing-container">
        <nav className="billing-nav" aria-label="Breadcrumb">
          <Link to="/billing/invoices">← Back to Invoices</Link>
        </nav>
        <div className="error-alert" role="alert" data-testid="invoice-load-error">
          <p>{loadError}</p>
          <Link to="/billing/invoices" className="btn btn-secondary btn-sm">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  // Lifecycle visibility rules
  const canEdit = invoice.status === 'DRAFT';
  const canIssue = invoice.status === 'DRAFT';
  const canRecordPayment = invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID';
  const canCancel = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';

  const items = invoice.items || [];

  return (
    <div className="billing-container">
      <nav className="billing-nav" aria-label="Breadcrumb">
        <Link to="/billing/invoices">← Back to Invoices</Link>
      </nav>

      {/* Header with Title and Operational Actions */}
      <div className="billing-header">
        <div>
          <h1>Invoice #{invoice.invoiceNumber}</h1>
          <div style={{ marginTop: '0.5rem' }}>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="table-actions">
          {canEdit && (
            <Link
              to={`/billing/invoices/${invoice.id}/edit`}
              className="btn btn-secondary"
              aria-label={`Edit draft ${invoice.invoiceNumber}`}
            >
              Edit Draft
            </Link>
          )}
          {canIssue && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleIssue}
              disabled={actionSubmitting}
            >
              {actionSubmitting && isIssuing ? 'Issuing...' : 'Issue Invoice'}
            </button>
          )}
          {canRecordPayment && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowPaymentDialog(true)}
              disabled={actionSubmitting}
            >
              Record Payment
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleCancel}
              disabled={actionSubmitting}
            >
              {actionSubmitting && isCancelling ? 'Cancelling...' : 'Cancel Invoice'}
            </button>
          )}
        </div>
      </div>

      {/* Operation Feedback */}
      {successMessage && (
        <div className="success-alert" role="status" data-testid="invoice-action-success">
          <p>{successMessage}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSuccessMessage('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="error-alert" role="alert" data-testid="invoice-action-error">
          <p>{actionError}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Authoritative Financial Totals */}
      <div className="detail-card" aria-label="Financial Totals">
        <h2>Financial Summary</h2>
        <div className="financial-summary-grid">
          <div className="financial-stat-card">
            <span className="stat-label">Subtotal</span>
            <span className="stat-value">{formatAmount(invoice.subtotal)}</span>
          </div>
          <div className="financial-stat-card">
            <span className="stat-label">Discount</span>
            <span className="stat-value">{formatAmount(invoice.discountAmount)}</span>
          </div>
          <div className="financial-stat-card">
            <span className="stat-label">Total Amount</span>
            <span className="stat-value">{formatAmount(invoice.totalAmount)}</span>
          </div>
          <div className="financial-stat-card stat-paid">
            <span className="stat-label">Paid Amount</span>
            <span className="stat-value">{formatAmount(invoice.paidAmount)}</span>
          </div>
          <div className="financial-stat-card stat-balance">
            <span className="stat-label">Balance Due</span>
            <span className="stat-value">{formatAmount(invoice.balanceAmount)}</span>
          </div>
        </div>
      </div>

      {/* Invoice Metadata Overview */}
      <div className="detail-card" aria-label="Invoice Overview">
        <h2>Invoice Details</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">Invoice Number</span>
            <span className="detail-value">{invoice.invoiceNumber}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <InvoiceStatusBadge status={invoice.status} />
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Patient ID</span>
            <span className="detail-value">{invoice.patientId}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Invoice Date</span>
            <span className="detail-value">{invoice.invoiceDate || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Treatment Plan ID</span>
            <span className="detail-value">{invoice.treatmentPlanId ?? '—'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Issued At</span>
            <span className="detail-value">{formatDateTime(invoice.issuedAt)}</span>
          </div>
        </div>
      </div>

      {/* Invoice Line Items */}
      <div className="detail-card" aria-label="Invoice Items">
        <h2>Invoice Items</h2>
        {items.length === 0 ? (
          <p className="text-muted" data-testid="no-items-message" style={{ fontStyle: 'italic', margin: '0.5rem 0' }}>
            No invoice items
          </p>
        ) : (
          <div className="table-responsive">
            <table className="billing-table" aria-label="Invoice items table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '40%' }}>Description</th>
                  <th scope="col" style={{ width: '15%' }}>Quantity</th>
                  <th scope="col" className="amount-header" style={{ width: '15%' }}>Unit Price</th>
                  <th scope="col" className="amount-header" style={{ width: '15%' }}>Line Total</th>
                  <th scope="col" style={{ width: '15%' }}>Procedure ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id ?? index}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td className="amount-cell">{formatAmount(item.unitPrice)}</td>
                    <td className="amount-cell">{formatAmount(item.lineTotal)}</td>
                    <td>{item.treatmentProcedureId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes Section (rendered when present) */}
      {invoice.notes && (
        <div className="detail-card" aria-label="Invoice Notes">
          <h2>Notes</h2>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155' }}>
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Payment Dialog Modal */}
      {showPaymentDialog && (
        <PaymentDialog
          invoice={invoice}
          onClose={() => setShowPaymentDialog(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
