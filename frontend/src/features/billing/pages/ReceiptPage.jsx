import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPaymentReceipt, BillingApiError } from '../api/billingApi';
import '../billing.css';

/**
 * Format numeric amount safely to 2 decimal places without inventing currency codes/symbols.
 */
function formatAmount(val) {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0.00';
  }
  return Number(val).toFixed(2);
}

/**
 * Format ISO datetime string for clear readability.
 */
function formatDateTime(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString();
  } catch {
    return String(val);
  }
}

/**
 * MF-05 UI-BIL-04 Staff Receipt View & Browser Print Page.
 * Displays authoritative receipt details for a payment without mutating financial records.
 * Supports browser printing via clean print-specific styling and preserves access to historical receipts.
 */
export default function ReceiptPage() {
  const { paymentId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setNotFound(false);
    setErrorMessage(null);

    getPaymentReceipt(paymentId)
      .then((data) => {
        if (isMounted) {
          setReceipt(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err?.status === 404 || err?.statusCode === 404) {
            setNotFound(true);
          } else if (err?.status === 401 || err?.statusCode === 401) {
            setErrorMessage('Authentication required to view receipt.');
          } else if (err?.status === 403 || err?.statusCode === 403) {
            setErrorMessage('Access denied. You do not have permission to view receipts.');
          } else if (err instanceof BillingApiError) {
            setErrorMessage(err.message || 'Failed to load payment receipt.');
          } else {
            setErrorMessage(err?.message || 'Failed to load payment receipt. Please check your connection.');
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
  }, [paymentId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="billing-container">
        <div className="loading-state" role="status" data-testid="receipt-loading">
          Loading receipt...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="billing-container">
        <nav className="billing-nav no-print" aria-label="Breadcrumb">
          <Link to="/billing/invoices">← Back to Invoices</Link>
        </nav>
        <div className="empty-state" role="alert" data-testid="receipt-not-found">
          <h2>Receipt Not Found</h2>
          <p>The requested payment receipt does not exist or has been removed.</p>
          <Link to="/billing/invoices" className="btn btn-primary">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="billing-container">
        <nav className="billing-nav no-print" aria-label="Breadcrumb">
          <Link to="/billing/invoices">← Back to Invoices</Link>
        </nav>
        <div className="error-alert" role="alert" data-testid="receipt-error">
          <p>{errorMessage}</p>
          <Link to="/billing/invoices" className="btn btn-secondary btn-sm">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return null;
  }

  return (
    <div className="billing-container receipt-page" data-testid="receipt-container">
      {/* Navigation Breadcrumb (hidden when printing) */}
      <nav className="billing-nav no-print" aria-label="Breadcrumb">
        <Link to={`/billing/invoices/${receipt.invoiceId}`}>← Back to Invoice</Link>
      </nav>

      {/* Screen Header with Actions (hidden when printing) */}
      <div className="billing-header">
        <div>
          <h1>Payment Receipt</h1>
          <p className="text-muted" data-testid="receipt-header-number">
            Receipt #{receipt.paymentNumber}
          </p>
        </div>
        <div className="billing-actions no-print">
          <Link
            to={`/billing/invoices/${receipt.invoiceId}`}
            className="btn btn-secondary"
          >
            Back to Invoice
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            aria-label="Print Receipt"
          >
            Print Receipt
          </button>
        </div>
      </div>

      {/* Printable Receipt Card */}
      <div className="detail-card receipt-card" data-testid="receipt-content">
        {/* Receipt Banner */}
        <div className="receipt-banner">
          <div className="receipt-banner-content">
            <div>
              <h2 className="receipt-title">DentCare Receipt</h2>
              <span className="text-muted receipt-subtitle">
                Official Payment Acknowledgment
              </span>
            </div>
            <div className="receipt-number-block">
              <div className="detail-label">RECEIPT NUMBER</div>
              <div className="receipt-number-value">{receipt.paymentNumber}</div>
            </div>
          </div>
        </div>

        {/* Payment Details Section */}
        <section className="receipt-section" aria-label="Payment Details">
          <h3 className="receipt-section-heading">Payment Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Payment ID</span>
              <span className="detail-value" data-testid="receipt-payment-id">{receipt.paymentId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Payment Number</span>
              <span className="detail-value" data-testid="receipt-payment-number">{receipt.paymentNumber}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Payment Method</span>
              <span className="detail-value" data-testid="receipt-payment-method">{receipt.paymentMethod}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Payment Reference</span>
              <span className="detail-value" data-testid="receipt-payment-reference">{receipt.paymentReference || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Paid At</span>
              <span className="detail-value" data-testid="receipt-paid-at">{formatDateTime(receipt.paidAt)}</span>
            </div>
            {receipt.recordedBy !== undefined && receipt.recordedBy !== null && (
              <div className="detail-item">
                <span className="detail-label">Recorded By</span>
                <span className="detail-value" data-testid="receipt-recorded-by">{receipt.recordedBy}</span>
              </div>
            )}
          </div>
        </section>

        {/* Invoice Details Section */}
        <section className="receipt-section" aria-label="Invoice Details">
          <h3 className="receipt-section-heading">Invoice Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Invoice Number</span>
              <span className="detail-value" data-testid="receipt-invoice-number">{receipt.invoiceNumber}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Invoice ID</span>
              <span className="detail-value" data-testid="receipt-invoice-id">{receipt.invoiceId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Patient ID</span>
              <span className="detail-value" data-testid="receipt-patient-id">{receipt.patientId}</span>
            </div>
          </div>
        </section>

        {/* Financial Summary Section */}
        <section className="receipt-section" aria-label="Financial Summary">
          <h3 className="receipt-section-heading">Financial Summary</h3>
          <div className="financial-summary-grid">
            <div className="financial-stat-card">
              <span className="stat-label">Payment Amount</span>
              <span className="stat-value" data-testid="receipt-payment-amount">{formatAmount(receipt.paymentAmount)}</span>
            </div>
            <div className="financial-stat-card">
              <span className="stat-label">Invoice Total</span>
              <span className="stat-value" data-testid="receipt-invoice-total">{formatAmount(receipt.invoiceTotalAmount)}</span>
            </div>
            {receipt.paidAmount !== undefined && receipt.paidAmount !== null && (
              <div className="financial-stat-card">
                <span className="stat-label">Paid Amount</span>
                <span className="stat-value" data-testid="receipt-paid-amount">{formatAmount(receipt.paidAmount)}</span>
              </div>
            )}
            <div className="financial-stat-card">
              <span className="stat-label">Remaining Balance</span>
              <span className="stat-value" data-testid="receipt-remaining-balance">{formatAmount(receipt.remainingBalance)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
