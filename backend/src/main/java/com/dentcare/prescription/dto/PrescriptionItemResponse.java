package com.dentcare.prescription.dto;

import com.dentcare.prescription.entity.PrescriptionItem;

/**
 * Response DTO for a single prescription medicine item.
 */
public record PrescriptionItemResponse(
        Long id,
        String medicineName,
        String strength,
        String dosage,
        String frequency,
        String duration,
        Integer quantity,
        String instructions
) {
    public static PrescriptionItemResponse fromEntity(PrescriptionItem item) {
        if (item == null) return null;
        return new PrescriptionItemResponse(
                item.getId(),
                item.getMedicineName(),
                item.getStrength(),
                item.getDosage(),
                item.getFrequency(),
                item.getDuration(),
                item.getQuantity(),
                item.getInstructions()
        );
    }
}
