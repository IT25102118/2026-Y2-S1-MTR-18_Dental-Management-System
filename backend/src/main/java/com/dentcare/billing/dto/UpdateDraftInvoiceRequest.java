package com.dentcare.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Request DTO for modifying an unfinalized DRAFT invoice.
 * Restricted to pre-issuance editable fields; payment, balance, and audit state are excluded.
 */
public class UpdateDraftInvoiceRequest {

    private Long treatmentPlanId;

    private LocalDate invoiceDate;

    @Valid
    private List<InvoiceItemRequest> items = new ArrayList<>();

    @DecimalMin(value = "0.00", message = "Discount amount must be non-negative")
    private BigDecimal discountAmount;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    public UpdateDraftInvoiceRequest() {
    }

    public UpdateDraftInvoiceRequest(List<InvoiceItemRequest> items, BigDecimal discountAmount, String notes) {
        this(null, null, items, discountAmount, notes);
    }

    public UpdateDraftInvoiceRequest(Long treatmentPlanId, LocalDate invoiceDate,
                                    List<InvoiceItemRequest> items, BigDecimal discountAmount, String notes) {
        this.treatmentPlanId = treatmentPlanId;
        this.invoiceDate = invoiceDate;
        this.items = items != null ? items : new ArrayList<>();
        this.discountAmount = discountAmount;
        this.notes = notes;
    }

    public Long getTreatmentPlanId() {
        return treatmentPlanId;
    }

    public void setTreatmentPlanId(Long treatmentPlanId) {
        this.treatmentPlanId = treatmentPlanId;
    }

    public LocalDate getInvoiceDate() {
        return invoiceDate;
    }

    public void setInvoiceDate(LocalDate invoiceDate) {
        this.invoiceDate = invoiceDate;
    }

    public List<InvoiceItemRequest> getItems() {
        return items;
    }

    public void setItems(List<InvoiceItemRequest> items) {
        this.items = items != null ? items : new ArrayList<>();
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
