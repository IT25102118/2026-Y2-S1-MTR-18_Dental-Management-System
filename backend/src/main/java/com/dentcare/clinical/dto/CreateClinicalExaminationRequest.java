package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * DTO representing an incoming request to start/create a new clinical examination in DRAFT status.
 */
public record CreateClinicalExaminationRequest(
        @NotNull(message = "Patient ID is required")
        Long patientId,

        @NotNull(message = "Dentist ID is required")
        Long dentistId,

        Long appointmentId,

        @NotNull(message = "Recorded-by user ID is required")
        Long recordedByUserId,

        LocalDate examinationDate,

        @NotBlank(message = "Chief complaint is required")
        String chiefComplaint,

        String clinicalObservations,

        @Size(max = 500, message = "Provisional diagnosis cannot exceed 500 characters")
        String provisionalDiagnosis,

        LocalDate followUpDate,

        @Size(max = 500, message = "Follow-up notes cannot exceed 500 characters")
        String followUpNotes
) {
}
