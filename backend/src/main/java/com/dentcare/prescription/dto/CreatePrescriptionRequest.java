package com.dentcare.prescription.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request DTO for creating a new DRAFT prescription.
 */
public class CreatePrescriptionRequest {

    @NotNull(message = "Patient ID is required")
    private Long patientId;

    @NotNull(message = "Dentist ID is required")
    private Long dentistId;

    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String notes;

    @Valid
    private List<PrescriptionItemRequest> items;

    public CreatePrescriptionRequest() {
    }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public Long getDentistId() { return dentistId; }
    public void setDentistId(Long dentistId) { this.dentistId = dentistId; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<PrescriptionItemRequest> getItems() { return items; }
    public void setItems(List<PrescriptionItemRequest> items) { this.items = items; }
}
