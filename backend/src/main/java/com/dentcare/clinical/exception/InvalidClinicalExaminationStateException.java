package com.dentcare.clinical.exception;

/**
 * Exception thrown when an illegal status transition or modification of an examination is attempted.
 */
public class InvalidClinicalExaminationStateException extends RuntimeException {

    public InvalidClinicalExaminationStateException(String message) {
        super(message);
    }
}
