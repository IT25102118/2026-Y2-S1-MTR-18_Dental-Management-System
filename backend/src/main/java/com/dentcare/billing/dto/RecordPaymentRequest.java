package com.dentcare.billing.dto;

import com.dentcare.billing.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request DTO for recording a payment against an issued invoice.
 * Server determines responsible staff user from authentication context.
 * Strictly avoids capturing payment credentials or sensitive cardholder details.
 */
public class RecordPaymentRequest {

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be strictly greater than zero")
    @Digits(integer = 8, fraction = 2, message = "Payment amount must have at most 8 integer digits and 2 decimal places")
    private BigDecimal amount;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    @Size(max = 100, message = "Payment reference must not exceed 100 characters")
    private String paymentReference;

    public RecordPaymentRequest() {
    }

    public RecordPaymentRequest(BigDecimal amount, PaymentMethod paymentMethod) {
        this(amount, paymentMethod, null);
    }

    public RecordPaymentRequest(BigDecimal amount, PaymentMethod paymentMethod, String paymentReference) {
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.paymentReference = paymentReference;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(String paymentReference) {
        this.paymentReference = paymentReference;
    }
}
