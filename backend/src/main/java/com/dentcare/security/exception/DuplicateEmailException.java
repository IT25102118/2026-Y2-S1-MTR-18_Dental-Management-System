package com.dentcare.security.exception;

/**
 * Exception thrown when an account registration is attempted with an email address
 * that already exists in the system.
 */
public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String message) {
        super(message);
    }
}
