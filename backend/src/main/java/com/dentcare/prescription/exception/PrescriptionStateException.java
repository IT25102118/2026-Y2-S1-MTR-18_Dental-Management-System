package com.dentcare.prescription.exception;

/**
 * Exception thrown when a prescription lifecycle operation is not permitted given the current status.
 * Examples: editing a FINALIZED prescription, finalizing an empty prescription.
 */
public class PrescriptionStateException extends RuntimeException {

    public PrescriptionStateException(String message) {
        super(message);
    }
}
