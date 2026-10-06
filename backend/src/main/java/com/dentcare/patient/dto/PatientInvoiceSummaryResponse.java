package com.dentcare.patient.dto;

import com.dentcare.billing.entity.Invoice;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Patient-safe invoice summary response DTO.
 * Exposes only supported billing summary fields without staff-only metadata or entity graphs.
 */
public record PatientInvoiceSummaryResponse(
        Long id,
        String invoiceNumber,
        LocalDate invoiceDate,
        BigDecimal totalAmount,
        BigDecimal paidAmount,
        BigDecimal balanceAmount,
        String status
) {
    public static PatientInvoiceSummaryResponse from(Invoice invoice) {
        if (invoice == null) {
            return null;
        }
        return new PatientInvoiceSummaryResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getTotalAmount(),
                invoice.getPaidAmount(),
                invoice.getBalanceAmount(),
                invoice.getStatus() != null ? invoice.getStatus().name() : "UNPAID"
        );
    }
}
