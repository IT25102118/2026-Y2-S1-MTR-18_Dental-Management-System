package com.dentcare.inventory.exception;

/**
 * Exception thrown when a stock movement request contains structurally invalid or inconsistent movement parameters.
 */
public class InvalidMovementException extends RuntimeException {

    public InvalidMovementException(String message) {
        super(message);
    }
}
