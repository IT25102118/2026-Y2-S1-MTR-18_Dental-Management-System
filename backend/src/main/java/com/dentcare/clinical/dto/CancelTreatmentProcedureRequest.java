package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Inbound request payload for cancelling a treatment procedure.
 * Procedure cancellation is dentist-only and requires a reason to preserve clinical audit trail.
 */
public record CancelTreatmentProcedureRequest(
        @NotBlank(message = "Cancellation reason is required")
        @Size(max = 255, message = "Cancellation reason cannot exceed 255 characters")
        String cancellationReason
) {
    public CancelTreatmentProcedureRequest(Long cancelledByDentistId, String cancellationReason) {
        this(cancellationReason);
    }
}
