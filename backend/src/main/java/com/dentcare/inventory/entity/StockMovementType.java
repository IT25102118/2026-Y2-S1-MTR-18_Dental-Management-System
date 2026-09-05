package com.dentcare.inventory.entity;

/**
 * Represents the strictly allowed types of stock movements in DentCare.
 */
public enum StockMovementType {
    RECEIVED,
    USED,
    DAMAGED,
    ADJUSTED,
    EXPIRED
}
