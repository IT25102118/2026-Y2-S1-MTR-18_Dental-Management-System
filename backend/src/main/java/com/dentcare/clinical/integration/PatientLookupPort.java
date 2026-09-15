package com.dentcare.clinical.integration;

/**
 * Minimal integration port for verifying patient existence and active account status.
 * Decouples the MF-03 clinical domain from the concrete patient storage model.
 */
public interface PatientLookupPort {

    /**
     * Verifies that a referenced patient exists, is active, and possesses the PATIENT role.
     *
     * @param patientId the user ID of the patient
     * @return true if the patient exists, is active, and has the PATIENT role; false otherwise
     */
    boolean existsActivePatient(Long patientId);
}
