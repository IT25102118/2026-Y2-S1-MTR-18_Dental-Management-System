package com.dentcare.prescription.dto;

import com.dentcare.prescription.entity.Prescription;
import com.dentcare.prescription.entity.PrescriptionStatus;

import java.time.LocalDateTime;

/**
 * Lightweight summary DTO for listing prescriptions without item details.
 */
public record PrescriptionSummaryResponse(
        Long id,
        Long patientId,
        String patientName,
        Long dentistId,
        String dentistName,
        PrescriptionStatus status,
        int itemCount,
        LocalDateTime finalizedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static PrescriptionSummaryResponse fromEntity(Prescription prescription) {
        if (prescription == null) return null;

        String patientName = prescription.getPatient() != null
                ? prescription.getPatient().getFirstName() + " " + prescription.getPatient().getLastName()
                : null;
        String dentistName = prescription.getDentist() != null
                ? prescription.getDentist().getFirstName() + " " + prescription.getDentist().getLastName()
                : null;
        int itemCount = prescription.getItems() != null ? prescription.getItems().size() : 0;

        return new PrescriptionSummaryResponse(
                prescription.getId(),
                prescription.getPatient() != null ? prescription.getPatient().getId() : null,
                patientName,
                prescription.getDentist() != null ? prescription.getDentist().getId() : null,
                dentistName,
                prescription.getStatus(),
                itemCount,
                prescription.getFinalizedAt(),
                prescription.getCreatedAt(),
                prescription.getUpdatedAt()
        );
    }
}
