package com.dentcare.clinical.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Inbound request payload for modifying a planned treatment procedure.
 */
public record UpdateTreatmentProcedureRequest(
        Integer toothNumber,

        @Size(max = 150, message = "Procedure name cannot exceed 150 characters")
        String procedureName,

        @Size(max = 50, message = "Procedure code cannot exceed 50 characters")
        String procedureCode,

        @Min(value = 1, message = "Sequence number must be at least 1")
        Integer sequenceNumber,

        @DecimalMin(value = "0.00", message = "Estimated cost must be greater than or equal to zero")
        BigDecimal estimatedCost,

        String clinicalProgressNotes
) {
}
