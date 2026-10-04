package com.dentcare.clinical.integration;

import com.dentcare.clinical.dto.PatientMedicalSummaryDto;

import java.util.Optional;

/**
 * Minimal integration port for verifying patient existence and active account status,
 * and retrieving patient clinical/medical summaries (FR-CLN-02).
 * Decouples the MF-03 clinical domain from the concrete patient storage model.
 */
public interface PatientLookupPort {

    /**
     * Verifies that a referenced patient exists, is active, and possesses the PATIENT role.
     *
     * @param patientId the ID of the patient
     * @return true if the patient exists, is active, and has the PATIENT role; false otherwise
     */
    boolean existsActivePatient(Long patientId);

    /**
     * Retrieves the patient's medical and dental history summary.
     *
     * @param patientId the ID of the patient
     * @return Optional containing the clinical summary if patient exists, or Optional.empty()
     */
    Optional<PatientMedicalSummaryDto> getPatientMedicalSummary(Long patientId);
}

