package com.dentcare.appointment.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Safe, patient-facing response DTO for appointment requests.
 */
public record PatientAppointmentResponse(
        Long id,
        LocalDate appointmentDate,
        String preferredTime,
        String reason,
        String notes,
        String status,
        String statusDescription,
        String dentistName,
        LocalDateTime createdAt
) {}
