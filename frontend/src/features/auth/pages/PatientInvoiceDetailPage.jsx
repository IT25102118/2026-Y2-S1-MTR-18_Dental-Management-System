import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPatientInvoiceById, getPatientReceipt } from '../../patient/api/patientPortalApi';
import '../patient-dashboard.css';
import '../patient-invoices.css';

/* Accessible Icons */
function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
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

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

export default function PatientInvoiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Receipt modal state
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  const fetchInvoice = async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage('');
    try {
      const data = await getPatientInvoiceById(id);
      setInvoice(data);
    } catch (err) {
      setErrorStatus(err.status || 500);
      setErrorMessage(err.message || 'Unable to load invoice details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleOpenReceipt = async (paymentId) => {
    setIsLoadingReceipt(true);
    setReceiptError('');
    try {
      const receiptData = await getPatientReceipt(paymentId);
      setActiveReceipt(receiptData);
    } catch (err) {
      setReceiptError(err.message || 'Unable to load payment receipt.');
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleCloseReceipt = () => {
    setActiveReceipt(null);
    setReceiptError('');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <main className="patient-invoices-page" data-testid="patient-invoice-detail-page">
        <div className="patient-invoices-container">
          <div className="patient-loading-state" role="status" data-testid="invoice-detail-loading">
            <div className="patient-spinner" aria-hidden="true" />
            <p>Loading invoice details...</p>
          </div>
        </div>
      </main>
    );
  }

  if (errorStatus === 404) {
    return (
      <main className="patient-invoices-page" data-testid="patient-invoice-detail-page">
        <div className="patient-invoices-container">
          <Link to="/patient/invoices" className="patient-back-link">
            <ArrowLeftIcon />
            <span>Back to My Invoices</span>
          </Link>
          <div className="patient-error-state" role="alert" data-testid="invoice-detail-not-found">
            <span className="patient-error-icon"><AlertCircleIcon /></span>
            <h3>Invoice Not Found</h3>
            <p>The invoice you are looking for does not exist or may have been removed.</p>
            <Link to="/patient/invoices" className="patient-btn-primary">
              Return to Invoices
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (errorStatus === 403) {
    return (
      <main className="patient-invoices-page" data-testid="patient-invoice-detail-page">
        <div className="patient-invoices-container">
          <Link to="/patient/invoices" className="patient-back-link">
            <ArrowLeftIcon />
            <span>Back to My Invoices</span>
          </Link>
          <div className="patient-error-state" role="alert" data-testid="invoice-detail-forbidden">
            <span className="patient-error-icon"><AlertCircleIcon /></span>
            <h3>Access Denied</h3>
            <p>You do not have permission to view this invoice.</p>
            <Link to="/patient/invoices" className="patient-btn-primary">
              Return to Invoices
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !invoice) {
    return (
      <main className="patient-invoices-page" data-testid="patient-invoice-detail-page">
        <div className="patient-invoices-container">
          <Link to="/patient/invoices" className="patient-back-link">
            <ArrowLeftIcon />
            <span>Back to My Invoices</span>
          </Link>
          <div className="patient-error-state" role="alert" data-testid="invoice-detail-error">
            <span className="patient-error-icon"><AlertCircleIcon /></span>
            <h3>Unable to load invoice</h3>
            <p>{errorMessage}</p>
            <button type="button" className="patient-btn-primary" onClick={fetchInvoice}>
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="patient-invoices-page" data-testid="patient-invoice-detail-page">
      <div className="patient-invoices-container">

        {/* Back navigation */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/patient/invoices" className="patient-back-link">
            <ArrowLeftIcon />
            <span>Back to My Invoices</span>
          </Link>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <Link to="/patient/dashboard" className="patient-back-link">
            <span>Patient Dashboard</span>
          </Link>
        </div>

        {/* Invoice Detail Card */}
        <article className="patient-invoice-detail-card" data-testid="invoice-detail-card">

          {/* Header */}
          <div className="invoice-detail-top">
            <div>
              <span className="patient-portal-kicker">
                <span className="patient-portal-kicker-dot" />
                Treatment Invoice
              </span>
              <h1 className="invoice-detail-num" data-testid="invoice-number">
                Invoice #{invoice.invoiceNumber}
              </h1>
              <p className="invoice-detail-date" data-testid="invoice-date">
                Issued on {formatDate(invoice.invoiceDate)}
              </p>
            </div>
            <span className={`status-chip ${getStatusClass(invoice.status)}`} data-testid="invoice-status">
              {getStatusLabel(invoice.status)}
            </span>
          </div>

          {/* Summary Financials Grid */}
          <section className="invoice-financials-grid" aria-label="Invoice Totals">
            <div className="invoice-financial-item">
              <span className="financial-label">Total Amount</span>
              <span className="financial-value" data-testid="invoice-total">
                ${formatAmount(invoice.totalAmount)}
              </span>
            </div>
            <div className="invoice-financial-item">
              <span className="financial-label">Amount Paid</span>
              <span className="financial-value total-paid" data-testid="invoice-paid">
                ${formatAmount(invoice.paidAmount)}
              </span>
            </div>
            <div className="invoice-financial-item">
              <span className="financial-label">Balance Due</span>
              <span className="financial-value balance-highlight" data-testid="invoice-balance">
                ${formatAmount(invoice.balanceAmount)}
              </span>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div className="invoice-financial-item">
                <span className="financial-label">Discount Applied</span>
                <span className="financial-value" style={{ color: '#0f766e' }}>
                  -${formatAmount(invoice.discountAmount)}
                </span>
              </div>
            )}
          </section>

          {/* Notes (if present) */}
          {invoice.notes && (
            <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #0f766e' }} data-testid="invoice-notes">
              <strong style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase' }}>Notes: </strong>
              <span style={{ fontSize: '14px', color: '#1e293b' }}>{invoice.notes}</span>
            </div>
          )}

          {/* Itemized Charges Section */}
          <section aria-labelledby="itemized-charges-heading">
            <h2 id="itemized-charges-heading" className="invoice-section-title">
              Itemized Treatment Charges
            </h2>
            {(!invoice.items || invoice.items.length === 0) ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>No itemized charges listed for this invoice.</p>
            ) : (
              <div className="patient-table-wrap">
                <table className="patient-table" data-testid="invoice-items-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '40px' }}>#</th>
                      <th scope="col">Treatment / Service Description</th>
                      <th scope="col" style={{ textAlign: 'center' }}>Qty</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Unit Price</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} data-testid={`invoice-item-${idx}`}>
                        <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                        <td>
                          <strong>{item.description}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>${formatAmount(item.unitPrice)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <strong>${formatAmount(item.lineTotal)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Payment History Section */}
          <section aria-labelledby="payment-history-heading">
            <h2 id="payment-history-heading" className="invoice-section-title">
              Payment History & Receipts
            </h2>
            {receiptError && (
              <div className="patient-access-notice" role="alert" style={{ marginBottom: '14px' }}>
                <span className="patient-access-notice-icon"><AlertCircleIcon /></span>
                <span>{receiptError}</span>
              </div>
            )}
            {(!invoice.payments || invoice.payments.length === 0) ? (
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#64748b', fontSize: '14px' }} data-testid="no-payments-notice">
                No payments have been recorded for this invoice yet.
              </div>
            ) : (
              <div className="patient-table-wrap">
                <table className="patient-table" data-testid="invoice-payments-table">
                  <thead>
                    <tr>
                      <th scope="col">Payment #</th>
                      <th scope="col">Date Paid</th>
                      <th scope="col">Method</th>
                      <th scope="col">Reference</th>
                      <th scope="col" style={{ textAlign: 'right' }}>Amount</th>
                      <th scope="col">Status</th>
                      <th scope="col" style={{ textAlign: 'right' }}><span className="sr-only">Receipt</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.payments.map((pmt) => (
                      <tr key={pmt.id} data-testid={`payment-row-${pmt.id}`}>
                        <td><strong>{pmt.paymentNumber}</strong></td>
                        <td>{formatDateTime(pmt.paidAt)}</td>
                        <td>{pmt.paymentMethod ? String(pmt.paymentMethod).replace(/_/g, ' ') : '—'}</td>
                        <td style={{ color: '#64748b' }}>{pmt.paymentReference || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#0f766e' }}>${formatAmount(pmt.amount)}</strong>
                        </td>
                        <td>
                          <span className={`status-chip ${pmt.status === 'RECORDED' ? 'status-chip-paid' : 'status-chip-cancelled'}`}>
                            {pmt.status === 'RECORDED' ? 'Recorded' : pmt.status || 'Recorded'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="patient-btn-outline"
                            onClick={() => handleOpenReceipt(pmt.id)}
                            data-testid={`view-receipt-btn-${pmt.id}`}
                            disabled={isLoadingReceipt}
                          >
                            View Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </article>

        {/* Receipt View Modal / Dialog */}
        {activeReceipt && (
          <div
            className="patient-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-dialog-title"
            data-testid="patient-receipt-modal"
          >
            <div className="patient-receipt-card">
              {/* Header */}
              <div className="patient-receipt-header">
                <div>
                  <h2 id="receipt-dialog-title">Payment Receipt</h2>
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>
                    Official DentCare Patient Receipt
                  </span>
                </div>
                <button
                  type="button"
                  className="receipt-close-btn no-print"
                  onClick={handleCloseReceipt}
                  aria-label="Close Receipt"
                  data-testid="close-receipt-btn"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="patient-receipt-body">
                <div className="receipt-amount-box">
                  <div>
                    <span className="receipt-label">Amount Paid</span>
                    <div className="receipt-amount-val" data-testid="receipt-amount">
                      ${formatAmount(activeReceipt.paymentAmount)}
                    </div>
                  </div>
                  <span className="status-chip status-chip-paid" data-testid="receipt-status">
                    {activeReceipt.status === 'RECORDED' ? 'Recorded' : activeReceipt.status || 'Paid'}
                  </span>
                </div>

                <div className="patient-receipt-grid">
                  <div className="receipt-field">
                    <span className="receipt-label">Receipt Number</span>
                    <span className="receipt-val" data-testid="receipt-number">
                      {activeReceipt.paymentNumber}
                    </span>
                  </div>

                  <div className="receipt-field">
                    <span className="receipt-label">Date & Time</span>
                    <span className="receipt-val" data-testid="receipt-date">
                      {formatDateTime(activeReceipt.paidAt)}
                    </span>
                  </div>

                  <div className="receipt-field">
                    <span className="receipt-label">Invoice Number</span>
                    <span className="receipt-val" data-testid="receipt-invoice-num">
                      {activeReceipt.invoiceNumber}
                    </span>
                  </div>

                  <div className="receipt-field">
                    <span className="receipt-label">Payment Method</span>
                    <span className="receipt-val" data-testid="receipt-method">
                      {activeReceipt.paymentMethod ? String(activeReceipt.paymentMethod).replace(/_/g, ' ') : '—'}
                    </span>
                  </div>

                  {activeReceipt.paymentReference && (
                    <div className="receipt-field">
                      <span className="receipt-label">Payment Reference</span>
                      <span className="receipt-val" data-testid="receipt-reference">
                        {activeReceipt.paymentReference}
                      </span>
                    </div>
                  )}

                  <div className="receipt-field">
                    <span className="receipt-label">Invoice Total</span>
                    <span className="receipt-val" data-testid="receipt-invoice-total">
                      ${formatAmount(activeReceipt.invoiceTotalAmount)}
                    </span>
                  </div>

                  <div className="receipt-field">
                    <span className="receipt-label">Remaining Balance</span>
                    <span className="receipt-val" data-testid="receipt-remaining-balance">
                      ${formatAmount(activeReceipt.remainingBalance)}
                    </span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                  Thank you for choosing DentCare Dental Center.
                </p>
              </div>

              {/* Actions */}
              <div className="patient-receipt-footer no-print">
                <button
                  type="button"
                  className="patient-btn-secondary"
                  onClick={handleCloseReceipt}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="patient-btn-primary"
                  onClick={handlePrintReceipt}
                  data-testid="print-receipt-btn"
                >
                  <PrinterIcon />
                  <span>Print Receipt</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  );
}
