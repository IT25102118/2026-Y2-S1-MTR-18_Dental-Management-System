package com.dentcare.billing.exception;

import java.math.BigDecimal;

/**
 * Exception thrown when a payment amount exceeds an invoice's outstanding balance (BR-10).
 */
public class OverpaymentException extends BillingValidationException {

    private final BigDecimal paymentAmount;
    private final BigDecimal remainingBalance;

    public OverpaymentException(BigDecimal paymentAmount, BigDecimal remainingBalance) {
        super(String.format("Payment amount %s exceeds outstanding balance %s", paymentAmount, remainingBalance));
        this.paymentAmount = paymentAmount;
        this.remainingBalance = remainingBalance;
    }

    public BigDecimal getPaymentAmount() {
        return paymentAmount;
    }

    public BigDecimal getRemainingBalance() {
        return remainingBalance;
    }
}
