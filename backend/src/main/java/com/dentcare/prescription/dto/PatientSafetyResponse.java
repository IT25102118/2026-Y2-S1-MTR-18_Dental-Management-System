package com.dentcare.prescription.dto;

/**
 * Read-only patient safety information used by
 * MF-04 Prescription Management.
 */
public record PatientSafetyResponse(
        Long userId,
        String patientName,
        String allergies,
        boolean medicalProfileAvailable,
        boolean hasRecordedAllergies
) {
}