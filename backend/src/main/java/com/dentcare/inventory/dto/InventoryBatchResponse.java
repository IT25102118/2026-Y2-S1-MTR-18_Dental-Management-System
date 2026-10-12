// Send inventory batch allocation information to the frontend
package com.dentcare.inventory.dto;

import com.dentcare.inventory.entity.InventoryBatch;

import java.time.LocalDate;

/**
 * Response DTO representing an inventory batch allocation.
 */
public record InventoryBatchResponse(
        Long id,
        Long inventoryItemId,
        String itemCode,
        String itemName,
        String batchNumber,
        LocalDate expiryDate,
        Integer quantityOnHand,
        LocalDate receivedDate,
        String supplierReference) {
    public static InventoryBatchResponse fromEntity(InventoryBatch batch) {
        // Check whether the batch is null
        if (batch == null) {
            return null;
        }
        Long itemId = null;
        String itemCode = null;
        String itemName = null;
        // Get inventory item information
        if (batch.getInventoryItem() != null) {
            itemId = batch.getInventoryItem().getId();
            itemCode = batch.getInventoryItem().getItemCode();
            itemName = batch.getInventoryItem().getName();
        }
        return new InventoryBatchResponse(
                batch.getId(),
                itemId,
                itemCode,
                itemName,
                batch.getBatchNumber(),
                batch.getExpiryDate(),
                batch.getQuantityOnHand(),
                batch.getReceivedDate(),
                batch.getSupplierReference());
    }
}
