package com.dentcare.inventory.exception;

/**
 * Exception thrown when attempting to reverse a stock movement that has already been reversed.
 */
public class DuplicateReversalException extends RuntimeException {

    private final Long originalMovementId;

    public DuplicateReversalException(Long originalMovementId) {
        super("Stock movement has already been reversed: ID " + originalMovementId);
        this.originalMovementId = originalMovementId;
    }

    public Long getOriginalMovementId() {
        return originalMovementId;
    }
}
