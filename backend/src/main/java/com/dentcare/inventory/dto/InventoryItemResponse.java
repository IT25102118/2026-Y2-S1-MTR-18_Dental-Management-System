package com.dentcare.inventory.dto;

import com.dentcare.inventory.entity.InventoryItem;

import java.time.LocalDateTime;

/**
 * Response DTO exposing inventory catalog item information.
 */
public record InventoryItemResponse(
        Long id,
        String itemCode,
        String name,
        String category,
        String unit,
        Integer reorderLevel,
        Integer currentQuantity,
        boolean active,
        String defaultSupplierReference,
        boolean lowStock,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    // fromEntity() method
    public static InventoryItemResponse fromEntity(InventoryItem item) {
        // Check whether the item is null
        if (item == null) {
            return null;
        }
        // Get current quantity
        int currentQty = (item.getCurrentQuantity() != null) ? item.getCurrentQuantity() : 0;
        // Get reorder level
        int reorderLvl = (item.getReorderLevel() != null) ? item.getReorderLevel() : 0;
        return new InventoryItemResponse(
                item.getId(),
                item.getItemCode(),
                item.getName(),
                item.getCategory(),
                item.getUnit(),
                reorderLvl,
                currentQty,
                item.isActive(),
                item.getDefaultSupplierReference(),
                // Low-stock calculation
                currentQty <= reorderLvl,
                item.getCreatedAt(),
                item.getUpdatedAt());
    }
}
