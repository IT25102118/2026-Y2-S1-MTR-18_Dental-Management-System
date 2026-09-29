package com.dentcare.clinical.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Inbound request payload for setting a follow-up appointment date for a treatment plan.
 */
public record FollowUpRequest(
        @NotNull(message = "Follow-up date is required")
        LocalDate followUpDate,

        String clinicalNotes
) {
    public FollowUpRequest(LocalDate followUpDate, Long dentistId, String clinicalNotes) {
        this(followUpDate, clinicalNotes);
    }
}
