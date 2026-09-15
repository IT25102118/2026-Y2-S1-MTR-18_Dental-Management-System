package com.dentcare.clinical.exception;

/**
 * Exception thrown when a diagnosis confirmation fails validation or is attempted on an invalid examination state.
 */
public class InvalidDiagnosisConfirmationException extends RuntimeException {

    public InvalidDiagnosisConfirmationException(String message) {
        super(message);
    }
}
