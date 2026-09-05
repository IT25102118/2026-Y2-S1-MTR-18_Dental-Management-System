package com.dentcare.inventory.exception;

/**
 * Exception thrown when a stock-out or decrease movement exceeds available item inventory.
 */
public class InsufficientStockException extends RuntimeException {

    private final Long itemId;
    private final int requested;
    private final int available;

    public InsufficientStockException(Long itemId, int requested, int available) {
        super(String.format("Insufficient stock for item id %d: requested %d, available %d", itemId, requested, available));
        this.itemId = itemId;
        this.requested = requested;
        this.available = available;
    }

    public Long getItemId() {
        return itemId;
    }

    public int getRequested() {
        return requested;
    }

    public int getAvailable() {
        return available;
    }
}
