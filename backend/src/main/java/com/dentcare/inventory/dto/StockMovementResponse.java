package com.dentcare.inventory.dto;

import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.StockMovement;
import com.dentcare.inventory.entity.StockMovementType;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO representing an auditable stock movement record.
 */
public record StockMovementResponse(
        Long id,
        Long inventoryItemId,
        String itemCode,
        String itemName,
        StockMovementType movementType,
        AdjustmentDirection adjustmentDirection,
        Integer quantity,
        Integer quantityDelta,
        Integer resultingQuantity,
        LocalDateTime occurredAt,
        String reason,
        Long responsibleUserId,
        Long reversalOfMovementId,
        Long treatmentProcedureId,
        String batchNumber,
        LocalDate expiryDate
) {
    public static StockMovementResponse fromEntity(StockMovement movement, Integer resultingQuantity) {
        if (movement == null) {
            return null;
        }
        Long itemId = null;
        String itemCode = null;
        String itemName = null;
        if (movement.getInventoryItem() != null) {
            itemId = movement.getInventoryItem().getId();
            itemCode = movement.getInventoryItem().getItemCode();
            itemName = movement.getInventoryItem().getName();
        }
        return new StockMovementResponse(
                movement.getId(),
                itemId,
                itemCode,
                itemName,
                movement.getMovementType(),
                movement.getAdjustmentDirection(),
                movement.getQuantity(),
                movement.getQuantityDelta(),
                resultingQuantity,
                movement.getOccurredAt(),
                movement.getReason(),
                movement.getResponsibleUserId(),
                movement.getReversalOfMovementId(),
                movement.getTreatmentProcedureId(),
                movement.getBatchNumber(),
                movement.getExpiryDate()
        );
    }
}
