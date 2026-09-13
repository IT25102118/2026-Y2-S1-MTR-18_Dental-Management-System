package com.dentcare.clinical.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Inbound request payload for completing a treatment procedure.
 * Procedure completion is dentist-only.
 */
public record CompleteTreatmentProcedureRequest(
        @NotNull(message = "Performing dentist ID is required")
        Long performedByDentistId,

        Long assistedByUserId,

        LocalDate completionDate,

        @DecimalMin(value = "0.00", message = "Actual cost must be greater than or equal to zero")
        BigDecimal actualCost,

        String clinicalProgressNotes
) {
}
