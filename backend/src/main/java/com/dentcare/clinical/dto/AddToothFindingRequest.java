package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO representing an incoming request to record a tooth or general oral finding in an examination.
 */
public record AddToothFindingRequest(
        Integer toothNumber,

        boolean isGeneral,

        @NotBlank(message = "Condition name is required")
        @Size(max = 150, message = "Condition name cannot exceed 150 characters")
        String conditionName,

        @Size(max = 500, message = "Notes cannot exceed 500 characters")
        String notes,

        @NotNull(message = "Recorded-by user ID is required")
        Long recordedByUserId
) {
}
