package com.dentcare.clinical.exception;

/**
 * Exception thrown when a patient is not found or is inactive.
 */
public class PatientNotFoundException extends RuntimeException {

    private final Long patientId;

    public PatientNotFoundException(Long patientId) {
        super("Active patient not found with id: " + patientId);
        this.patientId = patientId;
    }

    public Long getPatientId() {
        return patientId;
    }
}
