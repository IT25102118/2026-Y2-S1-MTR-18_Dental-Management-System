package com.dentcare.clinical.dto;

import com.dentcare.clinical.entity.TreatmentPlan;
import com.dentcare.clinical.entity.TreatmentPlanStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Outbound response DTO representing a treatment plan.
 */
public record TreatmentPlanResponse(
        Long id,
        Long patientId,
        Long dentistId,
        Long examinationId,
        Long createdByUserId,
        String planName,
        TreatmentPlanStatus status,
        BigDecimal totalEstimatedCost,
        BigDecimal totalActualCost,
        Long approvedByDentistId,
        LocalDateTime approvedAt,
        LocalDateTime completedAt,
        String cancellationReason,
        String clinicalNotes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        Long version
) {
    public static TreatmentPlanResponse fromEntity(TreatmentPlan plan) {
        if (plan == null) {
            return null;
        }
        return new TreatmentPlanResponse(
                plan.getId(),
                plan.getPatientId(),
                plan.getDentistId(),
                plan.getExaminationId(),
                plan.getCreatedByUserId(),
                plan.getPlanName(),
                plan.getStatus(),
                plan.getTotalEstimatedCost(),
                plan.getTotalActualCost(),
                plan.getApprovedByDentistId(),
                plan.getApprovedAt(),
                plan.getCompletedAt(),
                plan.getCancellationReason(),
                plan.getClinicalNotes(),
                plan.getCreatedAt(),
                plan.getUpdatedAt(),
                plan.getVersion()
        );
    }
}
