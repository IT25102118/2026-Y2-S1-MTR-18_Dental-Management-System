package com.dentcare.appointment.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateAppointmentRequest(
        @NotNull(message = "Appointment date is required")
        @FutureOrPresent(message = "Appointment date cannot be earlier than today")
        LocalDate appointmentDate,

        @Pattern(
                regexp = "^$|^\\s*$|^([01]\\d|2[0-3]):[0-5]\\d$",
                message = "Preferred time must be in HH:mm 24-hour format (e.g. 09:30, 14:00)"
        )
        @Size(max = 30, message = "Preferred time cannot exceed 30 characters")
        String preferredTime,

        @NotBlank(message = "Reason for visit is required")
        @Size(max = 255, message = "Reason cannot exceed 255 characters")
        String reason,

        @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
        String notes,

        Boolean smsConsent
) {}
