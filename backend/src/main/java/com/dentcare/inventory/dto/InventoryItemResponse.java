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
        LocalDateTime updatedAt
) {
    public static InventoryItemResponse fromEntity(InventoryItem item) {
        if (item == null) {
            return null;
        }
        int currentQty = (item.getCurrentQuantity() != null) ? item.getCurrentQuantity() : 0;
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
                currentQty <= reorderLvl,
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
