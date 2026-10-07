package com.dentcare.clinical.dto;

/**
 * Decoupled clinical summary exposing patient medical and dental history
 * needed during clinical examinations (FR-CLN-02).
 * Excludes internal optimistic locking version, authentication credentials, and account linkages.
 */
public record PatientMedicalSummaryDto(
        Long patientId,
        String allergies,
        String medicalConditions,
        String currentMedications,
        String dentalHistory,
        String notes
) {
}
