package com.dentcare.billing.dto;

import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO exposing payment transaction details without sensitive credentials or entity recursion.
 */
public record PaymentResponse(
        Long id,
        Long invoiceId,
        String paymentNumber,
        BigDecimal amount,
        PaymentMethod paymentMethod,
        String paymentReference,
        LocalDateTime paidAt,
        PaymentStatus status,
        Long reversalOfPaymentId,
        String reversalReason,
        Long recordedBy,
        LocalDateTime createdAt
) {
    public static PaymentResponse fromEntity(Payment payment) {
        if (payment == null) {
            return null;
        }
        Long invoiceId = payment.getInvoice() != null ? payment.getInvoice().getId() : null;
        return new PaymentResponse(
                payment.getId(),
                invoiceId,
                payment.getPaymentNumber(),
                payment.getAmount(),
                payment.getPaymentMethod(),
                payment.getPaymentReference(),
                payment.getPaidAt(),
                payment.getStatus(),
                payment.getReversalOfPaymentId(),
                payment.getReversalReason(),
                payment.getRecordedBy(),
                payment.getCreatedAt()
        );
    }
}
