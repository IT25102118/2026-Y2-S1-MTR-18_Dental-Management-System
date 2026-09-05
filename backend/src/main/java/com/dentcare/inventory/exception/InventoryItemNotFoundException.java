package com.dentcare.inventory.exception;

/**
 * Exception thrown when an inventory item cannot be found by its identifier or code.
 */
public class InventoryItemNotFoundException extends RuntimeException {

    private final Long itemId;

    public InventoryItemNotFoundException(Long itemId) {
        super("Inventory item not found with id: " + itemId);
        this.itemId = itemId;
    }

    public InventoryItemNotFoundException(String message) {
        super(message);
        this.itemId = null;
    }

    public Long getItemId() {
        return itemId;
    }
}
