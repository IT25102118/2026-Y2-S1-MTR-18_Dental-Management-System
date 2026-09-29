package com.dentcare.clinical.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Inbound request payload for modifying a proposed treatment plan.
 */
public record UpdateTreatmentPlanRequest(
        @Size(max = 150, message = "Plan name cannot exceed 150 characters")
        String planName,

        @DecimalMin(value = "0.00", message = "Total estimated cost must be greater than or equal to zero")
        BigDecimal totalEstimatedCost,

        String clinicalNotes
) {
}
