package com.dentcare.inventory.dto;

/**
 * Filter criteria for stock level status in inventory catalog queries.
 */
public enum StockStatusFilter {
    ALL,
    IN_STOCK,
    LOW_STOCK,
    OUT_OF_STOCK
}
