package com.dentcare.clinical.exception;

/**
 * Exception thrown when a dentist is not found or is inactive.
 */
public class DentistNotFoundException extends RuntimeException {

    private final Long dentistId;

    public DentistNotFoundException(Long dentistId) {
        super("Active dentist not found with id: " + dentistId);
        this.dentistId = dentistId;
    }

    public Long getDentistId() {
        return dentistId;
    }
}
