package com.dentcare.clinical.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Inbound request payload for adding an individual procedure to a treatment plan.
 */
public record AddTreatmentProcedureRequest(
        Integer toothNumber,

        @NotBlank(message = "Procedure name is required")
        @Size(max = 150, message = "Procedure name cannot exceed 150 characters")
        String procedureName,

        @Size(max = 50, message = "Procedure code cannot exceed 50 characters")
        String procedureCode,

        @Min(value = 1, message = "Sequence number must be at least 1")
        Integer sequenceNumber,

        @DecimalMin(value = "0.00", message = "Estimated cost must be greater than or equal to zero")
        BigDecimal estimatedCost,

        @Min(value = 1, message = "Quantity must be greater than zero")
        Integer quantity,

        @DecimalMin(value = "0.00", message = "Unit cost must be greater than or equal to zero")
        BigDecimal unitCost,

        String clinicalProgressNotes
) {
    public AddTreatmentProcedureRequest(Integer toothNumber, String procedureName, String procedureCode,
                                        Integer sequenceNumber, BigDecimal estimatedCost, String clinicalProgressNotes) {
        this(toothNumber, procedureName, procedureCode, sequenceNumber, estimatedCost, null, null, clinicalProgressNotes);
    }
}
