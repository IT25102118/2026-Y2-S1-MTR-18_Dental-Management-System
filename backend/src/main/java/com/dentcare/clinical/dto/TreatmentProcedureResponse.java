package com.dentcare.clinical.dto;

import com.dentcare.clinical.entity.ProcedureStatus;
import com.dentcare.clinical.entity.TreatmentProcedure;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Outbound response DTO representing a treatment procedure.
 */
public record TreatmentProcedureResponse(
        Long id,
        Long treatmentPlanId,
        Integer toothNumber,
        String procedureName,
        String procedureCode,
        Integer sequenceNumber,
        ProcedureStatus status,
        BigDecimal estimatedCost,
        BigDecimal actualCost,
        LocalDate completionDate,
        Long performedByDentistId,
        Long assistedByUserId,
        String clinicalProgressNotes,
        String cancellationReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static TreatmentProcedureResponse fromEntity(TreatmentProcedure procedure) {
        if (procedure == null) {
            return null;
        }
        return new TreatmentProcedureResponse(
                procedure.getId(),
                procedure.getTreatmentPlanId(),
                procedure.getToothNumber(),
                procedure.getProcedureName(),
                procedure.getProcedureCode(),
                procedure.getSequenceNumber(),
                procedure.getStatus(),
                procedure.getEstimatedCost(),
                procedure.getActualCost(),
                procedure.getCompletionDate(),
                procedure.getPerformedByDentistId(),
                procedure.getAssistedByUserId(),
                procedure.getClinicalProgressNotes(),
                procedure.getCancellationReason(),
                procedure.getCreatedAt(),
                procedure.getUpdatedAt()
        );
    }
}
