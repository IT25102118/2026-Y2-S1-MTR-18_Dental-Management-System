package com.dentcare.clinical.exception;

/**
 * Exception thrown when an examination does not belong to the expected patient,
 * enforcing patient ownership and cross-patient isolation.
 */
public class PatientMismatchException extends RuntimeException {

    private final Long examinationId;
    private final Long patientId;

    public PatientMismatchException(Long examinationId, Long patientId) {
        super("Clinical examination " + examinationId + " does not belong to patient " + patientId);
        this.examinationId = examinationId;
        this.patientId = patientId;
    }

    public Long getExaminationId() {
        return examinationId;
    }

    public Long getPatientId() {
        return patientId;
    }
}
