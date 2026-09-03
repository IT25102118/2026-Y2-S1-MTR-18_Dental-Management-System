package com.dentcare.inventory.exception;

/**
 * Exception thrown when a requested inventory batch is not found by ID.
 */
public class InventoryBatchNotFoundException extends RuntimeException {

    private final Long batchId;

    public InventoryBatchNotFoundException(Long batchId) {
        super("Inventory batch not found with ID: " + batchId);
        this.batchId = batchId;
    }

    public Long getBatchId() {
        return batchId;
    }
}
