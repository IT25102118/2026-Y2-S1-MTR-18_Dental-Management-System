package com.dentcare.patient.exception;

/** Requested patient record does not exist. */
public class PatientNotFoundException extends RuntimeException {
    private final Long patientId;

    public PatientNotFoundException(Long patientId) {
        super("Patient not found with id: " + patientId);
        this.patientId = patientId;
    }

    public Long getPatientId() {
        return patientId;
    }
}
