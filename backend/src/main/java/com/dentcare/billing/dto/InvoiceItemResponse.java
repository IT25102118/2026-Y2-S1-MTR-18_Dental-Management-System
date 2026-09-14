package com.dentcare.billing.dto;

import com.dentcare.billing.entity.InvoiceItem;

import java.math.BigDecimal;

/**
 * Response DTO exposing an individual invoice line item.
 */
public record InvoiceItemResponse(
        Long id,
        Long treatmentProcedureId,
        String description,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
    public static InvoiceItemResponse fromEntity(InvoiceItem item) {
        if (item == null) {
            return null;
        }
        return new InvoiceItemResponse(
                item.getId(),
                item.getTreatmentProcedureId(),
                item.getDescription(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getLineTotal()
        );
    }
}
