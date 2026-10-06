package com.dentcare.patient.dto;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.Payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Patient-safe payment receipt response DTO.
 * Exposes only verified transaction and invoice balance information.
 * Strictly excludes internal audit fields (recordedBy), internal reversal logs, or sensitive credentials.
 */
public record PatientReceiptResponse(
        Long paymentId,
        String paymentNumber,
        Long invoiceId,
        String invoiceNumber,
        BigDecimal paymentAmount,
        String paymentMethod,
        String paymentReference,
        LocalDateTime paidAt,
        BigDecimal invoiceTotalAmount,
        BigDecimal remainingBalance,
        String status
) {
    public static PatientReceiptResponse from(Payment payment) {
        if (payment == null) {
            return null;
        }
        Invoice invoice = payment.getInvoice();
        Long invoiceId = invoice != null ? invoice.getId() : null;
        String invoiceNumber = invoice != null ? invoice.getInvoiceNumber() : null;
        BigDecimal invoiceTotal = invoice != null ? invoice.getTotalAmount() : null;
        BigDecimal balance = invoice != null ? invoice.getBalanceAmount() : null;

        return new PatientReceiptResponse(
                payment.getId(),
                payment.getPaymentNumber(),
                invoiceId,
                invoiceNumber,
                payment.getAmount(),
                payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : null,
                payment.getPaymentReference(),
                payment.getPaidAt(),
                invoiceTotal,
                balance,
                payment.getStatus() != null ? payment.getStatus().name() : "RECORDED"
        );
    }
}
