package com.dentcare.clinical.exception;

/**
 * Exception thrown when a tooth number fails FDI validation or general/tooth-specific rules.
 */
public class InvalidToothNumberException extends RuntimeException {

    public InvalidToothNumberException(String message) {
        super(message);
    }
}
