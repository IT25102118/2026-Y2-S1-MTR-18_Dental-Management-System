package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Inbound request payload for approving a proposed treatment plan.
 * Treatment plan approval is dentist-only.
 */
public record ApproveTreatmentPlanRequest() {
    public ApproveTreatmentPlanRequest(Long dentistId) {
        this();
    }
}
