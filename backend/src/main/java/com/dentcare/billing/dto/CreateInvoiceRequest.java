package com.dentcare.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Request DTO for creating a new invoice.
 * Server-authoritative fields (invoiceNumber, totals, balance, status) are strictly excluded.
 */
public class CreateInvoiceRequest {

    @NotNull(message = "Patient ID is required")
    private Long patientId;

    private Long treatmentPlanId;

    private LocalDate invoiceDate;

    @Valid
    private List<InvoiceItemRequest> items = new ArrayList<>();

    @DecimalMin(value = "0.00", message = "Discount amount must be non-negative")
    @Digits(integer = 8, fraction = 2, message = "Discount amount must have at most 8 integer digits and 2 decimal places")
    private BigDecimal discountAmount;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;

    public CreateInvoiceRequest() {
    }

    public CreateInvoiceRequest(Long patientId) {
        this.patientId = patientId;
    }

    public CreateInvoiceRequest(Long patientId, List<InvoiceItemRequest> items) {
        this.patientId = patientId;
        this.items = items != null ? items : new ArrayList<>();
    }

    public CreateInvoiceRequest(Long patientId, Long treatmentPlanId, LocalDate invoiceDate,
                                List<InvoiceItemRequest> items, BigDecimal discountAmount, String notes) {
        this.patientId = patientId;
        this.treatmentPlanId = treatmentPlanId;
        this.invoiceDate = invoiceDate;
        this.items = items != null ? items : new ArrayList<>();
        this.discountAmount = discountAmount;
        this.notes = notes;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
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
