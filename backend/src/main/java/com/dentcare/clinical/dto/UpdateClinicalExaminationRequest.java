package com.dentcare.clinical.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * DTO representing an incoming request to update a draft clinical examination.
 */
public record UpdateClinicalExaminationRequest(
        LocalDate examinationDate,

        String chiefComplaint,

        String clinicalObservations,

        @Size(max = 500, message = "Provisional diagnosis cannot exceed 500 characters")
        String provisionalDiagnosis,

        LocalDate followUpDate,

        @Size(max = 500, message = "Follow-up notes cannot exceed 500 characters")
        String followUpNotes
) {
}
