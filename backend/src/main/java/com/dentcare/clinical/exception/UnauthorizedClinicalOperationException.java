package com.dentcare.clinical.exception;

/**
 * Exception thrown when a user attempts a clinical operation outside their authorized role
 * (e.g., Dental Assistant attempting diagnosis confirmation, completion, or cancellation).
 */
public class UnauthorizedClinicalOperationException extends RuntimeException {

    public UnauthorizedClinicalOperationException(String message) {
        super(message);
    }
}
