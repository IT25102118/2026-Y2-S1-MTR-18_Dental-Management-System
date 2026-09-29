package com.dentcare.clinical.exception;

/**
 * Exception thrown when an operation cannot be performed due to an invalid treatment plan state or lifecycle transition.
 */
public class InvalidTreatmentPlanStateException extends RuntimeException {

    public InvalidTreatmentPlanStateException(String message) {
        super(message);
    }
}
