package com.dentcare.clinical.exception;

/**
 * Exception thrown when a clinical examination cannot be found.
 */
public class ClinicalExaminationNotFoundException extends RuntimeException {

    private final Long examinationId;

    public ClinicalExaminationNotFoundException(Long examinationId) {
        super("Clinical examination not found with id: " + examinationId);
        this.examinationId = examinationId;
    }

    public Long getExaminationId() {
        return examinationId;
    }
}
