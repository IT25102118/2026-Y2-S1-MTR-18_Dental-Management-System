import React, { useState, useEffect } from 'react';
import { reversePayment, BillingApiError } from '../api/billingApi';
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
 * MF-05 Staff Controlled Payment Reversal Modal Dialog.
 * Allows staff (ADMINISTRATOR, RECEPTIONIST) to reverse an eligible RECORDED payment
 * with a mandatory audit justification reason.
 */
export default function ReversePaymentDialog({ payment, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [clientError, setClientError] = useState('');
  const [serverError, setServerError] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = reason.trim();
    if (!trimmed) {
      setClientError('Reversal reason is required and cannot be blank');
      return;
    }

    if (trimmed.length > 255) {
      setClientError('Reversal reason must not exceed 255 characters');
      return;
    }

    setSubmitting(true);
    setClientError('');
    setServerError('');

    try {
      await reversePayment(payment.id, { reason: trimmed });
      onSuccess();
    } catch (err) {
      if (err instanceof BillingApiError) {
        setServerError(err.message || 'Failed to reverse payment.');
      } else {
        setServerError(err?.message || 'Failed to reverse payment. Please check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reverse-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 id="reverse-dialog-title">Reverse Payment</h2>
            <p className="modal-subtitle">
              Payment #{payment?.paymentNumber} | Amount: {formatAmount(payment?.amount)} ({payment?.paymentMethod})
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

        {serverError && (
          <div className="error-alert" role="alert" data-testid="reverse-dialog-error">
            <p>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="reversal-reason">
              Reversal Reason <span className="required-star">*</span>
            </label>
            <textarea
              id="reversal-reason"
              name="reason"
              rows={3}
              maxLength={255}
              className="form-input"
              placeholder="Provide mandatory audit reason explaining this payment reversal..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (clientError) setClientError('');
              }}
              disabled={submitting}
              aria-invalid={Boolean(clientError)}
            />
            <span className="form-help">
              Mandatory financial audit trail justification (max 255 characters).
            </span>
            {clientError && (
              <div className="field-error" role="alert">
                {clientError}
              </div>
            )}
          </div>

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
              className="btn btn-danger"
              disabled={submitting}
            >
              {submitting ? 'Reversing Payment...' : 'Confirm Reversal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
