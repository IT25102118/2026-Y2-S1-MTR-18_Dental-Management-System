package com.dentcare.inventory.exception;

/**
 * Exception thrown when a requested stock movement is not found by ID.
 */
public class StockMovementNotFoundException extends RuntimeException {

    private final Long movementId;

    public StockMovementNotFoundException(Long movementId) {
        super("Stock movement not found with ID: " + movementId);
        this.movementId = movementId;
    }

    public Long getMovementId() {
        return movementId;
    }
}
