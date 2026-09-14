package com.dentcare.billing.dto;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Response DTO exposing comprehensive invoice details with nested items and payments,
 * avoiding recursive JPA entity references.
 */
public record InvoiceResponse(
        Long id,
        String invoiceNumber,
        Long patientId,
        Long treatmentPlanId,
        LocalDate invoiceDate,
        List<InvoiceItemResponse> items,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal balanceAmount,
        InvoiceStatus status,
        String notes,
        LocalDateTime issuedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Long createdBy,
        List<PaymentResponse> payments
) {
    public InvoiceResponse(
            Long id,
            String invoiceNumber,
            Long patientId,
            Long treatmentPlanId,
            LocalDate invoiceDate,
            List<InvoiceItemResponse> items,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            InvoiceStatus status,
            String notes,
            LocalDateTime issuedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            Long createdBy
    ) {
        this(id, invoiceNumber, patientId, treatmentPlanId, invoiceDate, items,
                subtotal, discountAmount, totalAmount, paidAmount, balanceAmount,
                status, notes, issuedAt, createdAt, updatedAt, createdBy, Collections.emptyList());
    }

    public static InvoiceResponse fromEntity(Invoice invoice) {
        if (invoice == null) {
            return null;
        }

        List<InvoiceItemResponse> itemResponses = invoice.getItems() != null
                ? invoice.getItems().stream().map(InvoiceItemResponse::fromEntity).toList()
                : Collections.emptyList();

        List<PaymentResponse> paymentResponses = invoice.getPayments() != null
                ? invoice.getPayments().stream().map(PaymentResponse::fromEntity).toList()
                : Collections.emptyList();

        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getPatientId(),
                invoice.getTreatmentPlanId(),
                invoice.getInvoiceDate(),
                itemResponses,
                invoice.getSubtotal(),
                invoice.getDiscountAmount(),
                invoice.getTotalAmount(),
                invoice.getPaidAmount(),
                invoice.getBalanceAmount(),
                invoice.getStatus(),
                invoice.getNotes(),
                invoice.getIssuedAt(),
                invoice.getCreatedAt(),
                invoice.getUpdatedAt(),
                invoice.getCreatedBy(),
                paymentResponses
        );
    }
}
