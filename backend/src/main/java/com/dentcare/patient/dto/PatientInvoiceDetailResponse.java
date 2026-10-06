package com.dentcare.patient.dto;

import com.dentcare.billing.entity.Invoice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Patient-safe invoice detail response DTO with itemized charges and payment history.
 * Excludes internal staff audit fields (e.g. createdBy, internal notes) and raw entities.
 */
public record PatientInvoiceDetailResponse(
        Long id,
        String invoiceNumber,
        LocalDate invoiceDate,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal balanceAmount,
        String status,
        String notes,
        LocalDateTime issuedAt,
        List<PatientInvoiceItemDetail> items,
        List<PatientPaymentDetail> payments
) {
    public record PatientInvoiceItemDetail(
            Long id,
            Long treatmentProcedureId,
            String description,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
    ) {}

    public record PatientPaymentDetail(
            Long id,
            String paymentNumber,
            BigDecimal amount,
            String paymentMethod,
            String paymentReference,
            LocalDateTime paidAt,
            String status
    ) {}

    public static PatientInvoiceDetailResponse from(Invoice invoice) {
        if (invoice == null) {
            return null;
        }

        List<PatientInvoiceItemDetail> itemDetails = invoice.getItems() != null
                ? invoice.getItems().stream().map(item -> new PatientInvoiceItemDetail(
                        item.getId(),
                        item.getTreatmentProcedureId(),
                        item.getDescription(),
                        item.getQuantity(),
                        item.getUnitPrice(),
                        item.getLineTotal()
                )).toList()
                : List.of();

        List<PatientPaymentDetail> paymentDetails = invoice.getPayments() != null
                ? invoice.getPayments().stream().map(payment -> new PatientPaymentDetail(
                        payment.getId(),
                        payment.getPaymentNumber(),
                        payment.getAmount(),
                        payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : null,
                        payment.getPaymentReference(),
                        payment.getPaidAt(),
                        payment.getStatus() != null ? payment.getStatus().name() : "RECORDED"
                )).toList()
                : List.of();

        return new PatientInvoiceDetailResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getSubtotal(),
                invoice.getDiscountAmount(),
                invoice.getTotalAmount(),
                invoice.getPaidAmount(),
                invoice.getBalanceAmount(),
                invoice.getStatus() != null ? invoice.getStatus().name() : "UNPAID",
                invoice.getNotes(),
                invoice.getIssuedAt(),
                itemDetails,
                paymentDetails
        );
    }
}
