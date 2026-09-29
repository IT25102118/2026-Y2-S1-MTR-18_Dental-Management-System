package com.dentcare.clinical.integration;

/**
 * Minimal integration port for verifying dentist existence and active account status.
 * Decouples the MF-03 clinical domain from the concrete dentist provider storage model.
 */
public interface DentistLookupPort {

    /**
     * Verifies that a referenced dentist exists, is active, and possesses the DENTIST role.
     *
     * @param dentistId the user ID of the dentist
     * @return true if the dentist exists, is active, and has the DENTIST role; false otherwise
     */
    boolean existsActiveDentist(Long dentistId);
}
