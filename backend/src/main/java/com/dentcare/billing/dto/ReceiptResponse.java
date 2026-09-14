package com.dentcare.billing.dto;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data contract representing a payment receipt (FR-BIL-07).
 * Pure data transfer structure without PDF generation or clinic-specific legal assumptions.
 */
public record ReceiptResponse(
        Long paymentId,
        String paymentNumber,
        Long invoiceId,
        String invoiceNumber,
        Long patientId,
        BigDecimal paymentAmount,
        PaymentMethod paymentMethod,
        String paymentReference,
        LocalDateTime paidAt,
        BigDecimal invoiceTotalAmount,
        BigDecimal remainingBalance,
        Long recordedBy
) {
    public static ReceiptResponse from(Payment payment) {
        if (payment == null) {
            return null;
        }
        return from(payment, payment.getInvoice());
    }

    public static ReceiptResponse from(Payment payment, Invoice invoice) {
        if (payment == null) {
            return null;
        }
        Long invoiceId = invoice != null ? invoice.getId() : (payment.getInvoice() != null ? payment.getInvoice().getId() : null);
        String invoiceNumber = invoice != null ? invoice.getInvoiceNumber() : (payment.getInvoice() != null ? payment.getInvoice().getInvoiceNumber() : null);
        Long patientId = invoice != null ? invoice.getPatientId() : (payment.getInvoice() != null ? payment.getInvoice().getPatientId() : null);
        BigDecimal invoiceTotal = invoice != null ? invoice.getTotalAmount() : (payment.getInvoice() != null ? payment.getInvoice().getTotalAmount() : null);
        BigDecimal balance = invoice != null ? invoice.getBalanceAmount() : (payment.getInvoice() != null ? payment.getInvoice().getBalanceAmount() : null);

        return new ReceiptResponse(
                payment.getId(),
                payment.getPaymentNumber(),
                invoiceId,
                invoiceNumber,
                patientId,
                payment.getAmount(),
                payment.getPaymentMethod(),
                payment.getPaymentReference(),
                payment.getPaidAt(),
                invoiceTotal,
                balance,
                payment.getRecordedBy()
        );
    }
}
