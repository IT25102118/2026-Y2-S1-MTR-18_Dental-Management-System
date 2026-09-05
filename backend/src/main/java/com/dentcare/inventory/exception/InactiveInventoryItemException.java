package com.dentcare.inventory.exception;

/**
 * Exception thrown when attempting to record an operational stock movement against an inactive inventory item.
 */
public class InactiveInventoryItemException extends RuntimeException {

    private final Long itemId;

    public InactiveInventoryItemException(Long itemId) {
        super("Cannot record stock movement for inactive inventory item id: " + itemId);
        this.itemId = itemId;
    }

    public Long getItemId() {
        return itemId;
    }
}
