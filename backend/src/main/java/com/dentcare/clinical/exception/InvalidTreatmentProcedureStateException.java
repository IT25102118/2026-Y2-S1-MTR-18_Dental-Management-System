package com.dentcare.clinical.exception;

/**
 * Exception thrown when an operation cannot be performed due to an invalid treatment procedure state or lifecycle transition.
 */
public class InvalidTreatmentProcedureStateException extends RuntimeException {

    public InvalidTreatmentProcedureStateException(String message) {
        super(message);
    }
}
