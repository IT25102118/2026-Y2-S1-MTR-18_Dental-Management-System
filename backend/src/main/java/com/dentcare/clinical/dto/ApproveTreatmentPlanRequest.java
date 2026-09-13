package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Inbound request payload for approving a proposed treatment plan.
 * Treatment plan approval is dentist-only.
 */
public record ApproveTreatmentPlanRequest(
        @NotNull(message = "Approving dentist ID is required")
        Long dentistId
) {
}
