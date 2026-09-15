package com.dentcare.clinical.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Inbound request payload for proposing a new treatment plan.
 */
public record CreateTreatmentPlanRequest(
        @NotNull(message = "Patient ID is required")
        Long patientId,

        @NotNull(message = "Dentist ID is required")
        Long dentistId,

        Long examinationId,

        @NotNull(message = "Created-by user ID is required")
        Long createdByUserId,

        @NotBlank(message = "Plan name is required")
        @Size(max = 150, message = "Plan name cannot exceed 150 characters")
        String planName,

        @DecimalMin(value = "0.00", message = "Total estimated cost must be greater than or equal to zero")
        BigDecimal totalEstimatedCost,

        String clinicalNotes
) {
    public CreateTreatmentPlanRequest {
        if (totalEstimatedCost == null) {
            totalEstimatedCost = BigDecimal.ZERO;
        }
    }
}
