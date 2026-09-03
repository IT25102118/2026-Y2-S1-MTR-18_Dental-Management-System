package com.dentcare.inventory.exception;

/**
 * Exception thrown when attempting to register an inventory item with an existing item code.
 */
public class DuplicateItemCodeException extends RuntimeException {

    private final String itemCode;

    public DuplicateItemCodeException(String itemCode) {
        super("Inventory item already exists with code: " + itemCode);
        this.itemCode = itemCode;
    }

    public String getItemCode() {
        return itemCode;
    }
}
