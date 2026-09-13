package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Inbound request payload for setting a follow-up appointment date for a treatment plan.
 */
public record FollowUpRequest(
        @NotNull(message = "Follow-up date is required")
        LocalDate followUpDate,

        @NotNull(message = "Dentist ID is required")
        Long dentistId,

        String clinicalNotes
) {
}
