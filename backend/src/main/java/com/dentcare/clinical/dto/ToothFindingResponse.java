package com.dentcare.clinical.dto;

import com.dentcare.clinical.entity.ToothFinding;

import java.time.LocalDateTime;

/**
 * Response DTO exposing tooth or general oral finding details.
 */
public record ToothFindingResponse(
        Long id,
        Long examinationId,
        Integer toothNumber,
        boolean isGeneral,
        String conditionName,
        String notes,
        Long recordedByUserId,
        LocalDateTime createdAt
) {
    public static ToothFindingResponse fromEntity(ToothFinding entity) {
        if (entity == null) {
            return null;
        }
        return new ToothFindingResponse(
                entity.getId(),
                entity.getExaminationId(),
                entity.getToothNumber(),
                entity.isGeneral(),
                entity.getConditionName(),
                entity.getNotes(),
                entity.getRecordedByUserId(),
                entity.getCreatedAt()
        );
    }
}
