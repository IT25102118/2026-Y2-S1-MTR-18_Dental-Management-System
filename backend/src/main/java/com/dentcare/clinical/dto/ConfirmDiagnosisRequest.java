package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO representing an incoming request from a licensed dentist to authoritatively confirm a clinical diagnosis.
 */
public record ConfirmDiagnosisRequest(
        @NotBlank(message = "Confirmed diagnosis is required")
        @Size(max = 500, message = "Confirmed diagnosis cannot exceed 500 characters")
        String confirmedDiagnosis
) {
    public ConfirmDiagnosisRequest(Long dentistId, String confirmedDiagnosis) {
        this(confirmedDiagnosis);
    }
}
