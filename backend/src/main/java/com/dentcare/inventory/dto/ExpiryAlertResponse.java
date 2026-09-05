package com.dentcare.inventory.dto;

import com.dentcare.inventory.entity.InventoryBatch;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Response DTO representing an operational expiry alert for an inventory batch with positive stock.
 */
public record ExpiryAlertResponse(
        Long batchId,
        Long itemId,
        String itemCode,
        String itemName,
        String category,
        String unit,
        String batchNumber,
        Integer quantityOnHand,
        LocalDate expiryDate,
        String status,
        Long daysRemaining,
        String supplierReference
) {
    public static ExpiryAlertResponse fromEntity(InventoryBatch batch, LocalDate today) {
        if (batch == null) {
            return null;
        }
        Long itemId = null;
        String itemCode = null;
        String itemName = null;
        String category = null;
        String unit = null;
        if (batch.getInventoryItem() != null) {
            itemId = batch.getInventoryItem().getId();
            itemCode = batch.getInventoryItem().getItemCode();
            itemName = batch.getInventoryItem().getName();
            category = batch.getInventoryItem().getCategory();
            unit = batch.getInventoryItem().getUnit();
        }

        LocalDate exp = batch.getExpiryDate();
        String status = (exp != null && exp.isBefore(today)) ? "EXPIRED" : "EXPIRING";
        Long daysRemaining = exp != null ? ChronoUnit.DAYS.between(today, exp) : null;

        return new ExpiryAlertResponse(
                batch.getId(),
                itemId,
                itemCode,
                itemName,
                category,
                unit,
                batch.getBatchNumber(),
                batch.getQuantityOnHand(),
                exp,
                status,
                daysRemaining,
                batch.getSupplierReference()
        );
    }
}
