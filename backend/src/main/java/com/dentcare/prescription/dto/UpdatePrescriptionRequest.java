package com.dentcare.prescription.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for updating a DRAFT prescription's notes and/or items.
 * Only applicable while status is DRAFT.
 */
public class UpdatePrescriptionRequest {

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;

    @Valid
    private List<PrescriptionItemRequest> items;

    public UpdatePrescriptionRequest() {
    }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<PrescriptionItemRequest> getItems() { return items; }
    public void setItems(List<PrescriptionItemRequest> items) { this.items = items; }
}
