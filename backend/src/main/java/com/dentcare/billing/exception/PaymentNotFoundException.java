package com.dentcare.billing.exception;

/**
 * Exception thrown when a payment cannot be found by its database identifier or business payment number.
 */
public class PaymentNotFoundException extends RuntimeException {

    private final Long paymentId;

    public PaymentNotFoundException(Long paymentId) {
        super("Payment not found with id: " + paymentId);
        this.paymentId = paymentId;
    }

    public Long getPaymentId() {
        return paymentId;
    }
}
