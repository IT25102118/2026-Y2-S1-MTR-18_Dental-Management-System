package com.dentcare.patient.exception;

/** Conflicts with the existing unique code constraint; does not identify duplicate people. */
public class DuplicatePatientCodeException extends RuntimeException {
    private final String patientCode;

    public DuplicatePatientCodeException(String patientCode) {
        super("Patient already exists with code: " + patientCode);
        this.patientCode = patientCode;
    }

    public String getPatientCode() {
        return patientCode;
    }
}
