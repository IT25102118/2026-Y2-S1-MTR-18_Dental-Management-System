package com.dentcare.inventory.dto;

import com.dentcare.inventory.entity.InventoryItem;

/**
 * Response DTO representing an active item triggering a low-stock operational
 * alert.
 */
public record LowStockAlertResponse(
        Long itemId,
        String itemCode,
        String name,
        String category,
        String unit,
        Integer currentQuantity,
        Integer reorderLevel,
        Integer deficit,
        Boolean outOfStock,
        String defaultSupplierReference) {
    public static LowStockAlertResponse fromEntity(InventoryItem item) {
        // Check whether the item is null
        if (item == null) {
            return null;
        }
        // Get the current quantity
        int qty = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
        // Get the reorder level
        int reorder = item.getReorderLevel() != null ? item.getReorderLevel() : 0;
        // Calculate the deficit
        int deficit = Math.max(reorder - qty, 0);
        // Check whether the item is out of stock
        boolean outOfStock = (qty == 0);
        // Return the low-stock alert response
        return new LowStockAlertResponse(
                item.getId(),
                item.getItemCode(),
                item.getName(),
                item.getCategory(),
                item.getUnit(),
                qty,
                reorder,
                deficit,
                outOfStock,
                item.getDefaultSupplierReference());
    }
}
