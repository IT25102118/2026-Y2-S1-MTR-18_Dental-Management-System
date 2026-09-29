package com.dentcare.prescription.dto;

import com.dentcare.prescription.entity.Prescription;
import com.dentcare.prescription.entity.PrescriptionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Response DTO exposing full prescription details including all medicine items.
 */
public record PrescriptionResponse(
        Long id,
        Long patientId,
        String patientName,
        Long dentistId,
        String dentistName,
        PrescriptionStatus status,
        String notes,
        Long replacedByPrescriptionId,
        LocalDateTime finalizedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<PrescriptionItemResponse> items
) {
    public static PrescriptionResponse fromEntity(Prescription prescription) {
        if (prescription == null) return null;

        String patientName = prescription.getPatient() != null
                ? prescription.getPatient().getFirstName() + " " + prescription.getPatient().getLastName()
                : null;
        String dentistName = prescription.getDentist() != null
                ? prescription.getDentist().getFirstName() + " " + prescription.getDentist().getLastName()
                : null;
        Long replacedById = prescription.getReplacedByPrescription() != null
                ? prescription.getReplacedByPrescription().getId()
                : null;
        List<PrescriptionItemResponse> itemResponses = prescription.getItems() != null
                ? prescription.getItems().stream()
                        .map(PrescriptionItemResponse::fromEntity)
                        .collect(Collectors.toList())
                : List.of();

        return new PrescriptionResponse(
                prescription.getId(),
                prescription.getPatient() != null ? prescription.getPatient().getId() : null,
                patientName,
                prescription.getDentist() != null ? prescription.getDentist().getId() : null,
                dentistName,
                prescription.getStatus(),
                prescription.getNotes(),
                replacedById,
                prescription.getFinalizedAt(),
                prescription.getCreatedAt(),
                prescription.getUpdatedAt(),
                itemResponses
        );
    }
}
