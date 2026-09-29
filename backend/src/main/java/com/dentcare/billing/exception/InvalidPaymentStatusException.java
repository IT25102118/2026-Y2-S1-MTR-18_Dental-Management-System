package com.dentcare.billing.exception;

import com.dentcare.billing.entity.PaymentStatus;

/**
 * Exception thrown when an attempted payment operation is invalid for its current operational status.
 */
public class InvalidPaymentStatusException extends BillingValidationException {

    private final Long paymentId;
    private final PaymentStatus currentStatus;

    public InvalidPaymentStatusException(Long paymentId, PaymentStatus currentStatus, String message) {
        super(String.format("Payment [%s] in status [%s] cannot be modified: %s", paymentId, currentStatus, message));
        this.paymentId = paymentId;
        this.currentStatus = currentStatus;
    }

    public InvalidPaymentStatusException(String message) {
        super(message);
        this.paymentId = null;
        this.currentStatus = null;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public PaymentStatus getCurrentStatus() {
        return currentStatus;
    }
}
