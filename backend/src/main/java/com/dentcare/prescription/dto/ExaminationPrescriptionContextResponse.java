package com.dentcare.prescription.dto;

import java.time.LocalDate;

/**
 * Read-only Clinical Examination information used by
 * MF-04 Prescription Management.
 *
 * Prescription Management reads examination information
 * without modifying the Clinical module.
 */
public record ExaminationPrescriptionContextResponse(
        Long examinationId,
        Long patientRecordId,
        Long patientUserId,
        String patientName,
        LocalDate examinationDate,
        String examinationStatus,
        boolean diagnosisConfirmed,
        String clinicalContext
) {
}