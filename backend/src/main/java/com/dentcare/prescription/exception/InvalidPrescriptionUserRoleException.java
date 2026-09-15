package com.dentcare.prescription.exception;

/**
 * Exception thrown when a user role constraint is violated during prescription operations.
 * Examples: a non-PATIENT referenced as patient, a non-DENTIST attempting finalization.
 */
public class InvalidPrescriptionUserRoleException extends RuntimeException {

    public InvalidPrescriptionUserRoleException(String message) {
        super(message);
    }
}
