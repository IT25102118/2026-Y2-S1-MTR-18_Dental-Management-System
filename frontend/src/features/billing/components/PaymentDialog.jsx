import React, { useState, useEffect } from 'react';
import { recordPayment, BillingApiError } from '../api/billingApi';
import { PaymentMethod } from '../types';
import '../billing.css';

/**
 * Format numeric amount safely to 2 decimal places.
 */
function formatAmount(val) {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0.00';
  }
  return Number(val).toFixed(2);
}

/**
 * MF-05 UI-BIL-03 Staff Payment Recording Modal Dialog.
 * Allows staff (ADMINISTRATOR, RECEPTIONIST) to record a full or partial payment
 * against an issued invoice.
 */
export default function PaymentDialog({ invoice, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const [clientErrors, setClientErrors] = useState({});
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key press if not currently submitting
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, submitting]);

  const handlePayFullBalance = () => {
    if (invoice && invoice.balanceAmount !== undefined && invoice.balanceAmount !== null) {
      setAmount(formatAmount(invoice.balanceAmount));
      if (clientErrors.amount) {
        setClientErrors((prev) => ({ ...prev, amount: undefined }));
      }
    }
  };

  const validate = () => {
    const errors = {};

    // Amount validation
    const trimmedAmount = String(amount || '').trim();
    if (!trimmedAmount) {
      errors.amount = 'Payment amount is required';
    } else {
      const numAmount = Number(trimmedAmount);
      if (isNaN(numAmount)) {
        errors.amount = 'Payment amount must be a valid number';
      } else if (numAmount <= 0) {
        errors.amount = 'Payment amount must be strictly greater than zero';
      } else if (
        invoice &&
        invoice.balanceAmount !== undefined &&
        invoice.balanceAmount !== null &&
        numAmount > Number(invoice.balanceAmount)
      ) {
        errors.amount = `Payment amount cannot exceed remaining balance of ${formatAmount(invoice.balanceAmount)}`;
      }
    }

    // Payment method validation
    if (!paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    } else if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      errors.paymentMethod = 'Invalid payment method selected';
    }

    // Payment reference validation
    if (paymentReference && paymentReference.length > 100) {
      errors.paymentReference = 'Payment reference must not exceed 100 characters';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors);
      return;
    }

    setSubmitting(true);
    setClientErrors({});
    setServerFieldErrors({});
    setSubmitError('');

    try {
      const payload = {
        amount: Number(amount),
        paymentMethod
      };

      if (paymentReference && paymentReference.trim()) {
        payload.paymentReference = paymentReference.trim();
      }

      const paymentResponse = await recordPayment(invoice.id, payload);
      onSuccess(paymentResponse);
    } catch (err) {
      if (err instanceof BillingApiError) {
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setServerFieldErrors(err.fieldErrors);
          setSubmitError(err.message || 'Please correct the highlighted payment errors.');
        } else {
          setSubmitError(err.message || 'Failed to record payment.');
        }
      } else {
        setSubmitError(err?.message || 'Failed to record payment. Please check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentBalance = invoice ? formatAmount(invoice.balanceAmount) : '0.00';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 id="payment-dialog-title">Record Payment</h2>
            <p className="modal-subtitle">
              Invoice #{invoice?.invoiceNumber} | Remaining Balance: {currentBalance}
            </p>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        {submitError && (
          <div className="error-alert" role="alert" data-testid="payment-dialog-error">
            <p>{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Amount Field */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <div className="field-helper-action">
              <label htmlFor="payment-amount">
                Payment Amount <span className="required-star">*</span>
              </label>
              <button
                type="button"
                className="btn-link"
                onClick={handlePayFullBalance}
                disabled={submitting}
                aria-label="Pay full balance amount"
              >
                Pay Full Balance ({currentBalance})
              </button>
            </div>
            <input
              id="payment-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (clientErrors.amount) {
                  setClientErrors((prev) => ({ ...prev, amount: undefined }));
                }
              }}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.amount || serverFieldErrors.amount)}
            />
            {(clientErrors.amount || serverFieldErrors.amount) && (
              <div className="field-error" role="alert">
                {clientErrors.amount || serverFieldErrors.amount}
              </div>
            )}
          </div>

          {/* Payment Method Field */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="payment-method">
              Payment Method <span className="required-star">*</span>
            </label>
            <select
              id="payment-method"
              name="paymentMethod"
              className="form-input"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (clientErrors.paymentMethod) {
                  setClientErrors((prev) => ({ ...prev, paymentMethod: undefined }));
                }
              }}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.paymentMethod || serverFieldErrors.paymentMethod)}
            >
              <option value="">Select payment method...</option>
              <option value={PaymentMethod.CASH}>Cash</option>
              <option value={PaymentMethod.CARD}>Card</option>
              <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
              <option value={PaymentMethod.OTHER}>Other</option>
            </select>
            {(clientErrors.paymentMethod || serverFieldErrors.paymentMethod) && (
              <div className="field-error" role="alert">
                {clientErrors.paymentMethod || serverFieldErrors.paymentMethod}
              </div>
            )}
          </div>

          {/* Payment Reference Field */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="payment-reference">
              Payment Reference (Optional)
            </label>
            <input
              id="payment-reference"
              name="paymentReference"
              type="text"
              maxLength={100}
              className="form-input"
              placeholder="e.g. Receipt #, Bank Txn ID, Terminal Ref..."
              value={paymentReference}
              onChange={(e) => {
                setPaymentReference(e.target.value);
                if (clientErrors.paymentReference) {
                  setClientErrors((prev) => ({ ...prev, paymentReference: undefined }));
                }
              }}
              disabled={submitting}
              aria-invalid={Boolean(clientErrors.paymentReference || serverFieldErrors.paymentReference)}
            />
            <span className="form-help">
              Recording only. Do not enter card numbers, CVV, or passwords.
            </span>
            {(clientErrors.paymentReference || serverFieldErrors.paymentReference) && (
              <div className="field-error" role="alert">
                {clientErrors.paymentReference || serverFieldErrors.paymentReference}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
