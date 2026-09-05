package com.dentcare.inventory.dto;

import com.dentcare.inventory.entity.InventoryItem;

/**
 * Response DTO representing an active item triggering a low-stock operational alert.
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
        String defaultSupplierReference
) {
    public static LowStockAlertResponse fromEntity(InventoryItem item) {
        if (item == null) {
            return null;
        }
        int qty = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
        int reorder = item.getReorderLevel() != null ? item.getReorderLevel() : 0;
        int deficit = Math.max(reorder - qty, 0);
        boolean outOfStock = (qty == 0);

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
                item.getDefaultSupplierReference()
        );
    }
}
