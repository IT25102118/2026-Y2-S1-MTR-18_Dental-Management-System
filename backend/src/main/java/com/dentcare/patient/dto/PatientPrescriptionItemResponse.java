package com.dentcare.patient.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Patient-safe prescription response DTO.
 * Excludes internal operational flags or audit metadata, exposing only safe prescription details for patient view.
 */
public record PatientPrescriptionItemResponse(
        Long id,
        String status,
        String dentistName,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime finalizedAt,
        List<PatientPrescriptionItemDetail> items
) {
    public record PatientPrescriptionItemDetail(
            Long id,
            String medicineName,
            String dosage,
            String frequency,
            String duration,
            String instructions
    ) {}
}
