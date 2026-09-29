package com.dentcare.clinical.exception;

/**
 * Exception thrown when a treatment plan cannot be located by its identifier.
 */
public class TreatmentPlanNotFoundException extends RuntimeException {

    public TreatmentPlanNotFoundException(Long id) {
        super("Treatment plan not found with id: " + id);
    }

    public TreatmentPlanNotFoundException(String message) {
        super(message);
    }
}
